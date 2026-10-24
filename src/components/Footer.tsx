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
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
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

  const floatingWaUrl = waLink(
    settings.whatsappNumber,
    `${settings.defaultWaMessage} (Sumber: Website Resmi ${OFFICIAL_FIRM_NAME})`,
  )

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

      {/* FR-8.1 - FR-8.4 & DESIGN.md 6.11: Floating WhatsApp Action Button */}
      <a
        href={floatingWaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-floating-trigger"
        aria-label="Hubungi lewat WhatsApp"
      >
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
      </a>

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
