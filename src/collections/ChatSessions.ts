import type { CollectionConfig } from 'payload'
import { denyAll, isAdmin } from '@/lib/access'

/**
 * PRD Section 7 & SK-11 (v2):
 * ChatSession stores guided chat session metadata with 128-bit random session ID.
 * Only accessible to admin; created exclusively via verified POST /api/chat route (SEC-002, SEC-008).
 */
export const ChatSessions: CollectionConfig = {
  slug: 'chat-sessions',
  access: {
    create: denyAll,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sessionToken',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 64,
    },
    {
      name: 'visitorName',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'visitorPhone',
      type: 'text',
      required: true,
      maxLength: 20,
    },
    {
      name: 'practiceArea',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'preferredSchedule',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'consentAt',
      type: 'date',
      required: true,
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'endedAt',
      type: 'date',
    },
    {
      name: 'summarySentAt',
      type: 'date',
    },
  ],
}
