import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Users } from '@/collections/Users'
import { Media } from '@/collections/Media'
import { Categories } from '@/collections/Categories'
import { Articles } from '@/collections/Articles'
import { TeamMembers } from '@/collections/TeamMembers'
import { PracticeAreas } from '@/collections/PracticeAreas'
import { Inquiries } from '@/collections/Inquiries'
import { AuditLogs } from '@/collections/AuditLogs'
import { CaseRecords } from '@/collections/CaseRecords'
import { ChatSessions } from '@/collections/ChatSessions'
import { ChatMessages } from '@/collections/ChatMessages'
import { SiteSettings } from '@/globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
  },
  collections: [
    Users,
    TeamMembers,
    PracticeAreas,
    Articles,
    Categories,
    Media,
    Inquiries,
    AuditLogs,
    CaseRecords,
    ChatSessions,
    ChatMessages,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
})
