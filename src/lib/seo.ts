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
    '@id': `${siteUrl}/#legal-service`,
    name: OFFICIAL_FIRM_NAME,
    alternateName: SHORT_BRAND_NAME,
    url: siteUrl,
    telephone: '+62811830991',
    email: 'konsultasi@fsdanrekan.id',
    priceRange: '$$$',
    logo: `${siteUrl}/logo-seal-transparent.png`,
    image: `${siteUrl}/og-default.webp`,
    address: {
      '@type': 'PostalAddress',
      streetAddress:
        'Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng',
      addressLocality: 'Jakarta Pusat',
      addressRegion: 'DKI Jakarta',
      postalCode: '10350',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -6.192815,
      longitude: 106.8363629,
    },
    hasMap:
      'https://www.google.com/maps/search/?api=1&query=Gedung+Mandira+Jl.+RP+Soeroso+No.+33+Menteng+Jakarta+Pusat',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'https://schema.org/Monday',
          'https://schema.org/Tuesday',
          'https://schema.org/Wednesday',
          'https://schema.org/Thursday',
          'https://schema.org/Friday',
        ],
        opens: '09:30',
        closes: '18:00',
      },
    ],
    sameAs: ['https://instagram.com/fhspartners'],
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Jakarta Pusat' },
      { '@type': 'AdministrativeArea', name: 'DKI Jakarta' },
      { '@type': 'Country', name: 'Indonesia' },
    ],
    knowsAbout: [
      'Litigasi Korporasi dan Komersial',
      'Sengketa Pertanahan dan Agraria',
      'Hukum Perdata dan Perlindungan Aset',
      'Hukum Pidana Umum dan Tipikor',
      'Hak Kekayaan Intelektual (HKI)',
      'Ketenagakerjaan dan Hubungan Industrial (PHI)',
      'Kepailitan dan PKPU',
      'Arbitrase dan Mediasi Bisnis',
      'Hukum Perbankan dan Pembiayaan',
      'Hukum Keluarga dan Waris',
    ],
  }
}

export function buildArticleJsonLd({
  title,
  description,
  slug,
  publishedAt,
  coverUrl = '/images/practice-corporate.webp',
  authorName = 'Tim Redaksi FS dan Rekan',
  siteUrl = 'https://fsdanrekan.id',
}: {
  title: string
  description: string
  slug: string
  publishedAt: string
  coverUrl?: string
  authorName?: string
  siteUrl?: string
}) {
  const pageUrl = `${siteUrl}/artikel/${slug}`
  const fullCoverUrl = coverUrl.startsWith('http') ? coverUrl : `${siteUrl}${coverUrl}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    headline: title,
    description,
    image: fullCoverUrl,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: OFFICIAL_FIRM_NAME,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo-seal-transparent.png`,
      },
    },
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
  siteUrl = 'https://fsdanrekan.id',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  }
}
