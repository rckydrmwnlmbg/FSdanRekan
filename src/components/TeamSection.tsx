'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { TeamMemberData } from '@/lib/content'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'

interface TeamSectionProps {
  members: TeamMemberData[]
  activeProfile: TeamMemberData | null
  onSelectProfile: (member: TeamMemberData | null) => void
  lastTriggerRef: React.MutableRefObject<HTMLButtonElement | null>
}

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function TeamSection({
  members,
  activeProfile,
  onSelectProfile,
  lastTriggerRef,
}: TeamSectionProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!activeProfile) return
    closeButtonRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onSelectProfile(null)
        lastTriggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeProfile, onSelectProfile, lastTriggerRef])

  const closeModal = () => {
    onSelectProfile(null)
    lastTriggerRef.current?.focus()
  }

  return (
    <section
      id="tim-advokat"
      className="section-gap section-surface"
      aria-labelledby="team-heading"
    >
      <div className="container">
        <div>
          <h2 id="team-heading">Tim Kami</h2>
          <p className="section-subtitle">
            Sinergi pendiri, advokat, dan administrator hukum di {OFFICIAL_FIRM_NAME}.
          </p>
        </div>

        <div className="team-grid-5">
          {members.map((member) => {
            const hasPhotoError = Boolean(failedPhotos[member.slug]) || !member.photo?.url

            return (
              <article key={member.id} className="team-card">
                <div className="team-card-photo">
                  {hasPhotoError ? (
                    /* PRD Section 8 & DESIGN.md 6.6: Monogram placeholder if photo is missing */
                    <div
                      className="team-monogram-placeholder"
                      role="img"
                      aria-label={member.photo?.alt ?? `Foto ${member.fullName}`}
                    >
                      <span>{getInitials(member.fullName)}</span>
                    </div>
                  ) : (
                    <img
                      src={member.photo.url}
                      srcSet={member.photo.srcSet}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      alt={member.photo.alt}
                      width={member.photo.width}
                      height={member.photo.height}
                      loading="lazy"
                      decoding="async"
                      onError={() =>
                        setFailedPhotos((prev) => ({ ...prev, [member.slug]: true }))
                      }
                    />
                  )}
                  <div className="team-card-overlay" aria-hidden="true" />
                </div>

                <div className="team-card-body">
                  <div>
                    <h3 className="team-name">{member.displayName}</h3>
                    <div className="team-role">{member.roleTitle}</div>
                    <p className="team-short-bio">{member.shortBio}</p>
                  </div>

                  {/* FR-3.2 & DESIGN.md Section 6.6: Button is "Selengkapnya" and opens accessible dialog */}
                  <button
                    type="button"
                    className="link-gold"
                    aria-haspopup="dialog"
                    onClick={(e) => {
                      lastTriggerRef.current = e.currentTarget
                      onSelectProfile(member)
                    }}
                  >
                    Selengkapnya &rarr;
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Accessible Bio Dialog Modal (FR-3.2, FR-3.3, FR-3.4, DESIGN.md Section 6.6) */}
      {activeProfile ? (
        <div
          className="modal-overlay is-active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal()
            }
          }}
        >
          <div
            className="modal-dialog-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`dialog-title-${activeProfile.slug}`}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="modal-close-trigger"
              aria-label="Tutup Panel Profil"
              onClick={closeModal}
            >
              &times;
            </button>

            <div className="bio-modal-layout">
              <div className="bio-modal-aside">
                <div className="bio-modal-photo-box">
                  <img
                    src={activeProfile.photo.url}
                    alt={activeProfile.photo.alt}
                    width={activeProfile.photo.width}
                    height={activeProfile.photo.height}
                  />
                </div>
                <div className="bio-modal-role">{activeProfile.roleTitle}</div>
                <div className="bio-modal-firm">{OFFICIAL_FIRM_NAME}</div>
              </div>

              <div className="bio-modal-main">
                <h3 id={`dialog-title-${activeProfile.slug}`} className="bio-modal-name">
                  {activeProfile.displayName}
                </h3>

                {activeProfile.tags.length > 0 ? (
                  <div className="bio-tags-row" aria-label="Bidang Keahlian">
                    {activeProfile.tags.map((tag) => (
                      <span key={tag} className="bio-tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="bio-full-text">
                  {activeProfile.fullBio.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="bio-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {activeProfile.education.length > 0 ? (
                  <div className="bio-meta-section">
                    <div className="bio-meta-heading">Pendidikan</div>
                    <ul className="bio-meta-list">
                      {activeProfile.education.map((edu) => (
                        <li key={edu}>{edu}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {activeProfile.credentials.length > 0 ? (
                  <div className="bio-meta-section">
                    <div className="bio-meta-heading">Kredensial</div>
                    <ul className="bio-meta-list">
                      {activeProfile.credentials.map((cred) => (
                        <li key={cred}>{cred}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {activeProfile.languages.length > 0 ? (
                  <div className="bio-meta-section">
                    <div className="bio-meta-heading">Bahasa</div>
                    <ul className="bio-meta-list">
                      {activeProfile.languages.map((lang) => (
                        <li key={lang}>{lang}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="bio-modal-actions">
                  <a href="#janji-temu" onClick={closeModal} className="btn-gold">
                    Jadwalkan Janji Temu &rarr;
                  </a>
                  <Link
                    href={`/tim/${activeProfile.slug}`}
                    onClick={closeModal}
                    className="btn-outline"
                  >
                    Halaman Profil Lengkap &rarr;
                  </Link>
                  <button type="button" onClick={closeModal} className="btn-outline">
                    Tutup Profil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
