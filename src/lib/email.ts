import 'server-only'
import { Resend } from 'resend'
import { env } from '@/lib/env'
import { escapeHtml } from '@/lib/security/sanitize'
import type { InquiryBodyInput } from '@/lib/validation/inquiry'

function stripHeaderCrLf(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

export async function sendInquiryNotificationEmail(
  inquiryId: string,
  data: InquiryBodyInput,
): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY)

  // SEC-004: Fixed subject without untrusted user strings in headers; replyTo validated & stripped of CR/LF
  const safeReplyTo = stripHeaderCrLf(data.email)
  const subject = `[FS dan Rekan] Permohonan Konsultasi Baru (#${stripHeaderCrLf(inquiryId)})`

  const html = `
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

  const result = await resend.emails.send({
    from: stripHeaderCrLf(env.MAIL_FROM),
    to: [stripHeaderCrLf(env.INQUIRY_TO)],
    replyTo: safeReplyTo,
    subject,
    html,
  })

  if (result.error) {
    throw new Error(`Resend dispatch failed: ${result.error.name}`)
  }
}
