import type { CollectionConfig } from 'payload'
import { isAdmin, isPublishedPublic } from '@/lib/access'

export const CaseRecords: CollectionConfig = {
  slug: 'case-records',
  access: {
    create: isAdmin,
    read: isPublishedPublic,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'caseType', type: 'text', required: true, maxLength: 160 },
    { name: 'region', type: 'text', required: true, maxLength: 120 },
    {
      name: 'displayMode',
      type: 'select',
      required: true,
      defaultValue: 'anonymous',
      options: ['anonymous', 'named'],
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        if (value === 'named') {
          const ref = siblingData?.consentRef
          if (typeof ref !== 'string' || ref.trim().length === 0) {
            return 'Mode "named" wajib disertai bukti persetujuan tertulis pada consentRef (SK-14).'
          }
        }
        return true
      },
    },
    {
      name: 'clientName',
      type: 'text',
      access: {
        // SK-14: Never expose clientName to public unless displayMode === 'named' AND consentRef is filled
        read: ({ req, siblingData }) => {
          if (req.user?.role === 'admin') return true
          return (
            siblingData?.displayMode === 'named' &&
            typeof siblingData?.consentRef === 'string' &&
            siblingData.consentRef.trim().length > 0
          )
        },
      },
    },
    {
      name: 'consentRef',
      type: 'text',
      access: {
        read: ({ req }) => req.user?.role === 'admin',
      },
    },
    { name: 'displayOrder', type: 'number', required: true, defaultValue: 1 },
    { name: 'isPublished', type: 'checkbox', required: true, defaultValue: true },
  ],
}
