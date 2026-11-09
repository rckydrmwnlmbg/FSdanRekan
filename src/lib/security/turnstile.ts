import { logger } from '@/lib/logger'

interface TurnstileVerifyResponse {
  success: boolean
}

const PLACEHOLDER_SECRETS = new Set([
  '',
  'turnstile_secret_placeholder',
  'your_turnstile_secret_key',
])

export function isTurnstileConfigured(): boolean {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()
  return !PLACEHOLDER_SECRETS.has(secret)
}

/**
 * FR-7.3 & SEC-005:
 * Verifies Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured.
 * If Turnstile is not yet configured in environment variables, logs a clear warning
 * (not an error) and falls back to the honeypot field + IP rate-limiting guard.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()

  if (PLACEHOLDER_SECRETS.has(secret)) {
    logger.warn(
      { fallback: 'honeypot+ratelimit' },
      'TURNSTILE_SECRET_KEY belum dikonfigurasi; menggunakan fallback honeypot + rate limit untuk proteksi form janji temu.',
    )
    return true
  }

  if (!token || token.length > 2048) {
    return false
  }

  const formData = new URLSearchParams()
  formData.set('secret', secret)
  formData.set('response', token)
  if (ip && ip !== 'unknown') {
    formData.set('remoteip', ip)
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    if (!res.ok) {
      logger.warn(
        { status: res.status },
        'Cloudflare Turnstile siteverify mengembalikan status non-200.',
      )
      return false
    }
    const data = (await res.json()) as TurnstileVerifyResponse
    return Boolean(data.success)
  } catch (err) {
    logger.warn(
      { errName: err instanceof Error ? err.name : 'TurnstileNetworkError' },
      'Gagal menghubungi server verifikasi Cloudflare Turnstile.',
    )
    return false
  }
}
