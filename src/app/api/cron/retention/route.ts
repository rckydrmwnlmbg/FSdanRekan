import { NextResponse } from 'next/server'
import type { ResultSetHeader } from 'mysql2/promise'
import { getDbPool } from '@/lib/db'
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

    const pool = getDbPool()
    if (!pool) {
      return NextResponse.json({ ok: true, purgedCount: 0, note: 'Database not configured' })
    }

    const [inqResult] = await pool.query<ResultSetHeader>(
      'DELETE FROM `inquiries` WHERE `created_at` < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
      [RETENTION_DAYS],
    )
    await pool.query(
      'DELETE FROM `chat_sessions` WHERE `created_at` < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
      [RETENTION_DAYS],
    )
    await pool.query('DELETE FROM `sessions` WHERE `expires_at` <= UTC_TIMESTAMP()')
    await pool.query('DELETE FROM `rate_limits` WHERE `expires_at` <= ?', [Date.now()])

    const purgedCount = inqResult.affectedRows ?? 0
    logger.info({ purgedCount }, 'Completed scheduled MySQL inquiry retention purge')
    return NextResponse.json({ ok: true, purgedCount }, { status: 200 })
  } catch (e) {
    logger.error(
      { errName: e instanceof Error ? e.name : 'RetentionError' },
      'Scheduled inquiry retention purge failed',
    )
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
