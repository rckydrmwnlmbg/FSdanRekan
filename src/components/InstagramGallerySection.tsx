'use client'

import React, { useState } from 'react'
import {
  DEFAULT_INSTAGRAM_HANDLE,
  DEFAULT_INSTAGRAM_PROFILE_URL,
  INITIAL_INSTAGRAM_GALLERY,
  extractInstagramHandle,
  normalizeInstagramHandleMentions,
  normalizeInstagramProfileUrl,
  parseInstagramEmbedTarget,
  type InstagramGalleryItem,
} from '@/lib/instagram-helpers'
import { OFFICIAL_FIRM_NAME, SHORT_BRAND_NAME } from '@/lib/seo'

interface InstagramGallerySectionProps {
  items: InstagramGalleryItem[]
  instagramUrl: string
  embedAvailable?: boolean
}

/**
 * SK-13 & Performance Optimization:
 * Renders lightweight static editorial preview cards on initial load (zero third-party iframe requests),
 * loading interactive Instagram embeds strictly on-demand when clicked by the visitor.
 */
export function InstagramGallerySection({
  items,
  instagramUrl,
  embedAvailable = true,
}: InstagramGallerySectionProps) {
  const cleanUrl = normalizeInstagramProfileUrl(instagramUrl, DEFAULT_INSTAGRAM_PROFILE_URL)
  const igHandle = extractInstagramHandle(cleanUrl) || DEFAULT_INSTAGRAM_HANDLE
  const [activatedEmbeds, setActivatedEmbeds] = useState<Record<string, boolean>>({})
  const [loadedFrames, setLoadedFrames] = useState<Record<string, boolean>>({})

  const sourceItems = items.length > 0 ? items : INITIAL_INSTAGRAM_GALLERY

  const activePosts = sourceItems.map((it, idx) => {
    const fallbackItem = INITIAL_INSTAGRAM_GALLERY[idx % INITIAL_INSTAGRAM_GALLERY.length]
    const parsed =
      parseInstagramEmbedTarget(it.permalink) ?? parseInstagramEmbedTarget(fallbackItem?.permalink)
    const shortcode = parsed?.shortcode ?? 'DbTC57rEjrA'
    const postType = parsed?.type ?? 'p'
    const postUrl = parsed?.postUrl ?? cleanUrl
    const embedUrl = parsed?.embedUrl ?? `https://www.instagram.com/p/${shortcode}/embed/`
    const rawLocalImg = typeof it.imageUrl === 'string' ? it.imageUrl.trim() : ''
    const localImageUrl =
      rawLocalImg.startsWith('/') && !rawLocalImg.startsWith('//') ? rawLocalImg : null

    const rawCategory = (it.category || '').trim()
    const displayCategory =
      !rawCategory || rawCategory === 'Publikasi Resmi'
        ? fallbackItem?.category || 'Wawasan Hukum'
        : rawCategory

    const rawDate = (it.publishedDate || '').trim()
    const displayDate = rawDate === 'Instagram Live' || rawDate === 'Publikasi Resmi' ? '' : rawDate

    return {
      id: it.id,
      shortcode,
      type: postType,
      url: postUrl,
      embedUrl,
      alt: it.alt,
      localImageUrl,
      category: displayCategory,
      publishedDate: displayDate,
      caption: normalizeInstagramHandleMentions(
        it.caption || `Catatan hukum dari akun ${igHandle}.`,
        igHandle,
      ),
    }
  })

  return (
    <section
      id="galeri-instagram"
      className="section-gap section-surface"
      aria-labelledby="instagram-gallery-heading"
    >
      <div className="container">
        <div className="section-header-row">
          <div>
            <div className="eyebrow-tag">MEDIA SOSIAL &amp; EDUKASI — {SHORT_BRAND_NAME}</div>
            <h2 id="instagram-gallery-heading">Publikasi &amp; Dokumentasi Media Sosial</h2>
            <p className="section-subtitle">
              Ikuti wawasan yuridis dan agenda advokasi dari akun Instagram {igHandle}.
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
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#FFFFFF', fontWeight: 600 }}>
                  {igHandle}
                </h3>
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
                  Instagram Resmi
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
                Kanal informasi wawasan hukum dan kegiatan advokasi {OFFICIAL_FIRM_NAME}.
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
              <span>Ikuti {igHandle} di Instagram</span> {'\u2197'}
            </a>
          </div>
        </div>

        {/* Static Editorial Preview Cards with Click-to-Load Embed */}
        <div
          className="instagram-embed-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '24px',
            justifyContent: 'center',
          }}
        >
          {activePosts.map((post) => {
            const isEmbedActive = embedAvailable && Boolean(activatedEmbeds[post.id])
            const isLoaded = Boolean(loadedFrames[post.id])

            return (
              <article
                key={post.id}
                className="instagram-embed-card"
                data-instagram-shortcode={post.shortcode}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: isEmbedActive ? '540px' : '260px',
                }}
              >
                {isEmbedActive ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '540px',
                      background: 'var(--color-bg)',
                    }}
                  >
                    <iframe
                      src={post.embedUrl}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                        height: '540px',
                        border: 'none',
                        overflow: 'hidden',
                        background: 'transparent',
                        opacity: isLoaded ? 1 : 0.05,
                        transition: 'opacity 0.25s ease',
                      }}
                      loading="lazy"
                      onLoad={() =>
                        setLoadedFrames((prev) => (prev[post.id] ? prev : { ...prev, [post.id]: true }))
                      }
                      title={`Postingan Instagram ${igHandle} - ${post.shortcode}`}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px',
                      background: 'linear-gradient(160deg, #101521 0%, #080B10 100%)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-gold-strong)',
                            background: 'rgba(201,168,111,0.12)',
                            border: '1px solid rgba(201,168,111,0.28)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                          }}
                        >
                          {post.category}
                        </span>
                        {post.publishedDate ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {post.publishedDate}
                          </span>
                        ) : null}
                      </div>

                      {post.localImageUrl ? (
                        <div
                          style={{
                            marginBottom: '16px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            aspectRatio: '16 / 10',
                            background: '#08090C',
                            border: '1px solid var(--color-border-subtle)',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.localImageUrl}
                            alt={post.alt}
                            loading="lazy"
                            decoding="async"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        </div>
                      ) : null}

                      <p
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          lineHeight: 1.65,
                          color: '#F1F5F9',
                          borderLeft: '2px solid var(--color-gold)',
                          paddingLeft: '14px',
                        }}
                      >
                        {post.caption}
                      </p>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-surface)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  {embedAvailable && !isEmbedActive ? (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '6px 12px', fontSize: '12.5px', minHeight: '36px' }}
                      onClick={() =>
                        setActivatedEmbeds((prev) => ({ ...prev, [post.id]: true }))
                      }
                    >
                      Muat Pratinjau
                    </button>
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                      {igHandle}
                    </span>
                  )}
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-gold"
                    style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
                    aria-label={`Buka di Instagram: ${post.category} (${post.shortcode})`}
                  >
                    Buka di Instagram &rarr;
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
