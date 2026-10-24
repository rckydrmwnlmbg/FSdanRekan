import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/lib/security/origin'
import { limitByIp } from '@/lib/security/ratelimit'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { createInquiry } from '@/lib/inquiries'
import { InquiryBodySchema } from '@/lib/validation/inquiry'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 100 * 1024 // 100 KB limit (SEC-006)

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
    if (Buffer.byteLength(rawText, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Ukuran data melebihi batas.' }, { status: 413 })
    }

    let rawJson: unknown
    try {
      rawJson = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    const parsed = InquiryBodySchema.safeParse(rawJson)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    // Honeypot check (FR-7.3): silently accept or reject if filled by bot
    if (parsed.data.website && parsed.data.website.length > 0) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verifikasi keamanan gagal.' }, { status: 400 })
    }

    await createInquiry(parsed.data, ip)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) {
      return e // e.g., 403 Forbidden from assertSameOrigin
    }
    // SEC-012: Log error class without PII, return generic Indonesian message
    logger.error(
      { errName: e instanceof Error ? e.name : 'UnknownError' },
      'Inquiry submission failed',
    )
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi lewat WhatsApp.' },
      { status: 500 },
    )
  }
}
