import crypto from 'node:crypto'
import type { Pool } from 'mysql2/promise'
import { fetchSiteSettingsFromDb } from '@/lib/content'
import { getDbPool } from '@/lib/db'
import { sendInquiryNotificationEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import type { InquiryBodyInput } from '@/lib/validation/inquiry'

function getSecretForIpHash(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.PAYLOAD_SECRET ||
    'build-time-secret-at-least-32-characters-long-default'
  )
}

export function hashClientIp(ip: string): string {
  return crypto
    .createHmac('sha256', getSecretForIpHash())
    .update(ip || 'unknown', 'utf8')
    .digest('hex')
}

/**
 * FR-7.4 & SK-04:
 * 1. Persist Inquiry to MySQL `inquiries` table first (with consent_at and ip_hash).
 * 2. Attempt SMTP email notification (mail.fsdanrekan.com:465).
 * 3. If email fails, keep the saved record in MySQL `inquiries` and mark `email_failed = 1`
 *    so the client still sees confirmation and the admin is alerted in `/admin`.
 */
export async function createInquiry(
  data: InquiryBodyInput,
  ip: string,
  options?: {
    poolOverride?: Pool | null
    sendEmailFn?: (
      id: string,
      input: InquiryBodyInput,
      recipientOverride?: string,
    ) => Promise<void>
  },
): Promise<{ id: string; emailFailed: boolean }> {
  const ipHash = hashClientIp(ip)
  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const inquiryId = `inq-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const pool = options?.poolOverride !== undefined ? options.poolOverride : getDbPool()
  const sendEmail = options?.sendEmailFn ?? sendInquiryNotificationEmail

  let recipientEmail: string | undefined
  try {
    const settings = await fetchSiteSettingsFromDb()
    recipientEmail = settings.inquiryRecipientEmail
  } catch {
    recipientEmail = undefined
  }

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO \`inquiries\`
          (\`id\`, \`name\`, \`email\`, \`phone\`, \`practice_area_id\`, \`preferred_date\`,
           \`session_slot\`, \`method\`, \`summary\`, \`consent_at\`, \`status\`, \`email_failed\`, \`ip_hash\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'baru', 0, ?)`,
        [
          inquiryId,
          data.name,
          data.email,
          data.phone,
          data.practiceAreaId,
          data.preferredDate,
          data.sessionSlot,
          data.method,
          data.summary,
          nowIso,
          ipHash,
        ],
      )

      // SEC-014: Log creation in audit_logs without PII
      try {
        await pool.query(
          `INSERT INTO \`audit_logs\`
            (\`id\`, \`actor\`, \`action\`, \`collection_name\`, \`target_id\`, \`detail\`)
           VALUES (?, 'visitor', 'CREATE_INQUIRY', 'inquiries', ?, ?)`,
          [
            `audit-${Date.now()}`,
            inquiryId,
            `Permohonan konsultasi baru bidang ${data.practiceAreaId}`,
          ],
        )
      } catch {
        // Non-blocking audit log write
      }

      try {
        await sendEmail(inquiryId, data, recipientEmail)
        return { id: inquiryId, emailFailed: false }
      } catch (emailErr) {
        logger.warn(
          { inquiryId, errName: emailErr instanceof Error ? emailErr.name : 'SmtpError' },
          'Inquiry saved to MySQL but SMTP email notification failed; marking email_failed=1',
        )
        await pool.query('UPDATE `inquiries` SET `email_failed` = 1 WHERE `id` = ?', [inquiryId])
        return { id: inquiryId, emailFailed: true }
      }
    } catch (dbErr) {
      logger.warn(
        { errName: dbErr instanceof Error ? dbErr.name : 'DbError' },
        'MySQL insert failed for inquiry, attempting emergency direct SMTP email notification',
      )
      try {
        await sendEmail(inquiryId, data, recipientEmail)
        return { id: inquiryId, emailFailed: false }
      } catch (emailErr) {
        logger.error(
          {
            dbErr: dbErr instanceof Error ? dbErr.name : 'DbError',
            emailErr: emailErr instanceof Error ? emailErr.name : 'SmtpError',
          },
          'Both MySQL database and SMTP email notification failed for inquiry',
        )
        throw dbErr
      }
    }
  }

  // Fallback when DATABASE_URL is not configured (e.g., local preview without DB)
  try {
    await sendEmail(inquiryId, data, recipientEmail)
    return { id: inquiryId, emailFailed: false }
  } catch (emailErr) {
    logger.warn(
      { inquiryId, errName: emailErr instanceof Error ? emailErr.name : 'SmtpError' },
      'Inquiry received in fallback mode without SMTP configured; marking emailFailed=true',
    )
    return { id: inquiryId, emailFailed: true }
  }
}
