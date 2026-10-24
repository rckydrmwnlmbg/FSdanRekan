import 'server-only'
import { z } from 'zod'

const schema = z.object({
  SITE_URL: z.string().url(),
  DATABASE_URI: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().email().default('noreply@fsdanrekan.id'),
  INQUIRY_TO: z.string().email(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),
})

export const env = schema.parse(process.env)
