'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface HeaderProps {
  whatsappNumber: string
  defaultWaMessage: string
}

const NAV_ITEMS = [
  { href: '/#beranda', label: 'Beranda' },
  { href: '/#keahlian', label: 'Keahlian' },
  { href: '/#tentang', label: 'Tentang' },
  { href: '/#tim-advokat', label: 'Tim Advokat' },
  { href: '/#artikel', label: 'Wawasan' },
  { href: '/#janji-temu', label: 'Janji Temu' },
]

export function Header({ whatsappNumber, defaultWaMessage }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeHash, setActiveHash] = useState('/#beranda')
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null)
  const firstMenuLinkRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        toggleBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) {
      firstMenuLinkRef.current?.focus()
    }
  }, [menuOpen])

  const whatsappUrl = waLink(
    whatsappNumber,
    `${defaultWaMessage} (Sumber: Header Website ${SHORT_BRAND_NAME})`,
  )

  return (
    <header className="site-header">
      <div className="container nav-wrapper">
        <Link href="/#beranda" className="brand-link" aria-label={`Beranda ${OFFICIAL_FIRM_NAME}`}>
          <img
            src="/logo-seal-transparent.png"
            alt={`Logo ${OFFICIAL_FIRM_NAME}`}
            className="brand-logo-img"
            width={48}
            height={48}
            fetchPriority="high"
          />
          <div>
            <div className="brand-text-name">{SHORT_BRAND_NAME}</div>
            <div className="brand-text-sub">Law Firm</div>
          </div>
        </Link>

        <nav aria-label="Navigasi Utama">
          <ul className={`nav-menu ${menuOpen ? 'is-open' : ''}`} id="primaryNav">
            {NAV_ITEMS.map((item, idx) => (
              <li key={item.href}>
                <a
                  ref={idx === 0 ? firstMenuLinkRef : undefined}
                  href={item.href}
                  className={activeHash === item.href ? 'active' : ''}
                  onClick={() => {
                    setActiveHash(item.href)
                    setMenuOpen(false)
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-cta-group">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline header-wa-btn"
            aria-label="Hubungi lewat WhatsApp dari Header"
          >
            WhatsApp
          </a>
          <a href="/#janji-temu" className="btn-gold header-consult-btn">
            Konsultasi
          </a>
          <button
            ref={toggleBtnRef}
            type="button"
            className="mobile-hamburger"
            id="navToggleBtn"
            aria-label={menuOpen ? 'Tutup Menu Navigasi' : 'Buka Menu Navigasi'}
            aria-expanded={menuOpen}
            aria-controls="primaryNav"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
