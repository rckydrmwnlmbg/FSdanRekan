import crypto from 'node:crypto'
import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '@/lib/access'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB (FR-6.8 / SEC-013)

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: isLoggedIn,
    read: () => true,
    update: isLoggedIn,
    delete: isAdmin,
  },
  upload: {
    // SEC-013: SVG deliberately excluded to prevent stored XSS
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    imageSizes: [
      { name: 'sm', width: 400, height: 500, position: 'centre' },
      { name: 'md', width: 600, height: 750, position: 'centre' },
      { name: 'lg', width: 800, height: 1000, position: 'centre' },
    ],
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if ((operation === 'create' || operation === 'update') && args.req?.file) {
          const file = args.req.file
          if (file.size > MAX_UPLOAD_BYTES) {
            throw new Error('Ukuran berkas melebihi batas maksimal 5 MB (FR-6.8 / SEC-013).')
          }
          const ext = path.extname(file.name || '').toLowerCase()
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.webp'
          // SEC-013: Regenerate random safe filename to prevent double-extension / path traversal attacks
          file.name = `${crypto.randomUUID()}${safeExt}`
        }
        return args
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      maxLength: 200,
    },
  ],
}
