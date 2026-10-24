import type { CollectionConfig } from 'payload'
import { getUserRole, isAdmin, isPublishedPublic } from '@/lib/access'

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
      validate: (value: unknown, { siblingData }: { siblingData?: unknown }) => {
        if (value === 'named') {
          const sib = (
            siblingData && typeof siblingData === 'object' ? siblingData : {}
          ) as Record<string, unknown>
          const ref = sib.consentRef
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
          if (getUserRole(req.user) === 'admin') return true
          const sib = (
            siblingData && typeof siblingData === 'object' ? siblingData : {}
          ) as Record<string, unknown>
          return (
            sib.displayMode === 'named' &&
            typeof sib.consentRef === 'string' &&
            sib.consentRef.trim().length > 0
          )
        },
      },
    },
    {
      name: 'consentRef',
      type: 'text',
      access: {
        read: ({ req }) => getUserRole(req.user) === 'admin',
      },
    },
    { name: 'displayOrder', type: 'number', required: true, defaultValue: 1 },
    { name: 'isPublished', type: 'checkbox', required: true, defaultValue: true },
  ],
}
