import { NextRequest, NextResponse } from 'next/server'
import { fetchLiveInstagramMedia } from '@/lib/instagram'

/**
 * POST /api/instagram/sync
 * Allows testing connection and fetching live media from Instagram Graph API (SK-13).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const providedToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : undefined

    const result = await fetchLiveInstagramMedia(providedToken)

    return NextResponse.json({
      ok: result.success,
      source: result.source,
      message: result.message,
      count: result.items.length,
      lastSyncAt: result.lastSyncAt,
      items: result.items,
    })
  } catch (error) {
    const errText = error instanceof Error ? error.message : 'Kesalahan server'
    return NextResponse.json(
      { ok: false, error: `Gagal sinkronisasi Instagram: ${errText}` },
      { status: 500 },
    )
  }
}
