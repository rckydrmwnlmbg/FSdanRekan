'use client'

import React, { useRef, useState } from 'react'
import Link from 'next/link'
import type { PracticeAreaData } from '@/lib/content'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'

interface PracticeAreasSectionProps {
  areas: PracticeAreaData[]
  onSelectForForm?: (areaName: string) => void
}

export function PracticeAreasSection({ areas, onSelectForForm }: PracticeAreasSectionProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(areas[0]?.slug ?? '')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const activeArea = areas.find((a) => a.slug === selectedSlug) ?? areas[0]

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (areas.length === 0) return
    let nextIdx = index
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      nextIdx = (index + 1) % areas.length
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      nextIdx = (index - 1 + areas.length) % areas.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIdx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIdx = areas.length - 1
    } else {
      return
    }
    const targetArea = areas[nextIdx]
    if (targetArea) {
      setSelectedSlug(targetArea.slug)
      tabRefs.current[nextIdx]?.focus()
    }
  }

  if (!activeArea) return null

  return (
    <section
      id="keahlian"
      className="section-gap section-surface"
      aria-labelledby="practice-heading"
    >
      <div className="container">
        <div>
          <h2 id="practice-heading">10 Bidang Praktik Utama</h2>
          <p className="section-subtitle">
            Pilih salah satu bidang layanan di bawah untuk melihat ringkasan dan cakupan
            pendampingan hukum.
          </p>
        </div>

        {/* Desktop & Mobile Interactive Selector (FR-4.1, FR-4.2, DESIGN.md Section 6.4) */}
        <div className="practice-split-layout">
          <div
            className="practice-docket-list"
            role="tablist"
            aria-label="Daftar 10 Bidang Layanan Hukum"
            aria-orientation="vertical"
          >
            {areas.map((area, idx) => {
              const isSelected = area.slug === activeArea.slug
              const tabId = `tab-practice-${area.slug}`
              const panelId = `panel-practice-${area.slug}`

              return (
                <button
                  key={area.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={panelId}
                  tabIndex={isSelected ? 0 : -1}
                  className={`practice-row-item ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setSelectedSlug(area.slug)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                >
                  <span className="practice-row-title">{area.name}</span>
                  <span className="practice-row-badge">{area.label}</span>
                </button>
              )
            })}
          </div>

          <div
            id={`panel-practice-${activeArea.slug}`}
            role="tabpanel"
            aria-labelledby={`tab-practice-${activeArea.slug}`}
            tabIndex={0}
            className="practice-feature-stage"
          >
            <img
              src={activeArea.image ?? '/images/practice-corporate.webp'}
              alt={`Ilustrasi bidang layanan ${activeArea.name} — ${OFFICIAL_FIRM_NAME}`}
              className="practice-stage-bg"
              width={900}
              height={600}
              loading="lazy"
              decoding="async"
            />
            <div className="practice-stage-scrim" aria-hidden="true" />

            <div className="practice-stage-content">
              <div className="practice-stage-label">{activeArea.label}</div>
              <h3 className="practice-stage-title">{activeArea.name}</h3>
              <p className="practice-stage-desc">{activeArea.summary}</p>

              <div className="practice-scope-box">
                <div className="practice-scope-heading">Cakupan Advokasi</div>
                <p className="practice-scope-text">{activeArea.description}</p>
                <ul className="practice-scope-list">
                  {activeArea.advocacyScope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="hero-actions-row">
                <a
                  href="#janji-temu"
                  className="btn-gold"
                  onClick={() => onSelectForForm?.(activeArea.name)}
                >
                  Konsultasi {activeArea.name} &rarr;
                </a>
                <Link href={`/layanan/${activeArea.slug}`} className="btn-outline">
                  Halaman Detail Layanan &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FR-4.2 Progressive Enhancement: Full list of all 10 practice areas readable without JavaScript */}
        <noscript>
          <div className="practice-noscript-list">
            <h3>Daftar Lengkap 10 Bidang Layanan</h3>
            <ul>
              {areas.map((area) => (
                <li key={area.id}>
                  <strong>
                    {area.displayOrder}. {area.name} ({area.label}):
                  </strong>{' '}
                  {area.summary}
                </li>
              ))}
            </ul>
          </div>
        </noscript>
      </div>
    </section>
  )
}
