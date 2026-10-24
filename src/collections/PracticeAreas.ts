import type { CollectionConfig } from 'payload'
import { isAdmin, isPublishedPublic } from '@/lib/access'

export const PracticeAreas: CollectionConfig = {
  slug: 'practice-areas',
  access: {
    create: isAdmin,
    read: isPublishedPublic,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 80,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      maxLength: 40,
    },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 400,
    },
    {
      name: 'icon',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
  ],
}
