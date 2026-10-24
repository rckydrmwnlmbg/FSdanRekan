import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles } from '@/lib/content'
import { buildPageMetadata, OFFICIAL_FIRM_NAME } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: `Artikel & Wawasan Hukum | ${OFFICIAL_FIRM_NAME}`,
  description:
    'Kumpulan artikel dan kajian hukum umum dari Ferdinan Silalahi dan Rekan Law Firm mengenai hukum korporasi, pertanahan, kontrak, dan perdata.',
  path: '/artikel',
})

const PAGE_SIZE = 9 // FR-5.1: 9 articles per page

interface ArtikelIndexProps {
  searchParams?: Promise<{
    kategori?: string
    halaman?: string
    q?: string
  }>
}

export default async function ArtikelIndexPage({ searchParams }: ArtikelIndexProps) {
  const resolvedParams = (await searchParams) ?? {}
  const categorySlug = resolvedParams.kategori
  const searchQuery = resolvedParams.q?.trim() ?? ''
  const currentPage = Math.max(1, Number.parseInt(resolvedParams.halaman ?? '1', 10) || 1)

  const allPublished = getPublishedArticles()
  const categories = Array.from(
    new Map(allPublished.map((a) => [a.category.slug, a.category])).values(),
  )

  const filtered = getPublishedArticles(categorySlug, searchQuery)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <section className="section-gap" aria-labelledby="artikel-page-heading">
      <div className="container">
        <h1 id="artikel-page-heading">Wawasan &amp; Artikel Hukum</h1>
        <p className="section-subtitle">
          Informasi dan kajian hukum umum yang disusun oleh tim {OFFICIAL_FIRM_NAME}.
        </p>

        {/* Keyword Search Bar (Phase 2 L2) */}
        <form method="get" action="/artikel" className="article-search-bar" role="search">
          {categorySlug ? <input type="hidden" name="kategori" value={categorySlug} /> : null}
          <label htmlFor="articleSearchInput" className="sr-only-honeypot">
            Cari Artikel Hukum
          </label>
          <input
            id="articleSearchInput"
            type="search"
            name="q"
            defaultValue={searchQuery}
            className="form-input"
            placeholder="Cari topik hukum, kontrak, pertanahan, atau kata kunci..."
          />
          <button type="submit" className="btn-gold">
            Cari Artikel
          </button>
          {searchQuery ? (
            <Link href={categorySlug ? `/artikel?kategori=${encodeURIComponent(categorySlug)}` : '/artikel'} className="btn-outline">
              Reset
            </Link>
          ) : null}
        </form>

        {/* Category Filter (FR-5.1) */}
        <nav aria-label="Filter Kategori Artikel" className="bio-tags-row">
          <Link
            href={searchQuery ? `/artikel?q=${encodeURIComponent(searchQuery)}` : '/artikel'}
            className={!categorySlug ? 'btn-gold' : 'btn-outline'}
          >
            Semua Kategori
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/artikel?kategori=${encodeURIComponent(cat.slug)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
              className={categorySlug === cat.slug ? 'btn-gold' : 'btn-outline'}
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {paginated.length === 0 ? (
          <div className="cred-box" style={{ marginTop: '24px' }}>
            <div className="cred-title">Tidak Ada Artikel yang Sesuai</div>
            <div className="cred-desc">
              Tidak ditemukan kajian hukum untuk kata kunci &ldquo;{searchQuery}&rdquo;. Silakan
              gunakan kata kunci lain atau pilih Semua Kategori.
            </div>
          </div>
        ) : (
          <div className="team-grid-5">
            {paginated.map((article) => (
              <article key={article.id} className="featured-article-card">
                <div className="featured-article-thumb">
                  <img
                    src={article.coverImage.url}
                    alt={article.coverImage.alt}
                    width={600}
                    height={340}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="featured-article-body">
                  <div className="article-category-badge">{article.category.name}</div>
                  <h2 className="team-name">
                    <Link href={`/artikel/${article.slug}`}>{article.title}</Link>
                  </h2>
                  <p className="featured-article-excerpt">{article.excerpt}</p>
                  <Link href={`/artikel/${article.slug}`} className="link-gold">
                    Baca Selengkapnya &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination (FR-5.1: 9 per page) */}
        {totalPages > 1 ? (
          <nav aria-label="Navigasi Halaman Artikel" className="hero-actions-row">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/artikel?${categorySlug ? `kategori=${encodeURIComponent(categorySlug)}&` : ''}${searchQuery ? `q=${encodeURIComponent(searchQuery)}&` : ''}halaman=${pageNum}`}
                className={pageNum === currentPage ? 'btn-gold' : 'btn-outline'}
                aria-current={pageNum === currentPage ? 'page' : undefined}
              >
                Halaman {pageNum}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  )
}
