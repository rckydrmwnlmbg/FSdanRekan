import type { CollectionConfig } from 'payload'
import { denyAll, isAdmin } from '@/lib/access'

/**
 * PRD Section 7 & SK-11 (v2):
 * ChatMessage stores sanitized messages within a guided ChatSession.
 * Strictly no automated legal advice (SEC-015).
 */
export const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  access: {
    create: denyAll,
    read: isAdmin,
    update: denyAll,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      maxLength: 64,
    },
    {
      name: 'sender',
      type: 'select',
      required: true,
      options: ['visitor', 'bot'],
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
      maxLength: 500,
    },
  ],
}
