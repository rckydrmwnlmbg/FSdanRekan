import type { MetadataRoute } from 'next'
import { resolvePublicSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolvePublicSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
