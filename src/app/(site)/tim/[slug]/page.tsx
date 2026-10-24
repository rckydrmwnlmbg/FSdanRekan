import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  DEFAULT_SITE_SETTINGS,
  getPublishedTeamMembers,
  getTeamMemberBySlug,
} from '@/lib/content'
import { buildPageMetadata, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'

interface TeamDetailProps {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return getPublishedTeamMembers().map((member) => ({
    slug: member.slug,
  }))
}

export async function generateMetadata({ params }: TeamDetailProps): Promise<Metadata> {
  const { slug } = await params
  const member = getTeamMemberBySlug(slug)
  if (!member) {
    return {
      title: `Profil Tim Tidak Ditemukan | ${OFFICIAL_FIRM_NAME}`,
    }
  }
  return buildPageMetadata({
    title: `${member.displayName} — ${member.roleTitle} | ${OFFICIAL_FIRM_NAME}`,
    description: member.shortBio,
    path: `/tim/${member.slug}`,
    ogImage: member.photo.url,
  })
}

export default async function TeamMemberDetailPage({ params }: TeamDetailProps) {
  const { slug } = await params
  const member = getTeamMemberBySlug(slug)
  if (!member) {
    notFound()
  }

  const otherMembers = getPublishedTeamMembers().filter((m) => m.slug !== member.slug)
  const consultWaUrl = waLink(
    DEFAULT_SITE_SETTINGS.whatsappNumber,
    `Halo FS dan Rekan, saya ingin menjadwalkan konsultasi hukum bersama ${member.displayName}.`,
  )

  return (
    <section className="section-gap" aria-labelledby="team-member-heading">
      <div className="container">
        <div className="founder-editorial-grid">
          <div className="founder-portrait-mat">
            <div className="founder-photo-inner">
              <img
                src={member.photo.url}
                srcSet={member.photo.srcSet}
                sizes="(max-width: 768px) 100vw, 440px"
                alt={member.photo.alt}
                width={member.photo.width}
                height={member.photo.height}
              />
              <div className="founder-seal-tag">
                <div className="founder-seal-name">{member.displayName}</div>
                <div className="founder-seal-role">{member.roleTitle}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="eyebrow-tag">{member.group.toUpperCase()} — FS DAN REKAN</div>
            <h1 id="team-member-heading">{member.displayName}</h1>
            <p className="section-subtitle">{member.roleTitle}</p>

            {member.motto ? (
              <blockquote className="quote-editorial-box">&ldquo;{member.motto}&rdquo;</blockquote>
            ) : null}

            {member.tags.length > 0 ? (
              <div className="bio-tags-row" aria-label="Bidang Keahlian">
                {member.tags.map((tag) => (
                  <span key={tag} className="bio-tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="bio-full-text" style={{ marginTop: '20px' }}>
              {member.fullBio.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="bio-paragraph">
                  {paragraph}
                </p>
              ))}
            </div>

            {member.education.length > 0 ? (
              <div className="bio-meta-section">
                <div className="bio-meta-heading">Pendidikan</div>
                <ul className="bio-meta-list">
                  {member.education.map((edu) => (
                    <li key={edu}>{edu}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {member.credentials.length > 0 ? (
              <div className="bio-meta-section">
                <div className="bio-meta-heading">Kredensial &amp; Afiliasi</div>
                <ul className="bio-meta-list">
                  {member.credentials.map((cred) => (
                    <li key={cred}>{cred}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {member.languages.length > 0 ? (
              <div className="bio-meta-section">
                <div className="bio-meta-heading">Bahasa</div>
                <ul className="bio-meta-list">
                  {member.languages.map((lang) => (
                    <li key={lang}>{lang}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="hero-actions-row" style={{ marginTop: '32px' }}>
              <Link href="/#janji-temu" className="btn-gold">
                Jadwalkan Janji Temu &rarr;
              </Link>
              <a
                href={consultWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                Hubungi via WhatsApp &rarr;
              </a>
              <Link href="/#tim-advokat" className="link-gold">
                &larr; Kembali ke Tim Kami
              </Link>
            </div>
          </div>
        </div>

        {/* Other Team Members Navigation */}
        <div style={{ marginTop: '72px' }}>
          <h2>Rekan &amp; Tim Lainnya</h2>
          <div className="team-grid-5" style={{ marginTop: '24px' }}>
            {otherMembers.map((other) => (
              <article key={other.id} className="team-card">
                <div className="team-card-photo">
                  <img
                    src={other.photo.url}
                    alt={other.photo.alt}
                    width={other.photo.width}
                    height={other.photo.height}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="team-card-body">
                  <div>
                    <h3 className="team-name">{other.displayName}</h3>
                    <div className="team-role">{other.roleTitle}</div>
                  </div>
                  <Link href={`/tim/${other.slug}`} className="link-gold">
                    Lihat Profil Lengkap &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
