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
  }>
}

export default async function ArtikelIndexPage({ searchParams }: ArtikelIndexProps) {
  const resolvedParams = (await searchParams) ?? {}
  const categorySlug = resolvedParams.kategori
  const currentPage = Math.max(1, Number.parseInt(resolvedParams.halaman ?? '1', 10) || 1)

  const allPublished = getPublishedArticles()
  const categories = Array.from(
    new Map(allPublished.map((a) => [a.category.slug, a.category])).values(),
  )

  const filtered = getPublishedArticles(categorySlug)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <section className="section-gap" aria-labelledby="artikel-page-heading">
      <div className="container">
        <h1 id="artikel-page-heading">Wawasan &amp; Artikel Hukum</h1>
        <p className="section-subtitle">
          Informasi dan kajian hukum umum yang disusun oleh tim {OFFICIAL_FIRM_NAME}.
        </p>

        {/* Category Filter (FR-5.1) */}
        <nav aria-label="Filter Kategori Artikel" className="bio-tags-row">
          <Link
            href="/artikel"
            className={!categorySlug ? 'btn-gold' : 'btn-outline'}
          >
            Semua Kategori
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/artikel?kategori=${encodeURIComponent(cat.slug)}`}
              className={categorySlug === cat.slug ? 'btn-gold' : 'btn-outline'}
            >
              {cat.name}
            </Link>
          ))}
        </nav>

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

        {/* Pagination (FR-5.1: 9 per page) */}
        {totalPages > 1 ? (
          <nav aria-label="Navigasi Halaman Artikel" className="hero-actions-row">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/artikel?${categorySlug ? `kategori=${encodeURIComponent(categorySlug)}&` : ''}halaman=${pageNum}`}
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
