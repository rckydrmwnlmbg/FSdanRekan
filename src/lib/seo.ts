import type { Metadata } from 'next'

export const OFFICIAL_FIRM_NAME = 'Ferdinan Silalahi dan Rekan Law Firm'
export const SHORT_BRAND_NAME = 'FS dan Rekan'
export const OFFICIAL_ADDRESS =
  'Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng, Jakarta Pusat 10350'

export function buildPageMetadata({
  title,
  description,
  path = '/',
  ogImage = '/og-default.webp',
}: {
  title: string
  description: string
  path?: string
  ogImage?: string
}): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fsdanrekan.id'
  const canonicalUrl = new URL(path, siteUrl).toString()

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: OFFICIAL_FIRM_NAME,
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: new URL(ogImage, siteUrl).toString(),
          width: 1200,
          height: 630,
          alt: `Logo ${OFFICIAL_FIRM_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [new URL(ogImage, siteUrl).toString()],
    },
  }
}

export function buildLegalServiceJsonLd(siteUrl = 'https://fsdanrekan.id') {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: OFFICIAL_FIRM_NAME,
    alternateName: SHORT_BRAND_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo-seal-transparent.png`,
    image: `${siteUrl}/og-default.webp`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng',
      addressLocality: 'Jakarta Pusat',
      addressRegion: 'DKI Jakarta',
      postalCode: '10350',
      addressCountry: 'ID',
    },
  }
}
