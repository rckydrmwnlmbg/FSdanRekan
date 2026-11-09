import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/security/sanitize'
import type { InquiryBodyInput } from '@/lib/validation/inquiry'

export function stripHeaderCrLf(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

export function buildInquiryEmailHtml(inquiryId: string, data: InquiryBodyInput): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">Permohonan Janji Temu Konsultasi Baru</h2>
      <p>Permohonan konsultasi baru telah tercatat di sistem <strong>Ferdinan Silalahi dan Rekan Law Firm</strong>:</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr><td style="padding: 6px 0; font-weight: bold;">ID Permohonan</td><td>${escapeHtml(inquiryId)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Nama Lengkap / Instansi</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Email</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Nomor WhatsApp</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Bidang Hukum</td><td>${escapeHtml(data.practiceAreaId)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Tanggal &amp; Sesi</td><td>${escapeHtml(data.preferredDate)} (${escapeHtml(data.sessionSlot)})</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Metode</td><td>${escapeHtml(data.method)}</td></tr>
      </table>
      <h3 style="margin-top: 16px;">Uraian Singkat:</h3>
      <blockquote style="background: #f3f4f6; padding: 12px 16px; border-left: 4px solid #c5a880;">
        ${escapeHtml(data.summary)}
      </blockquote>
    </div>
  `
}

/**
 * Send inquiry notification email via cPanel SMTP (mail.fsdanrekan.com:465 SSL)
 * with optional fallback to Resend if configured.
 * SEC-004: Strips CR/LF from all headers and escapes HTML entities in body.
 */
export async function sendInquiryNotificationEmail(
  inquiryId: string,
  data: InquiryBodyInput,
  recipientOverride?: string,
): Promise<void> {
  const smtpHost = (process.env.SMTP_HOST || 'mail.fsdanrekan.com').trim()
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || '465', 10) || 465
  const smtpUser = (process.env.SMTP_USER || '').trim()
  const smtpPass = process.env.SMTP_PASS || ''
  const mailFrom = stripHeaderCrLf(
    process.env.MAIL_FROM || smtpUser || 'noreply@fsdanrekan.com',
  )
  const inquiryTo = stripHeaderCrLf(
    recipientOverride || process.env.INQUIRY_TO || 'konsultasi@fsdanrekan.com',
  )
  const safeReplyTo = stripHeaderCrLf(data.email)
  const subject = `[FS dan Rekan] Permohonan Konsultasi Baru (#${stripHeaderCrLf(inquiryId)})`
  const html = buildInquiryEmailHtml(inquiryId, data)

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    await transporter.sendMail({
      from: `"Ferdinan Silalahi dan Rekan Law Firm" <${mailFrom}>`,
      to: inquiryTo,
      replyTo: safeReplyTo,
      subject,
      html,
    })
    return
  }

  const resendKey = (process.env.RESEND_API_KEY || '').trim()
  if (resendKey && resendKey !== 're_build_placeholder') {
    const resend = new Resend(resendKey)
    const result = await resend.emails.send({
      from: mailFrom,
      to: [inquiryTo],
      replyTo: safeReplyTo,
      subject,
      html,
    })
    if (result.error) {
      throw new Error(`Resend dispatch failed: ${result.error.name}`)
    }
    return
  }

  throw new Error('SMTP_USER / SMTP_PASS belum dikonfigurasi untuk pengiriman email.')
}
