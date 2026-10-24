import type { Access } from 'payload'

export function getUserRole(user: unknown): string | undefined {
  if (user && typeof user === 'object' && 'role' in user) {
    const role = (user as { role?: unknown }).role
    return typeof role === 'string' ? role : undefined
  }
  return undefined
}

export const isAdmin: Access = ({ req }) => getUserRole(req.user) === 'admin'

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const denyAll: Access = () => false

export const publishedOrLoggedIn: Access = ({ req }) => {
  if (req.user) {
    return true
  }
  return {
    and: [
      { _status: { equals: 'published' } },
      { publishedAt: { less_than_equal: new Date().toISOString() } },
    ],
  }
}

export const isPublishedPublic: Access = ({ req }) =>
  req.user ? true : { isPublished: { equals: true } }
