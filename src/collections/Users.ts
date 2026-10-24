import type { CollectionConfig } from 'payload'
import { getUserRole, isAdmin } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 2, // 2 hours (SEC-001)
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes lockout (SEC-001)
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    useAPIKey: false, // static API keys disabled (SEC-001)
  },
  access: {
    create: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (getUserRole(user) === 'admin') return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (getUserRole(user) === 'admin') return true
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: ['admin', 'editor'],
      saveToJWT: true,
      access: {
        update: ({ req }) => getUserRole(req.user) === 'admin',
      },
    },
    {
      name: 'mfaEnabled',
      type: 'checkbox',
      defaultValue: false,
      required: true,
      validate: (value: unknown, { siblingData }: { siblingData?: unknown }) => {
        const sib = (
          siblingData && typeof siblingData === 'object' ? siblingData : {}
        ) as Record<string, unknown>
        if (sib.role === 'admin' && value !== true) {
          return 'Peran admin wajib mengaktifkan MFA (FR-6.1 / SEC-001).'
        }
        return true
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
}
