import 'server-only'
import { z } from 'zod'

const schema = z.object({
  SITE_URL: z.string().url().default('https://fsdanrekan.com'),
  DATABASE_URL: z.string().optional().default(''),
  DATABASE_URI: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/fsdanrekan'),
  PAYLOAD_SECRET: z.string().min(32).default('build-time-secret-at-least-32-characters-long-default'),
  SESSION_SECRET: z.string().min(32).optional(),
  SMTP_HOST: z.string().default('mail.fsdanrekan.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  RESEND_API_KEY: z.string().min(1).default('re_build_placeholder'),
  MAIL_FROM: z.string().email().default('noreply@fsdanrekan.com'),
  INQUIRY_TO: z.string().email().default('konsultasi@fsdanrekan.com'),
  UPLOAD_DIR: z.string().default('./uploads'),
  ADMIN_INITIAL_EMAIL: z.string().email().default('admin@fsdanrekan.com'),
  ADMIN_INITIAL_PASSWORD: z.string().optional().default(''),
  EDITOR_INITIAL_EMAIL: z.string().email().default('editor@fsdanrekan.com'),
  EDITOR_INITIAL_PASSWORD: z.string().optional().default(''),
  TURNSTILE_SECRET_KEY: z.string().min(1).default('1x0000000000000000000000000000000AA'),
  UPSTASH_REDIS_REST_URL: z.string().url().default('https://example.upstash.io'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).default('test_token_placeholder'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),
  INSTAGRAM_PROFILE_URL: z.string().trim().optional(),
})

export const env = schema.parse(process.env)

export function getActiveSecret(): string {
  return process.env.SESSION_SECRET || env.SESSION_SECRET || env.PAYLOAD_SECRET
}

export function getMysqlDatabaseUrl(): string {
  const explicitUrl = (process.env.DATABASE_URL || env.DATABASE_URL || '').trim()
  if (explicitUrl.startsWith('mysql://') || explicitUrl.startsWith('mariadb://')) {
    return explicitUrl
  }
  const legacyUri = (process.env.DATABASE_URI || '').trim()
  if (legacyUri.startsWith('mysql://') || legacyUri.startsWith('mariadb://')) {
    return legacyUri
  }
  return ''
}
