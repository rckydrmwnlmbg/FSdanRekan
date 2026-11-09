import type { RowDataPacket } from 'mysql2/promise'
import { getDbPool } from '@/lib/db'

interface MemoryBucket {
  count: number
  expiresAt: number
}

const memoryBuckets = new Map<string, MemoryBucket>()

function checkMemoryRateLimit(bucketKey: string, maxHits: number, windowMs: number): boolean {
  const now = Date.now()
  if (memoryBuckets.size > 2000) {
    for (const [k, v] of memoryBuckets.entries()) {
      if (v.expiresAt <= now) {
        memoryBuckets.delete(k)
      }
    }
  }

  const existing = memoryBuckets.get(bucketKey)
  if (!existing || existing.expiresAt <= now) {
    memoryBuckets.set(bucketKey, { count: 1, expiresAt: now + windowMs })
    return true
  }

  existing.count += 1
  return existing.count <= maxHits
}

/**
 * SEC-007: Hybrid Rate Limiter (MySQL `rate_limits` table + In-Memory Fallback).
 * - If MySQL (`DATABASE_URL`) is connected, uses atomic upsert on `rate_limits` table so rate limits
 *   remain consistent even when cPanel Phusion Passenger spawns multiple Node.js worker processes.
 * - Falls back to in-memory sliding window when running without a database (e.g., unit tests or degraded DB).
 */
export async function checkRateLimitBucket(
  bucketKey: string,
  maxHits: number,
  windowMs: number,
): Promise<boolean> {
  const pool = getDbPool()
  const now = Date.now()
  const expiresAt = now + windowMs

  if (pool) {
    try {
      // Opportunistically purge expired buckets (~5% of requests)
      if (Math.random() < 0.05) {
        await pool.query('DELETE FROM `rate_limits` WHERE `expires_at` <= ?', [now])
      }

      await pool.query(
        `INSERT INTO \`rate_limits\` (\`bucket_key\`, \`hit_count\`, \`window_start\`, \`expires_at\`)
         VALUES (?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`hit_count\` = IF(\`expires_at\` <= VALUES(\`window_start\`), 1, \`hit_count\` + 1),
           \`window_start\` = IF(\`expires_at\` <= VALUES(\`window_start\`), VALUES(\`window_start\`), \`window_start\`),
           \`expires_at\` = IF(\`expires_at\` <= VALUES(\`window_start\`), VALUES(\`expires_at\`), \`expires_at\`)`,
        [bucketKey.slice(0, 190), now, expiresAt],
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT `hit_count` FROM `rate_limits` WHERE `bucket_key` = ? LIMIT 1',
        [bucketKey.slice(0, 190)],
      )
      const count = Number(rows[0]?.hit_count ?? 1)
      return count <= maxHits
    } catch {
      // Fallback to in-memory limiter if DB table is not yet migrated or temporarily unreachable
      return checkMemoryRateLimit(bucketKey, maxHits, windowMs)
    }
  }

  return checkMemoryRateLimit(bucketKey, maxHits, windowMs)
}

/**
 * Inquiry form rate limit: max 5 requests per 10 minutes per IP (FR-8 / SEC-007).
 */
export const limitByIp = async (ip: string): Promise<boolean> =>
  checkRateLimitBucket(`rl:inquiry:${ip}`, 5, 10 * 60 * 1000)

/**
 * Admin login rate limit: max 10 requests per 15 minutes per IP+email (SEC-001 / SEC-007).
 */
export const limitLogin = async (ip: string, email: string): Promise<boolean> =>
  checkRateLimitBucket(`rl:login:${ip}:${email.trim().toLowerCase()}`, 10, 15 * 60 * 1000)

/**
 * Helper to clear in-memory rate limit buckets during automated tests.
 */
export function resetMemoryRateLimitsForTest(): void {
  memoryBuckets.clear()
}
