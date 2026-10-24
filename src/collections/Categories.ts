import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '@/lib/access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: isLoggedIn,
    read: () => true,
    update: isLoggedIn,
    delete: isAdmin,
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // FR-6.4: Category that is still referenced by articles cannot be deleted
        const referenced = await req.payload.find({
          collection: 'articles',
          where: { category: { equals: id } },
          limit: 1,
          overrideAccess: true,
        })
        if (referenced.totalDocs > 0) {
          throw new Error(
            'Kategori ini masih digunakan oleh artikel dan tidak dapat dihapus (FR-6.4).',
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 80,
    },
  ],
}
