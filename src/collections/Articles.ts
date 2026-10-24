import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn, publishedOrLoggedIn } from '@/lib/access'
import { cleanHtml } from '@/lib/security/sanitize'

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90)
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  versions: {
    drafts: true,
  },
  access: {
    create: isLoggedIn,
    read: publishedOrLoggedIn, // SEC-008 / FR-5.3: public only reads published & publishedAt <= now
    update: isLoggedIn,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data) return data
        // Auto-generate slug with numeric suffix on collision (FR-6.3 & PRD Section 8)
        if (operation === 'create' && data.title && !data.slug) {
          const baseSlug = slugifyTitle(String(data.title))
          let candidate = baseSlug
          let counter = 2
          while (true) {
            const existing = await req.payload.find({
              collection: 'articles' as never,
              where: { slug: { equals: candidate } },
              limit: 1,
              overrideAccess: true,
            })
            if (existing.totalDocs === 0) break
            candidate = `${baseSlug}-${counter}`
            counter += 1
          }
          data.slug = candidate
        }
        // SEC-004: Sanitize HTML body before save (and again before render)
        if (typeof data.bodyHtml === 'string') {
          data.bodyHtml = cleanHtml(data.bodyHtml)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 160,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 100,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      maxLength: 320,
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      required: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media' as never,
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories' as never,
      required: true,
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      defaultValue: 'Tim Redaksi FS dan Rekan',
      maxLength: 100,
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'seoTitle',
      type: 'text',
      maxLength: 70,
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      maxLength: 160,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users' as never,
      admin: {
        readOnly: true,
      },
    },
  ],
}
