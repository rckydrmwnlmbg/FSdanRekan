import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DEFAULT_SITE_SETTINGS, getPublishedArticleBySlug } from '@/lib/content'
import { buildPageMetadata, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'
import { ArticleBody } from '@/components/ArticleBody'

interface ArticleDetailProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: ArticleDetailProps): Promise<Metadata> {
  const { slug } = await params
  const article = getPublishedArticleBySlug(slug)
  if (!article) {
    return {
      title: `Artikel Tidak Ditemukan | ${OFFICIAL_FIRM_NAME}`,
    }
  }
  return buildPageMetadata({
    title: article.seoTitle || `${article.title} | ${OFFICIAL_FIRM_NAME}`,
    description: article.seoDescription || article.excerpt,
    path: `/artikel/${article.slug}`,
    ogImage: article.coverImage.url,
  })
}

export default async function ArticleDetailPage({ params }: ArticleDetailProps) {
  const { slug } = await params
  // SEC-008 & FR-5.3: Only published articles with publishedAt <= now are returned; drafts return 404
  const article = getPublishedArticleBySlug(slug)
  if (!article) {
    notFound()
  }

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const shareWaUrl = waLink(
    DEFAULT_SITE_SETTINGS.whatsappNumber,
    `Halo FS dan Rekan, saya ingin berkonsultasi terkait topik artikel "${article.title}".`,
  )

  return (
    <article className="section-gap">
      <div className="container">
        <div className="article-category-badge">{article.category.name}</div>
        <h1>{article.title}</h1>
        <div className="trust-stat-desc">
          Diterbitkan pada {formattedDate} &middot; Penulis: {article.authorName}
        </div>

        <div className="featured-article-thumb">
          <img
            src={article.coverImage.url}
            alt={article.coverImage.alt}
            width={900}
            height={500}
          />
        </div>

        <ArticleBody html={article.bodyHtml} />

        {/* FR-5.2: Share & Appointment CTA */}
        <div className="hero-actions-row">
          <Link href="/#janji-temu" className="btn-gold">
            Jadwalkan Janji Temu Konsultasi &rarr;
          </Link>
          <a
            href={shareWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Konsultasi Topik Ini via WhatsApp
          </a>
          <Link href="/artikel" className="link-gold">
            &larr; Kembali ke Daftar Artikel
          </Link>
        </div>
      </div>
    </article>
  )
}
