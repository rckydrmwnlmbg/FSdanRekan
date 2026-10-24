import React from 'react'
import type { InstagramGalleryItem } from '@/lib/content'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

interface InstagramGallerySectionProps {
  items: InstagramGalleryItem[]
  instagramUrl: string
}

/**
 * SK-13 & PRD V3 (Phase 2):
 * Official Instagram Gallery section with curated/cached posts, required alt text,
 * lazy-loaded optimized images, and "Ikuti di Instagram" CTA.
 */
export function InstagramGallerySection({
  items,
  instagramUrl,
}: InstagramGallerySectionProps) {
  if (items.length === 0) return null

  return (
    <section
      id="galeri-instagram"
      className="section-gap section-surface"
      aria-labelledby="instagram-gallery-heading"
    >
      <div className="container">
        <div className="section-header-row">
          <div>
            <div className="eyebrow-tag">PUBLIKASI &amp; MEDIA SOSIAL — {SHORT_BRAND_NAME}</div>
            <h2 id="instagram-gallery-heading">Sorotan &amp; Edukasi Instagram</h2>
            <p className="section-subtitle">
              Ikuti pembaruan informasi dan edukasi hukum umum dari akun resmi {OFFICIAL_FIRM_NAME}.
            </p>
          </div>
          <a
            href={instagramUrl || 'https://instagram.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Ikuti di Instagram &rarr;
          </a>
        </div>

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
                  href={item.permalink || instagramUrl || 'https://instagram.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-gold"
                >
                  Lihat Unggahan &rarr;
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
