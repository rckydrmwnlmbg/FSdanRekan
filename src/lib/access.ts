import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

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
