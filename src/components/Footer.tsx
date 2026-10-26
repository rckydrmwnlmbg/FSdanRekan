'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { SiteSettingsData } from '@/lib/content'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface FooterProps {
  settings: SiteSettingsData
}

export function Footer({ settings }: FooterProps) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const floatingBtnRef = useRef<HTMLButtonElement | null>(null)
  const menuCardRef = useRef<HTMLDivElement | null>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!disclaimerOpen) return
    closeBtnRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDisclaimerOpen(false)
        triggerBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disclaimerOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        floatingBtnRef.current?.focus()
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (
        menuCardRef.current &&
        !menuCardRef.current.contains(e.target as Node) &&
        floatingBtnRef.current &&
        !floatingBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [menuOpen])

  const floatingWaUrl = waLink(
    settings.whatsappNumber,
    `${settings.defaultWaMessage} (Sumber: Website Resmi ${OFFICIAL_FIRM_NAME})`,
  )

  const handleScrollToAppointment = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById('janji-temu')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      const firstInput = target.querySelector<HTMLInputElement | HTMLSelectElement>(
        'input:not([type="hidden"]), select, textarea',
      )
      firstInput?.focus()
    } else {
      window.location.href = '/#janji-temu'
    }
  }

  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top-row">
            <div className="footer-brand">
              <img
                src="/logo-seal-transparent.png"
                alt={`Logo ${OFFICIAL_FIRM_NAME}`}
                width={44}
                height={44}
                className="brand-logo-img"
              />
              <div>
                <div className="footer-firm-name">{OFFICIAL_FIRM_NAME}</div>
                <div className="footer-brand-short">{SHORT_BRAND_NAME}</div>
              </div>
            </div>
            <div className="footer-address-block">{settings.address}</div>
          </div>

          <div className="footer-bottom-row">
            <div>
              &copy; {currentYear} {OFFICIAL_FIRM_NAME}. Hak Cipta Dilindungi Undang-Undang.
            </div>
            <div className="footer-links-row">
              <Link href="/kebijakan-privasi" className="footer-link">
                Kebijakan Privasi
              </Link>
              <button
                ref={triggerBtnRef}
                type="button"
                className="footer-disclaimer-btn"
                onClick={() => setDisclaimerOpen(true)}
              >
                Kebijakan Kerahasiaan &amp; Disclaimer
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Smart Speed-Dial Floating Menu (Solusi 1: Terpadu WhatsApp & Form Janji Temu) */}
      {menuOpen && (
        <div
          id="cta-speed-dial-panel"
          ref={menuCardRef}
          className="speed-dial-card"
          role="dialog"
          aria-label="Pilihan Jalur Konsultasi Hukum"
        >
          <div className="speed-dial-header">
            <div>
              <div className="speed-dial-title">Konsultasi Hukum</div>
              <div className="speed-dial-sub">{SHORT_BRAND_NAME} &middot; Respons Cepat</div>
            </div>
            <button
              type="button"
              className="speed-dial-close"
              aria-label="Tutup menu konsultasi"
              onClick={() => {
                setMenuOpen(false)
                floatingBtnRef.current?.focus()
              }}
            >
              &times;
            </button>
          </div>

          <div className="speed-dial-options">
            {/* Opsi 1: WhatsApp Langsung */}
            <a
              href={floatingWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="speed-dial-item speed-dial-item-wa"
              onClick={() => setMenuOpen(false)}
            >
              <div className="speed-dial-icon-badge wa-badge" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className="speed-dial-item-content">
                <div className="speed-dial-item-title">
                  <span>Chat WhatsApp Resmi</span>
                  <span className="speed-dial-badge-tag">Langsung ↗</span>
                </div>
                <div className="speed-dial-item-desc">
                  Hotline respon cepat untuk perkara dan kebutuhan mendesak
                </div>
              </div>
            </a>

            {/* Opsi 2: Formulir Janji Temu */}
            <a
              href="#janji-temu"
              className="speed-dial-item speed-dial-item-form"
              onClick={handleScrollToAppointment}
            >
              <div className="speed-dial-icon-badge form-badge" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="speed-dial-item-content">
                <div className="speed-dial-item-title">
                  <span>Formulir Janji Temu</span>
                  <span className="speed-dial-badge-tag gold-tag">Di Web ↓</span>
                </div>
                <div className="speed-dial-item-desc">
                  Pilih tanggal, sesi waktu, dan konsultasi tatap muka/daring
                </div>
              </div>
            </a>
          </div>

          <div className="speed-dial-footer-note">
            Kerahasiaan komunikasi terjamin sesuai UU PDP &amp; Kode Etik Advokat.
          </div>
        </div>
      )}

      {/* Floating Trigger Button: single clean button */}
      <button
        ref={floatingBtnRef}
        type="button"
        className={`wa-floating-trigger ${menuOpen ? 'is-active-trigger' : ''}`}
        aria-label={
          menuOpen
            ? 'Tutup Pilihan Konsultasi'
            : 'Buka Pilihan Konsultasi (WhatsApp atau Formulir Janji Temu)'
        }
        aria-expanded={menuOpen}
        aria-controls="cta-speed-dial-panel"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {menuOpen ? (
          <span style={{ fontSize: '24px', lineHeight: 1, fontWeight: 300 }} aria-hidden="true">
            &times;
          </span>
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* DESIGN.md Section 6.10: Accessible Disclaimer Modal */}
      {disclaimerOpen ? (
        <div
          className="modal-overlay is-active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDisclaimerOpen(false)
              triggerBtnRef.current?.focus()
            }
          }}
        >
          <div
            className="modal-dialog-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-modal-title"
          >
            <button
              ref={closeBtnRef}
              type="button"
              className="modal-close-trigger"
              aria-label="Tutup Jendela Disclaimer"
              onClick={() => {
                setDisclaimerOpen(false)
                triggerBtnRef.current?.focus()
              }}
            >
              &times;
            </button>
            <h3 id="disclaimer-modal-title" className="modal-heading">
              Kebijakan Kerahasiaan &amp; Disclaimer
            </h3>
            <p className="modal-body-p">
              Informasi yang disajikan pada website <strong>{OFFICIAL_FIRM_NAME}</strong> disiapkan
              hanya untuk tujuan informasi umum dan bukan merupakan nasihat hukum formal (
              <em>legal advice</em>). Hubungan advokat dan klien (<em>attorney-client relationship</em>
              ) baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan
              Perjanjian Jasa Hukum secara resmi.
            </p>
            <p className="modal-body-p">
              <strong>{OFFICIAL_FIRM_NAME}</strong> berkomitmen menjaga kerahasiaan data yang
              dikirimkan melalui situs ini sesuai Kode Etik Advokat Indonesia dan Undang-Undang
              Pelindungan Data Pribadi (UU No. 27 Tahun 2022). Baca selengkapnya di halaman{' '}
              <Link href="/kebijakan-privasi" className="link-gold">
                Kebijakan Privasi
              </Link>
              .
            </p>
            <button
              type="button"
              className="btn-gold full-width-btn"
              onClick={() => {
                setDisclaimerOpen(false)
                triggerBtnRef.current?.focus()
              }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
