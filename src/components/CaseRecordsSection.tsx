'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { PublicCaseRecord, CaseDocumentationPhoto } from '@/lib/content'

interface CaseRecordsSectionProps {
  records: PublicCaseRecord[]
}

/**
 * SK-14 / PRD V4: Anonymous by default case track record with interactive multi-photo gallery.
 * Displays documentation photos, caseType, and region (never win/loss status, year, case value, or unconsented clientName).
 */
export function CaseRecordsSection({ records }: CaseRecordsSectionProps) {
  const [activeRecord, setActiveRecord] = useState<PublicCaseRecord | null>(null)
  const [photoIndex, setPhotoIndex] = useState<number>(0)
  const lastTriggerRef = useRef<HTMLElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  const openGallery = (record: PublicCaseRecord, triggerEl?: HTMLElement) => {
    if (triggerEl) {
      lastTriggerRef.current = triggerEl
    }
    setActiveRecord(record)
    setPhotoIndex(0)
  }

  const closeGallery = useCallback(() => {
    setActiveRecord(null)
    setPhotoIndex(0)
    if (lastTriggerRef.current) {
      lastTriggerRef.current.focus()
    }
  }, [])

  const currentPhotos: CaseDocumentationPhoto[] = activeRecord
    ? activeRecord.photos && activeRecord.photos.length > 0
      ? activeRecord.photos
      : [
          {
            url: activeRecord.imageUrl ?? '/images/hero-slide-courtroom.webp',
            caption: `Dokumentasi penanganan perkara ${activeRecord.caseType} wilayah ${activeRecord.region}`,
            alt: activeRecord.imageAlt ?? `Dokumentasi perkara ${activeRecord.caseType}`,
          },
        ]
    : []

  const nextPhoto = useCallback(() => {
    if (currentPhotos.length <= 1) return
    setPhotoIndex((prev) => (prev + 1) % currentPhotos.length)
  }, [currentPhotos.length])

  const prevPhoto = useCallback(() => {
    if (currentPhotos.length <= 1) return
    setPhotoIndex((prev) => (prev - 1 + currentPhotos.length) % currentPhotos.length)
  }, [currentPhotos.length])

  // Manage body scroll lock and keyboard navigation
  useEffect(() => {
    if (!activeRecord) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (closeBtnRef.current) {
      closeBtnRef.current.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeGallery()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextPhoto()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeRecord, closeGallery, nextPhoto, prevPhoto])

  if (records.length === 0) return null

  const activePhoto = currentPhotos[photoIndex] ?? null

  return (
    <section
      id="rekam-jejak"
      className="section-gap"
      aria-labelledby="case-records-heading"
    >
      <div className="container">
        <div>
          <div className="eyebrow-tag">PORTOFOLIO PENANGANAN PERKARA</div>
          <h2 id="case-records-heading">Pengalaman Penanganan Perkara</h2>
          <p className="section-subtitle">
            Dokumentasi dan ringkasan bidang perkara serta wilayah yurisdiksi penanganan
            untuk menjaga kewajiban kerahasiaan advokat serta kepentingan hukum para pihak.
            Klik salah satu perkara untuk melihat galeri foto dokumentasi lengkap.
          </p>
        </div>

        <div className="case-records-grid">
          {records.map((rec) => {
            const photoList = rec.photos && rec.photos.length > 0 ? rec.photos : [
              {
                url: rec.imageUrl ?? '/images/hero-slide-courtroom.webp',
                caption: '',
                alt: rec.imageAlt ?? '',
              }
            ]
            const thumbPhoto = photoList[0]
            const photoCount = photoList.length

            return (
              <article
                key={rec.id}
                className="case-record-card"
                onClick={(e) => openGallery(rec, e.currentTarget)}
              >
                <div className="case-record-thumb-wrap">
                  <img
                    src={thumbPhoto?.url ?? '/images/hero-slide-courtroom.webp'}
                    alt={
                      thumbPhoto?.alt ||
                      rec.imageAlt ||
                      `Dokumentasi penanganan perkara ${rec.caseType} di wilayah ${rec.region}`
                    }
                    className="case-record-thumb-img"
                    width={400}
                    height={225}
                    loading="lazy"
                  />
                  <div className="case-record-thumb-overlay" aria-hidden="true" />
                  <span className="case-record-region-badge">{rec.region}</span>

                  <span className="case-record-photo-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>{photoCount} Foto</span>
                  </span>
                </div>
                <div className="case-record-content">
                  <div className="case-record-type">{rec.caseType}</div>
                  {rec.displayMode === 'named' && rec.clientName ? (
                    <div className="case-record-client">{rec.clientName}</div>
                  ) : null}
                  <button
                    type="button"
                    className="case-record-hint link-gold"
                    aria-haspopup="dialog"
                    onClick={(e) => {
                      e.stopPropagation()
                      openGallery(rec, e.currentTarget)
                    }}
                  >
                    Buka Dokumentasi ({photoCount} foto) &rarr;
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Interactive Multi-Photo Gallery Modal */}
      {activeRecord && activePhoto && (
        <div
          className="modal-overlay is-active case-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGallery()
          }}
        >
          <div
            className="modal-dialog-box case-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-modal-title"
          >
            {/* Header */}
            <div className="case-modal-header">
              <div>
                <span className="case-modal-eyebrow">PORTOFOLIO DOKUMENTASI</span>
                <h3 id="case-modal-title" className="case-modal-title">
                  {activeRecord.caseType}
                </h3>
                <span className="case-modal-region-tag">
                  📍 Wilayah Yurisdiksi: {activeRecord.region}
                </span>
              </div>
              <button
                type="button"
                ref={closeBtnRef}
                className="case-modal-close-btn"
                aria-label="Tutup Galeri Dokumentasi Perkara"
                onClick={closeGallery}
              >
                &times;
              </button>
            </div>

            {/* Main Photo Stage */}
            <div className="case-modal-viewer">
              <img
                src={activePhoto.url}
                alt={activePhoto.alt || `Foto dokumentasi perkara ${activeRecord.caseType}`}
                className="case-modal-main-img"
              />

              {currentPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="case-modal-nav-btn prev"
                    aria-label="Foto Sebelumnya"
                    onClick={prevPhoto}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="case-modal-nav-btn next"
                    aria-label="Foto Berikutnya"
                    onClick={nextPhoto}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <div className="case-modal-counter-pill" aria-live="polite">
                    <span>Dokumentasi {photoIndex + 1} dari {currentPhotos.length}</span>
                  </div>
                </>
              )}
            </div>

            {/* Caption */}
            {activePhoto.caption && (
              <div className="case-modal-caption-bar">
                <div className="case-modal-caption-label">TAHAPAN PENANGANAN &middot; DOKUMENTASI</div>
                <p className="case-modal-caption-text">{activePhoto.caption}</p>
              </div>
            )}

            {/* Thumbnail Strip */}
            {currentPhotos.length > 1 && (
              <div className="case-modal-thumbs-strip" role="tablist" aria-label="Daftar Foto Dokumentasi">
                {currentPhotos.map((photo, idx) => {
                  const isActive = idx === photoIndex
                  return (
                    <button
                      key={photo.url + idx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`case-modal-thumb-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => setPhotoIndex(idx)}
                      aria-label={`Pilih foto ${idx + 1}: ${photo.caption || photo.alt || 'Dokumentasi'}`}
                    >
                      <img
                        src={photo.url}
                        alt=""
                        width={96}
                        height={60}
                        className="case-modal-thumb-img"
                      />
                      <span className="case-modal-thumb-badge">{idx + 1}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Ethical Notice & Action CTA */}
            <div className="case-modal-footer">
              <div className="case-modal-ethical-note">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <div>
                  <strong>Kerahasiaan Advokat (SK-14):</strong> Dokumentasi ditampilkan semata untuk keperluan informasi bidang penanganan perkara. Identitas para pihak, nomor register perkara, dan berkas pembuktian dirahasiakan sepenuhnya.
                </div>
              </div>
              <div className="case-modal-actions-row">
                <a
                  href="#janji-temu"
                  className="btn-gold case-modal-cta-btn"
                  onClick={closeGallery}
                >
                  Konsultasikan Perkara Serupa &rarr;
                </a>
                <button
                  type="button"
                  className="btn-outline case-modal-cta-btn"
                  onClick={closeGallery}
                >
                  Tutup Galeri
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
