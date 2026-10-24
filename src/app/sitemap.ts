import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/content'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fsdanrekan.id'
  // SK-07 & FR-9.2: Only published articles are included in sitemap; drafts are strictly excluded
  const publishedArticles = getPublishedArticles()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/artikel`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/kebijakan-privasi`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  const articleRoutes: MetadataRoute.Sitemap = publishedArticles.map((article) => ({
    url: `${siteUrl}/artikel/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...articleRoutes]
}
