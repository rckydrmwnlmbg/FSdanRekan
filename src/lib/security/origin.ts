import { env } from '@/lib/env'

export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin')
  if (!origin || origin !== new URL(env.SITE_URL).origin) {
    throw new Response('Forbidden', { status: 403 })
  }
}
