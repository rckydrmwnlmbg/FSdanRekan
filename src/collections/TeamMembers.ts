import type { CollectionConfig } from 'payload'
import { isAdmin, isPublishedPublic } from '@/lib/access'

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
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
      name: 'fullName',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'honorific',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'roleTitle',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'group',
      type: 'select',
      required: true,
      options: ['Pendiri dan Managing Partner', 'Associate', 'Legal Administrator'],
    },
    {
      name: 'shortBio',
      type: 'textarea',
      required: true,
      maxLength: 200, // SK-01: shortBio <= 200 characters
    },
    {
      name: 'fullBio',
      type: 'textarea',
      required: true,
    },
    {
      name: 'education',
      type: 'array',
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'languages',
      type: 'array',
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
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
