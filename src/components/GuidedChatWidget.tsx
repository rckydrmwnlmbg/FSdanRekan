'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PracticeAreaData, SiteSettingsData } from '@/lib/content'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface GuidedChatWidgetProps {
  settings: SiteSettingsData
  practiceAreas: PracticeAreaData[]
}

/**
 * SK-11 & SEC-015 (Phase 2):
 * Scripted Guided Chat Widget (consent -> visitor name & phone -> practice area -> schedule -> pre-filled WhatsApp).
 * Strictly no free-form automated legal answers (SEC-015).
 */
export function GuidedChatWidget({ settings, practiceAreas }: GuidedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [practiceArea, setPracticeArea] = useState(practiceAreas[0]?.name ?? '')
  const [preferredSchedule, setPreferredSchedule] = useState(settings.officeHours.pagi)
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completedWaUrl, setCompletedWaUrl] = useState<string | null>(null)

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    closeBtnRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const handleGuidedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!consent) {
      setErrorMsg('Anda wajib menyetujui pemrosesan data pribadi terlebih dahulu.')
      return
    }
    if (visitorName.trim().length < 2) {
      setErrorMsg('Nama lengkap minimal 2 karakter.')
      return
    }
    if (!/^\+?[0-9\s-]{8,16}$/.test(visitorPhone.trim())) {
      setErrorMsg('Nomor WhatsApp harus berupa 8–16 digit angka.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim(),
          practiceArea,
          preferredSchedule,
          notes: notes.trim() || undefined,
          consent: true,
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        waUrl?: string
        error?: string
      } | null

      if (!res.ok || !data?.waUrl) {
        const fallbackWa = waLink(
          settings.whatsappNumber,
          `Halo FS dan Rekan, saya ${visitorName.trim()} ingin menjadwalkan konsultasi bidang ${practiceArea} pada sesi ${preferredSchedule}.`,
        )
        setCompletedWaUrl(fallbackWa)
        return
      }

      setCompletedWaUrl(data.waUrl)
    } catch {
      const fallbackWa = waLink(
        settings.whatsappNumber,
        `Halo FS dan Rekan, saya ${visitorName.trim()} ingin menjadwalkan konsultasi bidang ${practiceArea} pada sesi ${preferredSchedule}.`,
      )
      setCompletedWaUrl(fallbackWa)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="guided-chat-root">
      <button
        ref={triggerBtnRef}
        type="button"
        className="guided-chat-trigger"
        aria-expanded={isOpen}
        aria-controls="guided-chat-panel"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Asisten Jadwal
      </button>

      {isOpen ? (
        <div
          id="guided-chat-panel"
          className="guided-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="guided-chat-title"
        >
          <div className="guided-chat-header">
            <div>
              <div className="guided-chat-title" id="guided-chat-title">
                Asisten Pemandu {SHORT_BRAND_NAME}
              </div>
              <div className="guided-chat-sub">Panduan Cepat Konsultasi WhatsApp</div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="guided-chat-close"
              aria-label="Tutup Asisten Pemandu"
              onClick={() => {
                setIsOpen(false)
                triggerBtnRef.current?.focus()
              }}
            >
              &times;
            </button>
          </div>

          {/* SEC-015 Mandatory AI/Bot Disclaimer */}
          <div className="guided-chat-disclaimer" role="note">
            <strong>Pemberitahuan (SEC-015):</strong> Asisten ini hanya membantu penjadwalan dan
            tidak memberikan nasihat hukum. Jangan mengirimkan informasi rahasia perkara di sini.
          </div>

          {completedWaUrl ? (
            <div className="guided-chat-body">
              <div className="guided-chat-bot-bubble">
                Terima kasih, <strong>{visitorName}</strong>. Ringkasan jadwal konsultasi bidang{' '}
                <strong>{practiceArea}</strong> ({preferredSchedule}) telah siap. Silakan klik
                tombol di bawah untuk membuka WhatsApp dengan pesan yang sudah terisi otomatis:
              </div>
              <a
                href={completedWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold full-width-btn"
              >
                Buka WhatsApp Sekarang &rarr;
              </a>
              <button
                type="button"
                className="btn-outline full-width-btn"
                style={{ marginTop: '10px' }}
                onClick={() => {
                  setCompletedWaUrl(null)
                  setNotes('')
                }}
              >
                Ubah Pilihan Jadwal
              </button>
            </div>
          ) : (
            <form className="guided-chat-body" onSubmit={handleGuidedSubmit} noValidate>
              <div className="guided-chat-bot-bubble">
                Selamat datang di <strong>{OFFICIAL_FIRM_NAME}</strong>. Lengkapi 3 langkah singkat
                berikut untuk menyiapkan pesan konsultasi WhatsApp Anda:
              </div>

              <div className="form-group">
                <label htmlFor="chatVisitorName" className="form-label">
                  1. Nama Lengkap / Perusahaan
                </label>
                <input
                  id="chatVisitorName"
                  type="text"
                  className="form-input"
                  maxLength={100}
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Nama Anda"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chatVisitorPhone" className="form-label">
                  Nomor WhatsApp Aktif
                </label>
                <input
                  id="chatVisitorPhone"
                  type="tel"
                  className="form-input"
                  maxLength={16}
                  required
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="+62812xxxxxxxx"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chatPracticeArea" className="form-label">
                  2. Pilih Bidang Layanan Hukum
                </label>
                <select
                  id="chatPracticeArea"
                  className="form-select"
                  value={practiceArea}
                  onChange={(e) => setPracticeArea(e.target.value)}
                >
                  {practiceAreas.map((area) => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="chatPreferredSchedule" className="form-label">
                  3. Pilih Sesi Konsultasi
                </label>
                <select
                  id="chatPreferredSchedule"
                  className="form-select"
                  value={preferredSchedule}
                  onChange={(e) => setPreferredSchedule(e.target.value)}
                >
                  <option value={settings.officeHours.pagi}>{settings.officeHours.pagi}</option>
                  <option value={settings.officeHours.siang}>{settings.officeHours.siang}</option>
                  <option value={settings.officeHours.sore}>{settings.officeHours.sore}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="chatNotes" className="form-label">
                  Pokok Kebutuhan Singkat (Opsional, Maks. 300 Karakter)
                </label>
                <input
                  id="chatNotes"
                  type="text"
                  className="form-input"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Peninjauan draf kontrak kerja sama"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chatConsent" className="consent-checkbox-label">
                  <input
                    id="chatConsent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    Saya menyetujui pemrosesan data di atas untuk penjadwalan sesuai{' '}
                    <Link href="/kebijakan-privasi" className="link-gold">
                      Kebijakan Privasi
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {errorMsg ? (
                <div className="form-field-error" role="alert" style={{ marginBottom: '10px' }}>
                  {errorMsg}
                </div>
              ) : null}

              <button type="submit" className="btn-gold full-width-btn" disabled={submitting}>
                {submitting ? 'Menyiapkan...' : 'Siapkan Pesan WhatsApp \u2192'}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
