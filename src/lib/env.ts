import 'server-only'
import { z } from 'zod'

const schema = z.object({
  SITE_URL: z.string().url().default('https://fsdanrekan.id'),
  DATABASE_URI: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/fsdanrekan'),
  PAYLOAD_SECRET: z.string().min(32).default('build-time-secret-at-least-32-characters-long-default'),
  RESEND_API_KEY: z.string().min(1).default('re_build_placeholder'),
  MAIL_FROM: z.string().email().default('noreply@fsdanrekan.id'),
  INQUIRY_TO: z.string().email().default('kontak@fsdanrekan.id'),
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
})

export const env = schema.parse(process.env)
