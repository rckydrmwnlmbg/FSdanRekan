import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Panel Admin CMS | ${OFFICIAL_FIRM_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminPortalPage() {
  return (
    <section className="section-gap" aria-labelledby="admin-portal-heading">
      <div className="container">
        <div className="eyebrow-tag">ENTERPRISE CMS SUITE — {SHORT_BRAND_NAME}</div>
        <h1 id="admin-portal-heading">Panel Admin CMS {OFFICIAL_FIRM_NAME}</h1>
        <p className="section-subtitle">
          Pengelolaan terpadu 10 modul: Ringkasan Eksekutif, Artikel &amp; Wawasan, Kategori,
          Permohonan Janji Temu (Inquiry), Tim &amp; Advokat (5 Profil), 10 Bidang Praktik, Rekam
          Jejak Perkara, Pustaka Media (WebP/PNG), Pengaturan Situs, serta Pengguna
          &amp; Audit Keamanan.
        </p>
        <div className="hero-actions-row" style={{ marginTop: '24px' }}>
          <Link href="/" className="btn-outline">
            &larr; Kembali ke Beranda Publik
          </Link>
        </div>
      </div>
    </section>
  )
}
