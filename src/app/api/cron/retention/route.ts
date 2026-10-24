import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { env } from '@/lib/env'
import { verifyConstantTimeToken } from '@/lib/security/signature'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const RETENTION_DAYS = 365 // 12 months retention policy (PRD Section 7 / SEC-014)

export async function POST(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    if (!env.CRON_SECRET || !verifyConstantTimeToken(bearer, env.CRON_SECRET)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const payload = await getPayload({ config: configPromise })

    const deleted = await payload.delete({
      collection: 'inquiries',
      overrideAccess: true,
      where: {
        createdAt: {
          less_than: cutoff,
        },
      },
    })

    logger.info({ purgedCount: deleted.docs.length }, 'Completed scheduled inquiry retention purge')
    return NextResponse.json({ ok: true, purgedCount: deleted.docs.length }, { status: 200 })
  } catch (e) {
    logger.error(
      { errName: e instanceof Error ? e.name : 'RetentionError' },
      'Scheduled inquiry retention purge failed',
    )
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
