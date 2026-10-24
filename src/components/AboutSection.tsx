import React from 'react'
import Link from 'next/link'
import type { TeamMemberData } from '@/lib/content'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'

interface AboutSectionProps {
  founder: TeamMemberData
  onOpenFounderProfile?: (founder: TeamMemberData, triggerEl: HTMLButtonElement) => void
}

export function AboutSection({ founder, onOpenFounderProfile }: AboutSectionProps) {
  return (
    <section id="tentang" className="section-gap" aria-labelledby="about-heading">
      <div className="container">
        <div className="founder-editorial-grid">
          <div className="founder-portrait-mat">
            <div className="founder-photo-inner">
              <img
                src={founder.photo.url}
                srcSet={founder.photo.srcSet}
                sizes="(max-width: 768px) 100vw, 460px"
                alt={founder.photo.alt}
                width={founder.photo.width}
                height={founder.photo.height}
                loading="lazy"
                decoding="async"
              />
              <div className="founder-seal-tag">
                <div className="founder-seal-name">{founder.displayName}</div>
                <div className="founder-seal-role">{founder.roleTitle}</div>
              </div>
            </div>
          </div>

          <div>
            <h2 id="about-heading">Dedikasi Advokasi Berintegritas.</h2>

            {/* DESIGN.md Section 9 #4: Official motto from CONTENT_PROFILES.md instead of invented quote */}
            <blockquote className="quote-editorial-box">
              &ldquo;{founder.motto ?? 'Life must have meaning'}&rdquo;
            </blockquote>

            <p className="about-paragraph">
              Berangkat dari kepedulian terhadap akses masyarakat Indonesia terhadap layanan hukum
              yang berkualitas, <strong>{OFFICIAL_FIRM_NAME}</strong> didirikan dengan visi
              menghadirkan pendampingan hukum yang tepercaya, mudah diakses, dan profesional bagi
              individu, pelaku usaha, maupun masyarakat yang membutuhkan.
            </p>

            {/* DESIGN.md Section 9 #5: Factual, verifiable points without unverified encryption or superlative claims */}
            <div className="credentials-spec-grid">
              <div className="cred-box">
                <div className="cred-title">Pendekatan Berorientasi Solusi</div>
                <div className="cred-desc">
                  Menjunjung tinggi nilai integritas, profesionalisme, dan keadilan dalam setiap
                  tahapan pendampingan hukum.
                </div>
              </div>
              <div className="cred-box">
                <div className="cred-title">Komitmen Kerahasiaan Klien</div>
                <div className="cred-desc">
                  Menghormati kerahasiaan informasi klien sesuai Kode Etik Advokat dan ketentuan
                  pelindungan data pribadi yang berlaku.
                </div>
              </div>
            </div>

            <div className="hero-actions-row">
              {onOpenFounderProfile ? (
                <button
                  type="button"
                  className="btn-gold"
                  onClick={(e) => onOpenFounderProfile(founder, e.currentTarget)}
                >
                  Selengkapnya &rarr;
                </button>
              ) : null}
              <a href="#janji-temu" className="btn-outline">
                Konsultasi dengan Partner &rarr;
              </a>
              <Link href={`/tim/${founder.slug}`} className="link-gold">
                Halaman Profil Pendiri &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
