import crypto from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { getDbPool } from '@/lib/db'
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from '@/lib/security/password'
import { verifyConstantTimeToken } from '@/lib/security/signature'

export const ADMIN_SESSION_COOKIE = 'fs_admin_session'
export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours (SEC-001)
export const MAX_LOGIN_ATTEMPTS = 5 // SEC-001
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes (SEC-001)

export interface AdminSessionUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor'
  mfaEnabled: boolean
  mustChangePassword: boolean
  csrfToken: string
}

interface FallbackSessionRecord {
  sessionId: string
  user: AdminSessionUser
  expiresAt: number
}

interface FallbackUserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'editor'
  mfaEnabled: boolean
  mustChangePassword: boolean
  failedLoginAttempts: number
  lockedUntil: number | null
}

const memorySessions = new Map<string, FallbackSessionRecord>()
const memoryUsers = new Map<string, FallbackUserRecord>()

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.PAYLOAD_SECRET ||
    'build-time-secret-at-least-32-characters-long-default'
  )
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(rawToken, 'utf8').digest('hex')
}

export function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx <= 0) continue
    const k = pair.slice(0, eqIdx).trim()
    if (k === name) {
      return decodeURIComponent(pair.slice(eqIdx + 1).trim())
    }
  }
  return null
}

