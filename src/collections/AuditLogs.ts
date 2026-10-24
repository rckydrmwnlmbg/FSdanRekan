import type { CollectionConfig } from 'payload'
import { denyAll, isAdmin } from '@/lib/access'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  access: {
    create: denyAll,
    read: isAdmin,
    update: denyAll,
    delete: denyAll,
  },
  fields: [
    { name: 'userId', type: 'text', required: true },
    { name: 'action', type: 'text', required: true },
    { name: 'entity', type: 'text', required: true },
    { name: 'entityId', type: 'text', required: true },
  ],
}
