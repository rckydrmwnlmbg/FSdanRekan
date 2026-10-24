import type { CollectionConfig } from 'payload'
import { denyAll, isAdmin } from '@/lib/access'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  access: {
    create: denyAll, // SEC-002: Only created via verified server route POST /api/inquiry
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterRead: [
      async ({ doc, req }) => {
        // SEC-014: Log admin access to Inquiry in AuditLog without storing any PII
        if (req.user?.id && doc?.id) {
          try {
            await req.payload.create({
              collection: 'audit-logs' as never,
              overrideAccess: true,
              data: {
                userId: String(req.user.id),
                action: 'read',
                entity: 'Inquiry',
                entityId: String(doc.id),
              } as never,
            })
          } catch {
            // Avoid breaking read if audit log insert fails
          }
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 100 },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text', required: true, maxLength: 20 },
    { name: 'practiceAreaId', type: 'text', required: true, maxLength: 64 },
    { name: 'preferredDate', type: 'text', required: true, maxLength: 10 },
    {
      name: 'sessionSlot',
      type: 'select',
      required: true,
      options: ['pagi', 'siang', 'sore'],
    },
    {
      name: 'method',
      type: 'select',
      required: true,
      options: ['tatap-muka', 'daring'],
    },
    { name: 'summary', type: 'textarea', required: true, maxLength: 1000 },
    { name: 'consentAt', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'baru',
      options: ['baru', 'dihubungi', 'selesai', 'spam'], // FR-6.7
    },
    {
      name: 'emailFailed',
      type: 'checkbox',
      required: true,
      defaultValue: false, // FR-7.4
    },
    {
      name: 'ipHash',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
  ],
}