function ensureFallbackInitialUsers(): void {
  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@fsdanrekan.com')
    .trim()
    .toLowerCase()
  const adminPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim()

  if (adminPass.length >= 8 && !memoryUsers.has(adminEmail)) {
    memoryUsers.set(adminEmail, {
      id: 'user-admin-1',
      name: 'Administrator Utama',
      email: adminEmail,
      passwordHash: hashPassword(adminPass),
      role: 'admin',
      mfaEnabled: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
  }

  const editorEmail = (process.env.EDITOR_INITIAL_EMAIL || 'editor@fsdanrekan.com')
    .trim()
    .toLowerCase()
  const editorPass = (process.env.EDITOR_INITIAL_PASSWORD || '').trim()

  if (editorPass.length >= 8 && !memoryUsers.has(editorEmail)) {
    memoryUsers.set(editorEmail, {
      id: 'user-editor-1',
      name: 'Tim Redaksi Hukum (Editor)',
      email: editorEmail,
      passwordHash: hashPassword(editorPass),
      role: 'editor',
      mfaEnabled: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
  }
}

/**
 * Ensure initial admin user from ADMIN_INITIAL_EMAIL + ADMIN_INITIAL_PASSWORD exists in DB
 * if the `users` table is empty.
 */
async function bootstrapInitialUsersInDbIfNeeded(): Promise<void> {
  const pool = getDbPool()
  if (!pool) return

  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@fsdanrekan.com')
    .trim()
    .toLowerCase()
  const adminPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim()
  if (adminPass.length < 8) return

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS `cnt` FROM `users`',
    )
    const totalUsers = Number(countRows[0]?.cnt ?? 0)
    if (totalUsers === 0) {
      await pool.query(
        `INSERT IGNORE INTO \`users\`
          (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
         VALUES ('user-admin-1', 'Administrator Utama', ?, ?, 'admin', 1, 1)`,
        [adminEmail, hashPassword(adminPass)],
      )
    }
  } catch {
    // Ignore if table not yet migrated
  }
}

/**
 * SEC-001: Authenticate admin/editor user with 5-attempt lockout (15 mins) and create 2-hour session.
 * Always returns generic error message on invalid credentials so email existence is never leaked.
 */
export async function authenticateAdminUser(params: {
  email: string
  password: string
  ip: string
  userAgent?: string
}): Promise<
  | {
      ok: true
      rawSessionToken: string
      user: AdminSessionUser
    }
  | {
      ok: false
      status: 401 | 423
      error: string
    }
> {
  const email = params.email.trim().toLowerCase()
  const password = params.password
  const ipHash = hashSessionToken(params.ip || 'unknown')
  const now = Date.now()
  const pool = getDbPool()

  if (pool) {
    try {
      await bootstrapInitialUsersInDbIfNeeded()
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM `users` WHERE `email` = ? LIMIT 1',
        [email],
      )
      const row = rows[0]
      if (!row) {
        return { ok: false, status: 401, error: 'Email atau kata sandi salah.' }
      }

      const lockedUntil = row.locked_until ? new Date(String(row.locked_until)).getTime() : null
      if (lockedUntil && lockedUntil > now) {
        return {
          ok: false,
          status: 423,
          error: 'Akun dikunci sementara selama 15 menit karena terlalu banyak percobaan gagal.',
        }
      }

      const passwordValid = verifyPassword(password, String(row.password_hash || ''))
      if (!passwordValid) {
        const nextAttempts = (Number(row.failed_login_attempts) || 0) + 1
        if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockTimeIso = new Date(now + LOCKOUT_DURATION_MS)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ')
          await pool.query(
            'UPDATE `users` SET `failed_login_attempts` = ?, `locked_until` = ? WHERE `id` = ?',
            [nextAttempts, lockTimeIso, row.id],
          )
          return {
            ok: false,
            status: 423,
            error: 'Akun dikunci sementara selama 15 menit karena terlalu banyak percobaan gagal.',
          }
        }
        await pool.query('UPDATE `users` SET `failed_login_attempts` = ? WHERE `id` = ?', [
          nextAttempts,
          row.id,
        ])
        return { ok: false, status: 401, error: 'Email atau kata sandi salah.' }
      }

      const rawSessionToken = crypto.randomBytes(32).toString('hex')
      const sessionIdHash = hashSessionToken(rawSessionToken)
      const csrfToken = crypto.randomBytes(24).toString('hex')
      const expiresAtIso = new Date(now + SESSION_DURATION_MS)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
      const nowIso = new Date(now).toISOString().slice(0, 19).replace('T', ' ')

      await pool.query(
        'UPDATE `users` SET `failed_login_attempts` = 0, `locked_until` = NULL, `last_login_at` = ? WHERE `id` = ?',
        [nowIso, row.id],
      )

      await pool.query(
        `INSERT INTO \`sessions\`
          (\`id\`, \`user_id\`, \`csrf_token\`, \`ip_hash\`, \`user_agent\`, \`expires_at\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionIdHash,
          String(row.id),
          csrfToken,
          ipHash,
          (params.userAgent || '').slice(0, 250),
          expiresAtIso,
        ],
      )

      const user: AdminSessionUser = {
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        role: row.role === 'admin' ? 'admin' : 'editor',
        mfaEnabled: Boolean(row.mfa_enabled),
        mustChangePassword: Boolean(row.must_change_password),
        csrfToken,
      }

      return { ok: true, rawSessionToken, user }
    } catch {
      // Fall through to memory store if DB is offline in local test mode
    }
  }

  ensureFallbackInitialUsers()
  const memUser = memoryUsers.get(email)
  if (!memUser) {
    return { ok: false, status: 401, error: 'Email atau kata sandi salah.' }
  }

  if (memUser.lockedUntil && memUser.lockedUntil > now) {
    return {
      ok: false,
      status: 423,
      error: 'Akun dikunci sementara selama 15 menit karena terlalu banyak percobaan gagal.',
    }
  }

  if (!verifyPassword(password, memUser.passwordHash)) {
    memUser.failedLoginAttempts += 1
    if (memUser.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      memUser.lockedUntil = now + LOCKOUT_DURATION_MS
      return {
        ok: false,
        status: 423,
        error: 'Akun dikunci sementara selama 15 menit karena terlalu banyak percobaan gagal.',
      }
    }
    return { ok: false, status: 401, error: 'Email atau kata sandi salah.' }
  }

  memUser.failedLoginAttempts = 0
  memUser.lockedUntil = null

  const rawSessionToken = crypto.randomBytes(32).toString('hex')
  const sessionIdHash = hashSessionToken(rawSessionToken)
  const csrfToken = crypto.randomBytes(24).toString('hex')

  const sessionUser: AdminSessionUser = {
    id: memUser.id,
    name: memUser.name,
    email: memUser.email,
    role: memUser.role,
    mfaEnabled: memUser.mfaEnabled,
    mustChangePassword: memUser.mustChangePassword,
    csrfToken,
  }

  memorySessions.set(sessionIdHash, {
    sessionId: sessionIdHash,
    user: sessionUser,
    expiresAt: now + SESSION_DURATION_MS,
  })

  return { ok: true, rawSessionToken, user: sessionUser }
}

/**
 * Retrieve authenticated admin/editor user from request cookies.
 */
export async function getAdminSessionFromRequest(req: Request): Promise<AdminSessionUser | null> {
  const rawToken = parseCookieValue(req.headers.get('cookie'), ADMIN_SESSION_COOKIE)
  if (!rawToken) return null

  const sessionIdHash = hashSessionToken(rawToken)
  const now = Date.now()
  const pool = getDbPool()

  if (pool) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT s.csrf_token, s.expires_at,
                u.id, u.name, u.email, u.role, u.mfa_enabled, u.must_change_password
         FROM \`sessions\` s
         INNER JOIN \`users\` u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP()
         LIMIT 1`,
        [sessionIdHash],
      )
      const row = rows[0]
      if (row) {
        return {
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          role: row.role === 'admin' ? 'admin' : 'editor',
          mfaEnabled: Boolean(row.mfa_enabled),
          mustChangePassword: Boolean(row.must_change_password),
          csrfToken: String(row.csrf_token),
        }
      }
    } catch {
      // Fall through to memory session check
    }
  }

  const mem = memorySessions.get(sessionIdHash)
  if (!mem || mem.expiresAt <= now) {
    memorySessions.delete(sessionIdHash)
    return null
  }
  return mem.user
}

