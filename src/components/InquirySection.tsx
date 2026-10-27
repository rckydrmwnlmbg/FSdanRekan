'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { PracticeAreaData, SiteSettingsData } from '@/lib/content'
import { InquiryBodySchema } from '@/lib/validation/inquiry'
import { waLink } from '@/lib/whatsapp'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

interface InquirySectionProps {
  settings: SiteSettingsData
  practiceAreas: PracticeAreaData[]
  selectedPracticeAreaName?: string
}

export function InquirySection({
  settings,
  practiceAreas,
  selectedPracticeAreaName,
}: InquirySectionProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [practiceAreaId, setPracticeAreaId] = useState(
    selectedPracticeAreaName || practiceAreas[0]?.name || '',
  )
  const [preferredDate, setPreferredDate] = useState('')
  const [sessionSlot, setSessionSlot] = useState<'pagi' | 'siang' | 'sore'>('pagi')
  const [method, setMethod] = useState<'tatap-muka' | 'daring'>('tatap-muka')
  const [summary, setSummary] = useState('')
  const [consent, setConsent] = useState(false)
  const [websiteHoneypot, setWebsiteHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('turnstile-client-token')

  const [mapLoaded, setMapLoaded] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const activePracticeArea = selectedPracticeAreaName || practiceAreaId

  const directWaUrl = waLink(
    settings.whatsappNumber,
    `${settings.defaultWaMessage} (Bidang: ${activePracticeArea || 'Umum'})`,
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFieldErrors({})
    setServerError(null)

    const payload = {
      name,
      email,
      phone,
      practiceAreaId: activePracticeArea,
      preferredDate,
      sessionSlot,
      method,
      summary,
      consent: consent as true,
      website: websiteHoneypot,
      turnstileToken,
    }

    const parsed = InquiryBodySchema.safeParse(payload)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message
        }
      }
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null
        setServerError(
          errBody?.error ??
            'Terjadi kesalahan saat mengirim permohonan. Silakan coba lagi atau lanjut lewat WhatsApp.',
        )
        return
      }

      // DESIGN.md Section 9 #10 & FR-7.5: Only show success modal after server confirms 201 saved
      setShowSuccessModal(true)
      setName('')
      setEmail('')
      setPhone('')
      setSummary('')
      setConsent(false)
    } catch {
      setServerError(
        'Gagal terhubung ke server. Silakan coba lagi atau hubungi kami langsung lewat WhatsApp.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="janji-temu"
      className="section-gap section-surface"
      aria-labelledby="inquiry-heading"
    >
      <div className="container">
        <div>
          <h2 id="inquiry-heading">Permohonan Janji Temu &amp; Kontak Kantor</h2>
          <p className="section-subtitle">
            Jadwalkan konsultasi tatap muka di Gedung Mandira Menteng maupun secara daring.
          </p>
        </div>

        <div className="docket-booking-grid">
          {/* Left Column: Official Address, Lazy Map, and Direct WhatsApp (FR-1.4, FR-7.7, DESIGN.md 6.9) */}
          <div className="docket-info-card">
            <h3>Kantor Pusat Menteng</h3>
            <p className="office-address-text">{settings.address}</p>

            {/* FR-7.7: Lazy-loaded Google Maps embed after user interaction, with "Buka di Maps" fallback */}
            <div className="map-frame-box">
              {mapLoaded ? (
                <iframe
                  title={`Peta Lokasi Resmi ${OFFICIAL_FIRM_NAME}`}
                  src={settings.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="map-lazy-placeholder">
                  <p>Peta lokasi Gedung Mandira, Menteng, Jakarta Pusat</p>
                  <div className="map-lazy-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setMapLoaded(true)}
                    >
                      Muat Peta Interaktif
                    </button>
                    <a
                      href={settings.mapsDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-gold"
                    >
                      Buka di Maps &rarr;
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="map-external-row">
              <a
                href={settings.mapsDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-gold"
              >
                Buka di Google Maps &rarr;
              </a>
            </div>

            <div className="hotline-box">
              <div className="hotline-label">Hotline Konsultasi WhatsApp</div>
              <div className="hotline-number">{settings.whatsappDisplay}</div>
            </div>

            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold full-width-btn"
            >
              Kirim via WhatsApp Langsung &rarr;
            </a>
          </div>

          {/* Right Column: Validated Consultation Form (FR-7.1 - FR-7.6, SEC-005, SEC-006, SEC-014) */}
          <div className="docket-panel-form">
            {/* FR-7.6 & SEC-014: Mandatory confidentiality warning */}
            <div className="confidential-warning-banner" role="note">
              <strong>Peringatan Kerahasiaan:</strong> Jangan menuliskan data rahasia atau dokumen
              perkara di sini. Uraikan pokok permasalahan secara umum untuk keperluan penjadwalan
              awal.
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot anti-spam field (FR-7.3) */}
              <div className="sr-only-honeypot" aria-hidden="true">
                <label htmlFor="websiteField">Jangan diisi</label>
                <input
                  id="websiteField"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteHoneypot}
                  onChange={(e) => setWebsiteHoneypot(e.target.value)}
                />
              </div>

              <div className="form-row-duo">
                <div className="form-group">
                  <label htmlFor="clientName" className="form-label">
                    Nama Lengkap / Instansi
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    className="form-input"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? 'err-name' : undefined}
                    placeholder="Nama Lengkap atau Badan Usaha"
                  />
                  {fieldErrors.name ? (
                    <span id="err-name" className="form-field-error" role="alert">
                      {fieldErrors.name}
                    </span>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="clientEmail" className="form-label">
                    Alamat Email
                  </label>
                  <input
                    id="clientEmail"
                    type="email"
                    className="form-input"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                    placeholder="nama@perusahaan.com"
                  />
                  {fieldErrors.email ? (
                    <span id="err-email" className="form-field-error" role="alert">
                      {fieldErrors.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="form-row-duo">
                <div className="form-group">
                  <label htmlFor="clientPhone" className="form-label">
                    Nomor WhatsApp
                  </label>
                  <input
                    id="clientPhone"
                    type="tel"
                    className="form-input"
                    required
                    maxLength={16}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? 'err-phone' : undefined}
                    placeholder="+62812xxxxxxxx"
                  />
                  {fieldErrors.phone ? (
                    <span id="err-phone" className="form-field-error" role="alert">
                      {fieldErrors.phone}
                    </span>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="serviceCategory" className="form-label">
                    Bidang Hukum
                  </label>
                  {/* DESIGN.md Section 8: Single source of truth for 10 practice areas */}
                  <select
                    id="serviceCategory"
                    className="form-select"
                    required
                    value={activePracticeArea}
                    onChange={(e) => setPracticeAreaId(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.practiceAreaId)}
                    aria-describedby={fieldErrors.practiceAreaId ? 'err-practice' : undefined}
                  >
                    {practiceAreas.map((area) => (
                      <option key={area.id} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.practiceAreaId ? (
                    <span id="err-practice" className="form-field-error" role="alert">
                      {fieldErrors.practiceAreaId}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="form-row-duo">
                <div className="form-group">
                  <label htmlFor="meetingDate" className="form-label">
                    Pilihan Tanggal
                  </label>
                  <input
                    id="meetingDate"
                    type="date"
                    className="form-input"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.preferredDate)}
                    aria-describedby={fieldErrors.preferredDate ? 'err-date' : undefined}
                  />
                  {fieldErrors.preferredDate ? (
                    <span id="err-date" className="form-field-error" role="alert">
                      {fieldErrors.preferredDate}
                    </span>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="meetingSession" className="form-label">
                    Waktu Pertemuan
                  </label>
                  <select
                    id="meetingSession"
                    className="form-select"
                    required
                    value={sessionSlot}
                    onChange={(e) => setSessionSlot(e.target.value as 'pagi' | 'siang' | 'sore')}
                  >
                    <option value="pagi">{settings.officeHours.pagi}</option>
                    <option value="siang">{settings.officeHours.siang}</option>
                    <option value="sore">{settings.officeHours.sore}</option>
                  </select>
                </div>
              </div>

              <fieldset className="form-group form-fieldset">
                <legend className="form-label">Metode Pertemuan</legend>
                <div className="radio-group-row">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="meetingMethod"
                      value="tatap-muka"
                      checked={method === 'tatap-muka'}
                      onChange={() => setMethod('tatap-muka')}
                    />
                    Tatap Muka di Gedung Mandira Menteng
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="meetingMethod"
                      value="daring"
                      checked={method === 'daring'}
                      onChange={() => setMethod('daring')}
                    />
                    Konsultasi Daring (Video Conference)
                  </label>
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="issueDetails" className="form-label">
                  Uraian Singkat Kebutuhan Hukum (Maks. 1000 Karakter)
                </label>
                <textarea
                  id="issueDetails"
                  className="form-textarea"
                  rows={4}
                  required
                  minLength={10}
                  maxLength={1000}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.summary)}
                  aria-describedby={fieldErrors.summary ? 'err-summary' : undefined}
                  placeholder="Tuliskan gambaran umum kebutuhan konsultasi Anda tanpa menyertakan informasi rahasia..."
                />
                {fieldErrors.summary ? (
                  <span id="err-summary" className="form-field-error" role="alert">
                    {fieldErrors.summary}
                  </span>
                ) : null}
              </div>

              {/* SEC-014 & FR-7.1: Explicit Personal Data Consent Checkbox */}
              <div className="form-group">
                <label className="consent-checkbox-label">
                  <input
                    id="privacyConsent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-invalid={Boolean(fieldErrors.consent)}
                    aria-describedby={fieldErrors.consent ? 'err-consent' : undefined}
                  />
                  <span>
                    Saya menyetujui pemrosesan data pribadi yang saya isikan di atas oleh{' '}
                    <strong>{OFFICIAL_FIRM_NAME}</strong> untuk tujuan penjadwalan konsultasi
                    (disimpan maksimal 12 bulan) sesuai{' '}
                    <Link href="/kebijakan-privasi" className="link-gold">
                      Kebijakan Privasi
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.consent ? (
                  <span id="err-consent" className="form-field-error" role="alert">
                    {fieldErrors.consent}
                  </span>
                ) : null}
              </div>

              {/* FR-7.3: Cloudflare Turnstile anti-spam verification */}
              <div className="turnstile-container" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}>
                <input
                  type="hidden"
                  name="cf-turnstile-response"
                  value={turnstileToken}
                  onChange={(e) => setTurnstileToken(e.target.value)}
                />
              </div>

              {serverError ? (
                <div className="server-error-box" role="alert">
                  <p>{serverError}</p>
                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-gold"
                  >
                    Lanjutkan lewat WhatsApp &rarr;
                  </a>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-gold full-width-btn"
                disabled={submitting}
              >
                {submitting ? 'Mengirim...' : 'Kirim Permohonan Janji Temu \u2192'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Honest Confirmation Modal (FR-7.5 & DESIGN.md Section 9 #10) */}
      {showSuccessModal ? (
        <div
          className="modal-overlay is-active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSuccessModal(false)
          }}
        >
          <div
            className="modal-dialog-box success-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
          >
            <img
              src="/logo-seal-transparent.png"
              alt={`Logo ${OFFICIAL_FIRM_NAME}`}
              width={56}
              height={56}
              className="success-modal-logo"
            />
            <h3 id="success-modal-title">Permohonan Janji Temu Diterima</h3>
            <p className="success-modal-text">
              Terima kasih. Permohonan janji temu Anda telah tersimpan di sistem{' '}
              <strong>{SHORT_BRAND_NAME}</strong>. Tim kami akan menghubungi Anda melalui email atau
              WhatsApp untuk konfirmasi jadwal.
            </p>
            <div className="success-modal-actions">
              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold full-width-btn"
              >
                Lanjutkan via WhatsApp &rarr;
              </a>
              <button
                type="button"
                className="btn-outline full-width-btn"
                onClick={() => setShowSuccessModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
