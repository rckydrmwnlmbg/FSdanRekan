import React from 'react'
import type { InstagramGalleryItem } from '@/lib/content'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

interface InstagramGallerySectionProps {
  items: InstagramGalleryItem[]
  instagramUrl: string
}

/**
 * SK-13 & PRD V3 (Phase 2):
 * Official Instagram Gallery section for @fhspartners with official profile spotlight,
 * direct follow links, verified account badge, and optional synchronized/curated feed.
 */
export function InstagramGallerySection({
  items,
  instagramUrl,
}: InstagramGallerySectionProps) {
  const cleanUrl = instagramUrl || 'https://instagram.com/fhspartners'
  const handleMatch = cleanUrl.match(/instagram\.com\/([^/?#]+)/i)
  const igHandle = handleMatch && handleMatch[1] ? `@${handleMatch[1]}` : '@fhspartners'

  return (
    <section
      id="galeri-instagram"
      className="section-gap section-surface"
      aria-labelledby="instagram-gallery-heading"
    >
      <div className="container">
        <div className="section-header-row">
          <div>
            <div className="eyebrow-tag">PUBLIKASI &amp; MEDIA SOSIAL RESMI — {SHORT_BRAND_NAME}</div>
            <h2 id="instagram-gallery-heading">Sorotan &amp; Edukasi Instagram</h2>
            <p className="section-subtitle">
              Ikuti pembaruan informasi, kajian regulasi, dan dokumentasi kegiatan advokasi resmi dari akun Instagram {igHandle}.
            </p>
          </div>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Ikuti {igHandle} di Instagram &rarr;
          </a>
        </div>

        {/* Official Instagram Profile Spotlight Card */}
        <div
          className="instagram-spotlight-card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '6px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: items.length > 0 ? '32px' : '0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                padding: '2.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'var(--color-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'var(--color-gold-strong)',
                  fontSize: '18px',
                  letterSpacing: '0.05em',
                }}
              >
                FS
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#FFFFFF', fontWeight: 600 }}>{igHandle}</h3>
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(201,168,111,0.15)',
                    color: 'var(--color-gold-strong)',
                    border: '1px solid rgba(201,168,111,0.3)',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    fontWeight: 600,
                  }}
                >
                  Akun Resmi Instagram
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13.5px',
                  color: 'var(--color-text-secondary)',
                  maxWidth: '580px',
                  lineHeight: 1.5,
                }}
              >
                Kanal resmi publikasi wawasan hukum, agenda persidangan, dan edukasi hukum {OFFICIAL_FIRM_NAME}.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Buka Instagram {igHandle}</span> &nearr;
            </a>
          </div>
        </div>

        {items.length > 0 && (
          <div className="instagram-gallery-grid">
            {items.map((item) => (
              <article key={item.id} className="instagram-card">
                <div className="instagram-card-media">
                  <img
                    src={item.imageUrl}
                    alt={item.alt}
                    width={600}
                    height={600}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="instagram-card-badge">{item.category}</span>
                </div>
                <div className="instagram-card-body">
                  <div className="instagram-card-date">{item.publishedDate}</div>
                  <p className="instagram-card-caption">{item.caption}</p>
                  <a
                    href={item.permalink || cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-gold"
                  >
                    Lihat Unggahan di Instagram &rarr;
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