/**
 * Verify CSRF token header against active session's csrfToken in constant time.
 */
export function verifyAdminCsrf(req: Request, session: AdminSessionUser): boolean {
  const headerToken = req.headers.get('x-csrf-token')?.trim() ?? null
  return verifyConstantTimeToken(headerToken, session.csrfToken)
}

/**
 * Destroy session on logout.
 */
export async function revokeAdminSession(req: Request): Promise<void> {
  const rawToken = parseCookieValue(req.headers.get('cookie'), ADMIN_SESSION_COOKIE)
  if (!rawToken) return
  const sessionIdHash = hashSessionToken(rawToken)
  memorySessions.delete(sessionIdHash)

  const pool = getDbPool()
  if (pool) {
    try {
      await pool.query('DELETE FROM `sessions` WHERE `id` = ?', [sessionIdHash])
    } catch {
      // Ignore DB error on logout
    }
  }
}

/**
 * Change user password (used for mandatory first-login password change and profile updates).
 * Clears `must_change_password = 0` upon success.
 */
export async function changeAdminUserPassword(params: {
  userId: string
  email: string
  currentPassword: string
  newPassword: string
}): Promise<{ ok: boolean; error?: string }> {
  const strength = validatePasswordStrength(params.newPassword)
  if (!strength.valid) {
    return { ok: false, error: strength.message }
  }
  if (params.currentPassword === params.newPassword) {
    return {
      ok: false,
      error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama.',
    }
  }

  const pool = getDbPool()
  if (pool) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT `id`, `password_hash` FROM `users` WHERE `id` = ? LIMIT 1',
        [params.userId],
      )
      const row = rows[0]
      if (row) {
        if (!verifyPassword(params.currentPassword, String(row.password_hash || ''))) {
          return { ok: false, error: 'Kata sandi saat ini tidak sesuai.' }
        }
        const nextHash = hashPassword(params.newPassword)
        await pool.query(
          'UPDATE `users` SET `password_hash` = ?, `must_change_password` = 0 WHERE `id` = ?',
          [nextHash, params.userId],
        )
        return { ok: true }
      }
    } catch {
      // Fall through to memory store
    }
  }

  const memUser = memoryUsers.get(params.email.trim().toLowerCase())
  if (!memUser || !verifyPassword(params.currentPassword, memUser.passwordHash)) {
    return { ok: false, error: 'Kata sandi saat ini tidak sesuai.' }
  }
  memUser.passwordHash = hashPassword(params.newPassword)
  memUser.mustChangePassword = false
  for (const sess of memorySessions.values()) {
    if (sess.user.id === memUser.id) {
      sess.user.mustChangePassword = false
    }
  }
  return { ok: true }
}

export function resetAdminAuthMemoryForTest(): void {
  memorySessions.clear()
  memoryUsers.clear()
}

