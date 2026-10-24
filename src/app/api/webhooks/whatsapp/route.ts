import { z } from 'zod'
import { env } from '@/lib/env'
import { verifyConstantTimeToken, verifyMetaSignature } from '@/lib/security/signature'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const processedMessageIds = new Set<string>()

const WebhookSchema = z
  .object({
    object: z.string(),
    entry: z
      .array(
        z.object({
          id: z.string(),
          changes: z.array(
            z.object({
              field: z.string(),
              value: z
                .object({
                  messages: z
                    .array(
                      z.object({
                        id: z.string().min(1).max(128),
                        timestamp: z.string().optional(),
                        type: z.string().optional(),
                      }),
                    )
                    .optional(),
                })
                .passthrough(),
            }),
          ),
        }),
      )
      .default([]),
  })
  .passthrough()

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    challenge &&
    env.WHATSAPP_VERIFY_TOKEN &&
    verifyConstantTimeToken(token, env.WHATSAPP_VERIFY_TOKEN)
  ) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Unauthorized', { status: 401 })
}

export async function POST(req: Request): Promise<Response> {
  try {
    // SEC-011: Read raw body BEFORE parsing JSON and verify HMAC-SHA256 signature
    const raw = await req.text()
    if (
      !env.META_APP_SECRET ||
      !verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET)
    ) {
      return new Response('Unauthorized', { status: 401 })
    }

    const parsed = WebhookSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return new Response('Bad Request', { status: 400 })
    }

    // SEC-011 / SK-12: Idempotent processing by message ID
    for (const entry of parsed.data.entry) {
      for (const change of entry.changes) {
        for (const msg of change.value.messages ?? []) {
          if (processedMessageIds.has(msg.id)) {
            continue
          }
          processedMessageIds.add(msg.id)
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    logger.error(
      { errName: e instanceof Error ? e.name : 'WebhookError' },
      'WhatsApp webhook processing error',
    )
    return new Response('Internal Server Error', { status: 500 })
  }
}
