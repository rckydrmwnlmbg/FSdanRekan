import crypto from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

/**
 * SEC-001: Hash password using Node's native crypto.scryptSync (memory-hard KDF, zero native C++ addon).
 * Output format: scrypt$N$r$p$saltHex$hashHex
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('Kata sandi minimal 8 karakter.')
  }
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`
}

/**
 * SEC-001: Verify password in constant time using crypto.timingSafeEqual.
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash) {
    return false
  }

  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false
  }

  const n = Number.parseInt(parts[1] ?? '', 10)
  const r = Number.parseInt(parts[2] ?? '', 10)
  const p = Number.parseInt(parts[3] ?? '', 10)
  const saltHex = parts[4] ?? ''
  const hashHex = parts[5] ?? ''

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !saltHex || !hashHex) {
    return false
  }

  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(plainPassword, salt, expected.length, { N: n, r, p })
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/**
 * SEC-001: Strong password policy for Admin & Editor accounts (min 12 chars, upper, lower, digit).
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Kata sandi wajib minimal 12 karakter.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Kata sandi wajib memuat minimal satu huruf kapital.' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Kata sandi wajib memuat minimal satu huruf kecil.' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Kata sandi wajib memuat minimal satu angka.' }
  }
  return { valid: true }
}

