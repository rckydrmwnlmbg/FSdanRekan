import type { MetadataRoute } from 'next'
import {
  fetchPublishedArticlesFromDb,
  fetchPublishedPracticeAreasFromDb,
  fetchPublishedTeamMembersFromDb,
} from '@/lib/content'
import { resolvePublicSiteUrl } from '@/lib/seo'

export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolvePublicSiteUrl()
  // SK-07 & FR-9.2: Only published articles are included in sitemap; drafts are strictly excluded
  const [publishedArticles, practiceAreas, teamMembers] = await Promise.all([
    fetchPublishedArticlesFromDb(),
    fetchPublishedPracticeAreasFromDb(),
    fetchPublishedTeamMembersFromDb(),
  ])

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

  const practiceRoutes: MetadataRoute.Sitemap = practiceAreas.map((area) => ({
    url: `${siteUrl}/layanan/${area.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.85,
  }))

  const teamRoutes: MetadataRoute.Sitemap = teamMembers.map((member) => ({
    url: `${siteUrl}/tim/${member.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  const articleRoutes: MetadataRoute.Sitemap = publishedArticles.map((article) => ({
    url: `${siteUrl}/artikel/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...practiceRoutes, ...teamRoutes, ...articleRoutes]
}
