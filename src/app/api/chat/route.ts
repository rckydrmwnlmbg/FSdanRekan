import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/security/origin'
import { limitByIp } from '@/lib/security/ratelimit'
import { escapeHtml } from '@/lib/security/sanitize'
import { GuidedChatSchema } from '@/lib/validation/chat'
import { DEFAULT_SITE_SETTINGS } from '@/lib/content'
import { waLink } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const MAX_CHAT_BODY_BYTES = 16 * 1024 // 16 KB limit (SEC-006)

export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!(await limitByIp(ip))) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.' },
        { status: 429 },
      )
    }

    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Format permintaan tidak didukung.' }, { status: 415 })
    }

    const rawText = await req.text()
    if (Buffer.byteLength(rawText, 'utf8') > MAX_CHAT_BODY_BYTES) {
      return NextResponse.json({ error: 'Ukuran data melebihi batas.' }, { status: 413 })
    }

    let rawJson: unknown
    try {
      rawJson = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    const parsed = GuidedChatSchema.safeParse(rawJson)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    // SEC-008 & SK-11: Generate 128-bit cryptographic session ID
    const sessionToken = crypto.randomBytes(16).toString('hex')
    const safeName = escapeHtml(parsed.data.visitorName)
    const safeArea = escapeHtml(parsed.data.practiceArea)
    const safeSchedule = escapeHtml(parsed.data.preferredSchedule)
    const safeNotes = parsed.data.notes ? escapeHtml(parsed.data.notes) : '-'

    const waMessage = [
      `Halo FS dan Rekan, saya ingin menjadwalkan konsultasi hukum melalui Asisten Pemandu Website.`,
      `• Nama: ${parsed.data.visitorName}`,
      `• Bidang Hukum: ${parsed.data.practiceArea}`,
      `• Waktu Pilihan: ${parsed.data.preferredSchedule}`,
      parsed.data.notes ? `• Catatan Awal: ${parsed.data.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const redirectWaUrl = waLink(DEFAULT_SITE_SETTINGS.whatsappNumber, waMessage)

    // SEC-012 & SEC-014: Log session event with session ID only (no PII)
    logger.info({ sessionToken }, 'Guided chat session completed')

    const res = NextResponse.json(
      {
        ok: true,
        sessionToken,
        summary: {
          visitorName: safeName,
          practiceArea: safeArea,
          preferredSchedule: safeSchedule,
          notes: safeNotes,
        },
        waUrl: redirectWaUrl,
      },
      { status: 201 },
    )

    // SK-11 & SEC-008: Store 128-bit random session ID in HttpOnly cookie
    res.cookies.set('fs_chat_sid', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours
    })

    return res
  } catch (e) {
    if (e instanceof Response) {
      return e
    }
    logger.error(
      { errName: e instanceof Error ? e.name : 'ChatError' },
      'Guided chat submission failed',
    )
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server. Silakan lanjut lewat tombol WhatsApp.' },
      { status: 500 },
    )
  }
}
