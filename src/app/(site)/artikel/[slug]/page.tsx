import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchPublishedArticleBySlugFromDb, fetchSiteSettingsFromDb } from '@/lib/content'
import {
  buildArticleJsonLd,
  buildArticleSeoDescription,
  buildArticleSeoTitle,
  buildPageMetadata,
  OFFICIAL_FIRM_NAME,
  resolvePublicSiteUrl,
  SHORT_BRAND_NAME,
} from '@/lib/seo'
import { waLink } from '@/lib/whatsapp'
import { ArticleBody } from '@/components/ArticleBody'

export const revalidate = 60

interface ArticleDetailProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: ArticleDetailProps): Promise<Metadata> {
  const { slug } = await params
  const article = await fetchPublishedArticleBySlugFromDb(slug)
  if (!article) {
    return {
      title: `Artikel Tidak Ditemukan | ${SHORT_BRAND_NAME}`,
    }
  }
  return buildPageMetadata({
    title: buildArticleSeoTitle(article.seoTitle, article.title),
    description: buildArticleSeoDescription(article.seoDescription, article.excerpt),
    path: `/artikel/${article.slug}`,
    ogImage: article.coverImage.url,
    ogImageAlt: article.coverImage.alt || `Ilustrasi ${article.title} — ${OFFICIAL_FIRM_NAME}`,
  })
}

export default async function ArticleDetailPage({ params }: ArticleDetailProps) {
  const { slug } = await params
  // SEC-008 & FR-5.3: Only published articles with publishedAt <= now are returned; drafts return 404
  const [article, settings] = await Promise.all([
    fetchPublishedArticleBySlugFromDb(slug),
    fetchSiteSettingsFromDb(),
  ])
  if (!article) {
    notFound()
  }

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const shareWaUrl = waLink(
    settings.whatsappNumber,
    `Halo FS dan Rekan, saya ingin berkonsultasi terkait topik artikel "${article.title}".`,
  )

  const articleJsonLd = buildArticleJsonLd({
    title: article.title,
    description: article.excerpt,
    slug: article.slug,
    publishedAt: article.publishedAt,
    coverUrl: article.coverImage.url,
    authorName: article.authorName,
    siteUrl: resolvePublicSiteUrl(),
  })

  return (
    <article className="section-gap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
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
