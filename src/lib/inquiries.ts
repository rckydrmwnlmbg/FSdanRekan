import 'server-only'
import crypto from 'node:crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { env } from '@/lib/env'
import { sendInquiryNotificationEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import type { InquiryBodyInput } from '@/lib/validation/inquiry'

export function hashClientIp(ip: string): string {
  return crypto
    .createHmac('sha256', env.PAYLOAD_SECRET)
    .update(ip || 'unknown', 'utf8')
    .digest('hex')
}

/**
 * FR-7.4 & SK-04:
 * 1. Persist Inquiry to database first (with consentAt and ipHash).
 * 2. Attempt email notification.
 * 3. If email fails, keep the saved record and mark emailFailed = true so admin is alerted in panel.
 */
export async function createInquiry(
  data: InquiryBodyInput,
  ip: string,
): Promise<{ id: string; emailFailed: boolean }> {
  const payload = await getPayload({ config: configPromise })
  const ipHash = hashClientIp(ip)
  const consentAt = new Date().toISOString()

  // Deliberately authorized server-side creation after Origin, RateLimit, Zod, and Turnstile checks (SEC-002 / SEC-005)
  const created = await payload.create({
    collection: 'inquiries' as never,
    overrideAccess: true,
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      practiceAreaId: data.practiceAreaId,
      preferredDate: data.preferredDate,
      sessionSlot: data.sessionSlot,
      method: data.method,
      summary: data.summary,
      consentAt,
      status: 'baru',
      emailFailed: false,
      ipHash,
    } as never,
  })

  const inquiryId = String(created.id)
  let emailFailed = false

  try {
    await sendInquiryNotificationEmail(inquiryId, data)
  } catch (err) {
    emailFailed = true
    logger.warn(
      { inquiryId, errName: err instanceof Error ? err.name : 'EmailError' },
      'Inquiry saved but notification email failed; marking emailFailed=true',
    )
    await payload.update({
      collection: 'inquiries' as never,
      id: inquiryId,
      overrideAccess: true,
      data: { emailFailed: true } as never,
    })
  }

  return { id: inquiryId, emailFailed }
}
