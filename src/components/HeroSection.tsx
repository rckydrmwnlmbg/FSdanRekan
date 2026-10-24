import React from 'react'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface HeroSectionProps {
  whatsappNumber: string
  defaultWaMessage: string
}

export function HeroSection({ whatsappNumber, defaultWaMessage }: HeroSectionProps) {
  const heroWaUrl = waLink(
    whatsappNumber,
    `${defaultWaMessage} (Halaman: Beranda ${OFFICIAL_FIRM_NAME})`,
  )

  return (
    <section id="beranda" className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-background-art">
        <img
          src="/images/hero-bg.webp"
          alt={`Ruang Sidang dan Advokasi Hukum ${OFFICIAL_FIRM_NAME}`}
          width={1376}
          height={768}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="hero-overlay-scrim" aria-hidden="true" />

      <div className="container hero-content-wrap">
        <div className="hero-main-grid">
          <div>
            <h1 id="hero-heading" className="hero-title reveal-1">
              Keahlian Litigasi.
              <br />
              <span className="gold-text">Integritas Tanpa Kompromi.</span>
            </h1>
          </div>

          <div>
            <p className="lead-statement reveal-2">
              <strong>{OFFICIAL_FIRM_NAME}</strong> mengombinasikan analisis yuridis mendalam
              dengan strategi persidangan dan pendampingan hukum yang presisi untuk melindungi
              kepentingan klien individu maupun korporasi.
            </p>
            <div className="hero-actions-row reveal-3">
              <a href="#janji-temu" className="btn-gold">
                Jadwalkan Konsultasi &rarr;
              </a>
              <a href="#keahlian" className="btn-outline">
                10 Bidang Praktik &darr;
              </a>
              <a
                href={heroWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-gold"
              >
                Kontak WhatsApp &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
