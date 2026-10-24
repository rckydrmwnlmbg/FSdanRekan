import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  DEFAULT_SITE_SETTINGS,
  getPracticeAreaBySlug,
  getPublishedPracticeAreas,
  getPublishedTeamMembers,
} from '@/lib/content'
import { buildPageMetadata, OFFICIAL_ADDRESS, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface PracticeDetailProps {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return getPublishedPracticeAreas().map((area) => ({
    slug: area.slug,
  }))
}

export async function generateMetadata({ params }: PracticeDetailProps): Promise<Metadata> {
  const { slug } = await params
  const area = getPracticeAreaBySlug(slug)
  if (!area) {
    return {
      title: `Bidang Layanan Tidak Ditemukan | ${OFFICIAL_FIRM_NAME}`,
    }
  }
  return buildPageMetadata({
    title: `${area.name} | Layanan Hukum ${OFFICIAL_FIRM_NAME}`,
    description: `${area.summary} Konsultasikan kebutuhan hukum ${area.name} bersama tim advokat ${OFFICIAL_FIRM_NAME} di Jakarta Pusat.`,
    path: `/layanan/${area.slug}`,
    ogImage: area.image ?? '/og-default.webp',
  })
}

export default async function PracticeAreaDetailPage({ params }: PracticeDetailProps) {
  const { slug } = await params
  const area = getPracticeAreaBySlug(slug)
  if (!area) {
    notFound()
  }

  const allAreas = getPublishedPracticeAreas()
  const teamMembers = getPublishedTeamMembers().slice(0, 3)
  const consultWaUrl = waLink(
    DEFAULT_SITE_SETTINGS.whatsappNumber,
    `Halo FS dan Rekan, saya ingin berkonsultasi mengenai bidang layanan "${area.name}".`,
  )

  return (
    <section className="section-gap" aria-labelledby="practice-detail-heading">
      <div className="container">
        <div className="eyebrow-tag">BIDANG PRAKTIK HUKUM — {area.label}</div>
        <h1 id="practice-detail-heading">{area.name}</h1>
        <p className="section-subtitle">{area.summary}</p>

        <div className="docket-booking-grid" style={{ marginTop: '40px' }}>
          {/* Main Content Column */}
          <div className="docket-panel-form">
            <div className="featured-article-thumb" style={{ marginBottom: '28px' }}>
              <img
                src={area.image ?? '/images/practice-corporate.webp'}
                alt={`Ilustrasi layanan ${area.name} — ${OFFICIAL_FIRM_NAME}`}
                width={900}
                height={500}
              />
            </div>

            <h2>{area.description}</h2>
            <p className="about-paragraph" style={{ marginTop: '14px' }}>
              <strong>{OFFICIAL_FIRM_NAME}</strong> menyediakan pendampingan hukum yang terukur,
              profesional, dan berorientasi pada perlindungan hak serta kepentingan hukum klien
              dalam bidang <strong>{area.name}</strong>. Setiap penanganan perkara diawali dengan
              penelaahan dokumen secara menyeluruh dan pemetaan strategi hukum yang objektif.
            </p>

            <div className="practice-scope-box" style={{ marginTop: '24px' }}>
              <div className="practice-scope-heading">Cakupan Layanan &amp; Advokasi</div>
              <ul className="practice-scope-list">
                {area.advocacyScope.map((scopeItem) => (
                  <li key={scopeItem}>{scopeItem}</li>
                ))}
              </ul>
            </div>

            <h3>Tahapan Pendampingan Hukum</h3>
            <div className="credentials-spec-grid" style={{ marginTop: '16px' }}>
              <div className="cred-box">
                <div className="cred-title">1. Konsultasi &amp; Telaah Awal</div>
                <div className="cred-desc">
                  Identifikasi duduk perkara, pemeriksaan kelengkapan dokumen, dan pemetaan posisi
                  hukum secara rahasia.
                </div>
              </div>
              <div className="cred-box">
                <div className="cred-title">2. Perumusan Strategi &amp; Tindakan</div>
                <div className="cred-desc">
                  Penyusunan pendapat hukum (legal opinion), perundingan non-litigasi, maupun
                  pendampingan litigasi di peradilan.
                </div>
              </div>
            </div>

            <aside className="article-disclaimer-box" aria-label="Peringatan dan Disclaimer Hukum">
              <strong>Catatan Penting (Disclaimer):</strong> Uraian bidang layanan di halaman ini
              disediakan oleh <strong>{OFFICIAL_FIRM_NAME}</strong> sebagai informasi umum dan bukan
              merupakan nasihat hukum mengikat. Hubungan advokat dan klien baru berlaku setelah
              penandatanganan Surat Kuasa Khusus dan/atau Perjanjian Jasa Hukum.
            </aside>
          </div>

          {/* Sidebar Column */}
          <div className="docket-info-card">
            <h3>Jadwalkan Konsultasi {area.label}</h3>
            <p className="office-address-text">
              Diskusikan kebutuhan hukum Anda secara tatap muka di kantor kami ({OFFICIAL_ADDRESS})
              atau secara daring.
            </p>

            <div className="hero-actions-row" style={{ marginBottom: '28px' }}>
              <Link href="/#janji-temu" className="btn-gold full-width-btn">
                Isi Formulir Janji Temu &rarr;
              </Link>
              <a
                href={consultWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline full-width-btn"
              >
                Konsultasi via WhatsApp &rarr;
              </a>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>Tim Pendamping</h3>
            <div className="stacked-articles-column">
              {teamMembers.map((member) => (
                <div key={member.id} className="cred-box">
                  <div className="cred-title">{member.displayName}</div>
                  <div className="cred-desc">{member.roleTitle}</div>
                  <Link href={`/tim/${member.slug}`} className="link-gold">
                    Lihat Profil &rarr;
                  </Link>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '28px', marginBottom: '12px' }}>Bidang Praktik Lainnya</h3>
            <div className="bio-tags-row">
              {allAreas
                .filter((a) => a.slug !== area.slug)
                .slice(0, 6)
                .map((other) => (
                  <Link key={other.id} href={`/layanan/${other.slug}`} className="bio-tag-chip">
                    {other.name}
                  </Link>
                ))}
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link href="/#keahlian" className="link-gold">
                &larr; Kembali ke 10 Bidang Praktik
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
