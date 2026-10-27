import { env } from '@/lib/env'

export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin')
  if (!origin) {
    throw new Response('Forbidden', { status: 403 })
  }

  const allowedOrigins = new Set<string>()
  try {
    allowedOrigins.add(new URL(env.SITE_URL).origin)
  } catch {}

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    allowedOrigins.add(`${proto}://${host}`)
    allowedOrigins.add(`https://${host}`)
    allowedOrigins.add(`http://${host}`)
  }

  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
  }

  let isAllowed = allowedOrigins.has(origin)
  if (!isAllowed) {
    try {
      const originHost = new URL(origin).hostname
      if (
        originHost.endsWith('.vercel.app') ||
        originHost === 'localhost' ||
        originHost === '127.0.0.1'
      ) {
        isAllowed = true
      }
    } catch {}
  }

  if (!isAllowed) {
    throw new Response('Forbidden', { status: 403 })
  }
}
