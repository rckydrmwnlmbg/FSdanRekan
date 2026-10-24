import 'server-only'
import { env } from '@/lib/env'

interface TurnstileVerifyResponse {
  success: boolean
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token || token.length > 2048) {
    return false
  }
  const formData = new URLSearchParams()
  formData.set('secret', env.TURNSTILE_SECRET_KEY)
  formData.set('response', token)
  if (ip && ip !== 'unknown') {
    formData.set('remoteip', ip)
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
  if (!res.ok) {
    return false
  }
  const data = (await res.json()) as TurnstileVerifyResponse
  return Boolean(data.success)
}
