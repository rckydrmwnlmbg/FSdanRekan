import React from 'react'
import Link from 'next/link'
import type { ArticlePublicData } from '@/lib/content'

interface LatestArticlesSectionProps {
  articles: ArticlePublicData[]
}

export function LatestArticlesSection({ articles }: LatestArticlesSectionProps) {
  const featured = articles[0]
  const secondary = articles.slice(1, 3)

  return (
    <section id="artikel" className="section-gap" aria-labelledby="articles-heading">
      <div className="container">
        <div className="section-header-row">
          <div>
            <h2 id="articles-heading">Wawasan Hukum Terkini</h2>
            <p className="section-subtitle">
              Kajian umum regulasi, kontrak komersial, pertanahan, dan hukum keluarga.
            </p>
          </div>
          <Link href="/artikel" className="btn-outline">
            Lihat Semua Artikel &rarr;
          </Link>
        </div>

        {featured ? (
          <div className="articles-editorial-split">
            <article className="featured-article-card">
              <div className="featured-article-thumb">
                <img
                  src={featured.coverImage.url}
                  alt={featured.coverImage.alt}
                  width={700}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="featured-article-body">
                <div className="article-category-badge">{featured.category.name}</div>
                <h3 className="featured-article-title">
                  <Link href={`/artikel/${featured.slug}`}>{featured.title}</Link>
                </h3>
                <p className="featured-article-excerpt">{featured.excerpt}</p>
                <Link href={`/artikel/${featured.slug}`} className="link-gold">
                  Baca Kajian Hukum &rarr;
                </Link>
              </div>
            </article>

            <div className="stacked-articles-column">
              {secondary.map((item) => (
                <article key={item.id} className="article-card-item">
                  <div className="article-thumb-frame">
                    <img
                      src={item.coverImage.url}
                      alt={item.coverImage.alt}
                      width={300}
                      height={200}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="article-card-body">
                    <div className="article-category-badge">{item.category.name}</div>
                    <h3 className="article-card-title">
                      <Link href={`/artikel/${item.slug}`}>{item.title}</Link>
                    </h3>
                    <Link href={`/artikel/${item.slug}`} className="link-gold">
                      Baca Artikel &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
