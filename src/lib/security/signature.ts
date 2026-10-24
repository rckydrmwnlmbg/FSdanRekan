import crypto from 'node:crypto'

export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  let given: Buffer
  try {
    given = Buffer.from(header.slice(7), 'hex')
  } catch {
    return false
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

export function verifyConstantTimeToken(given: string | null, expected: string): boolean {
  if (!given || !expected) return false
  const a = Buffer.from(given, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
