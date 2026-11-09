import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdminUser,
  changeAdminUserPassword,
  getAdminSessionFromRequest,
  revokeAdminSession,
  SESSION_DURATION_MS,
  verifyAdminCsrf,
} from '@/lib/admin-auth'
import { assertSameOrigin } from '@/lib/security/origin'
import { limitLogin } from '@/lib/security/ratelimit'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LoginActionSchema = z
  .object({
    action: z.literal('login'),
    email: z.string().trim().toLowerCase().email().max(190),
    password: z.string().min(1).max(256),
  })
  .strict()

const LogoutActionSchema = z
  .object({
    action: z.literal('logout'),
  })
  .strict()

const ChangePasswordActionSchema = z
  .object({
    action: z.literal('change_password'),
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(12).max(256),
  })
  .strict()

const AuthBodySchema = z.discriminatedUnion('action', [
  LoginActionSchema,
  LogoutActionSchema,
  ChangePasswordActionSchema,
])

export async function GET(req: Request): Promise<Response> {
  const session = await getAdminSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
  return NextResponse.json(
    {
      authenticated: true,
      user: session,
    },
    { status: 200 },
  )
}

export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req)

    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Format permintaan tidak didukung.' }, { status: 415 })
    }

    const rawJson = await req.json().catch(() => null)
    const parsed = AuthBodySchema.safeParse(rawJson)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    const payload = parsed.data
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    if (payload.action === 'login') {
      if (!(await limitLogin(ip, payload.email))) {
        return NextResponse.json(
          { error: 'Terlalu banyak percobaan masuk. Silakan coba lagi setelah 15 menit.' },
          { status: 429 },
        )
      }

      const authResult = await authenticateAdminUser({
        email: payload.email,
        password: payload.password,
        ip,
        userAgent: req.headers.get('user-agent') || '',
      })

      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status })
      }

      const res = NextResponse.json(
        {
          ok: true,
          user: authResult.user,
        },
        { status: 200 },
      )

      res.cookies.set(ADMIN_SESSION_COOKIE, authResult.rawSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      })

      return res
    }

    if (payload.action === 'logout') {
      await revokeAdminSession(req)
      const res = NextResponse.json({ ok: true }, { status: 200 })
      res.cookies.set(ADMIN_SESSION_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return res
    }

    if (payload.action === 'change_password') {
      const session = await getAdminSessionFromRequest(req)
      if (!session) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' }, { status: 401 })
      }
      if (!verifyAdminCsrf(req, session)) {
        return NextResponse.json({ error: 'Token keamanan CSRF tidak valid.' }, { status: 403 })
      }

      const result = await changeAdminUserPassword({
        userId: session.id,
        email: session.email,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Gagal mengganti kata sandi.' }, { status: 400 })
      }

      return NextResponse.json(
        {
          ok: true,
          user: {
            ...session,
            mustChangePassword: false,
          },
        },
        { status: 200 },
      )
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 })
  } catch (e) {
    if (e instanceof Response) {
      return e
    }
    logger.error(
      { errName: e instanceof Error ? e.name : 'AdminAuthError' },
      'Admin authentication route failed',
    )
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 })
  }
}

