import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Checks application status and MySQL/MariaDB database connectivity without leaking secrets (SEC-005, SEC-012).
 */
export async function GET(): Promise<Response> {
  const dbHealth = await checkDatabaseHealth()
  const isHealthy = !dbHealth.configured || dbHealth.connected

  return NextResponse.json(
    {
      ok: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        configured: dbHealth.configured,
        connected: dbHealth.connected,
        latencyMs: dbHealth.latencyMs,
        ...(dbHealth.migrations ? { migrations: dbHealth.migrations } : {}),
      },
    },
    { status: isHealthy ? 200 : 503 },
  )
}

