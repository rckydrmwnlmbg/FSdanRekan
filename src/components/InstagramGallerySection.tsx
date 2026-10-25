import React from 'react'
import type { InstagramGalleryItem } from '@/lib/content'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

interface InstagramGallerySectionProps {
  items: InstagramGalleryItem[]
  instagramUrl: string
}

const OFFICIAL_EMBED_POSTS = [
  {
    id: 'embed-1',
    shortcode: 'DVkSuErCZ_W',
    url: 'https://www.instagram.com/p/DVkSuErCZ_W/',
  },
  {
    id: 'embed-2',
    shortcode: 'DdGbn5YyKb_',
    url: 'https://www.instagram.com/p/DdGbn5YyKb_/',
  },
  {
    id: 'embed-3',
    shortcode: 'DZBZ72DPwgp',
    url: 'https://www.instagram.com/p/DZBZ72DPwgp/',
  },
]

/**
 * SK-13 & PRD V3 (Phase 2):
 * Official Instagram Gallery section for @fhspartners with direct live Instagram post embeds,
 * profile spotlight, and direct links without mock data.
 */
export function InstagramGallerySection({
  items,
  instagramUrl,
}: InstagramGallerySectionProps) {
  const cleanUrl = instagramUrl || 'https://instagram.com/fhspartners'
  const handleMatch = cleanUrl.match(/instagram\.com\/([^/?#]+)/i)
  const igHandle = handleMatch && handleMatch[1] ? `@${handleMatch[1]}` : '@fhspartners'

  // Use CMS items if available, or official @fhspartners live post embeds
  const activePosts = items.length > 0
    ? items.map((it) => {
        const m = it.permalink?.match(/\/p\/([^/?#]+)/)
        return {
          id: it.id,
          shortcode: m && m[1] ? m[1] : 'DVkSuErCZ_W',
          url: it.permalink || cleanUrl,
        }
      })
    : OFFICIAL_EMBED_POSTS

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
            <h2 id="instagram-gallery-heading">Feed Resmi Instagram {igHandle}</h2>
            <p className="section-subtitle">
              Sematkan langsung publikasi resmi, wawasan yuridis, dan dokumentasi advokasi dari akun Instagram {igHandle}.
            </p>
          </div>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Buka Akun {igHandle} di Instagram &rarr;
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
            marginBottom: '32px',
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
                Kanal publikasi wawasan hukum, agenda persidangan, dan edukasi hukum resmi {OFFICIAL_FIRM_NAME}.
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
              <span>Ikuti {igHandle} di Instagram</span> &nearr;
            </a>
          </div>
        </div>

        {/* Live Instagram Embed Feed Grid (Direct from Instagram Servers) */}
        <div
          className="instagram-embed-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            justifyContent: 'center',
          }}
        >
          {activePosts.map((post) => (
            <div
              key={post.id}
              className="instagram-embed-card"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '520px',
              }}
            >
              <iframe
                src={`https://www.instagram.com/p/${post.shortcode}/embed/`}
                style={{
                  width: '100%',
                  height: '520px',
                  border: 'none',
                  overflow: 'hidden',
                  background: 'var(--color-bg)',
                }}
                loading="lazy"
                allowTransparency={true}
                title={`Postingan Instagram ${igHandle} - ${post.shortcode}`}
              />
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--color-surface)',
                  borderTop: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Unggahan Resmi {igHandle}
                </span>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-gold"
                  style={{ fontSize: '12.5px' }}
                >
                  Buka di Instagram &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
