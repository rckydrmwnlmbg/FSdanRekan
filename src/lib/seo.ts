import type { Metadata } from 'next'
import {
  DEFAULT_INSTAGRAM_PROFILE_URL,
  normalizeInstagramProfileUrl,
} from '@/lib/instagram-helpers'

export const OFFICIAL_FIRM_NAME = 'Ferdinan Silalahi dan Rekan Law Firm'
export const SHORT_BRAND_NAME = 'FS dan Rekan'
export const OFFICIAL_ADDRESS =
  'Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng, Jakarta Pusat 10350'
export const DEFAULT_PUBLIC_SITE_URL = 'https://fsdanrekan.com'
export const OFFICIAL_CONTACT_EMAIL = 'konsultasi@fsdanrekan.com'
export const DEFAULT_MAPS_DIRECT_URL =
  'https://www.google.com/maps/search/?api=1&query=Gedung+Mandira+Jl.+RP+Soeroso+No.+33+Menteng+Jakarta+Pusat'

export const HOME_SEO = {
  title: 'Ferdinan Silalahi dan Rekan | Kantor Hukum Jakarta Pusat',
  description:
    'Kantor hukum Ferdinan Silalahi dan Rekan di Menteng, Jakarta Pusat. Konsultasi & pendampingan hukum korporasi, perdata, tanah, PKPU, dan litigasi.',
} as const

export const ARTICLES_INDEX_SEO = {
  title: 'Artikel & Wawasan Hukum | FS dan Rekan Law Firm',
  description:
    'Kumpulan artikel dan kajian hukum umum dari Ferdinan Silalahi dan Rekan Law Firm mengenai hukum korporasi, pertanahan, kontrak, dan perdata.',
} as const

export const PRIVACY_POLICY_SEO = {
  title: 'Kebijakan Privasi & Disclaimer | FS dan Rekan',
  description:
    'Kebijakan Pelindungan Data Pribadi (UU No. 27 Tahun 2022) dan Disclaimer informasi hukum pada website resmi Ferdinan Silalahi dan Rekan Law Firm.',
} as const

export const PRACTICE_SEO_BY_SLUG: Record<string, { title: string; description: string }> = {
  'litigasi-korporasi-dan-komersial': {
    title: 'Pengacara Litigasi Korporasi Jakarta | FS dan Rekan',
    description:
      'Advokat & pengacara litigasi korporasi Jakarta Pusat (FS dan Rekan). Pendampingan sengketa pemegang saham, kontrak bisnis, dan tata kelola perseroan.',
  },
  'sengketa-pertanahan-dan-agraria': {
    title: 'Pengacara Sengketa Tanah Jakarta | FS dan Rekan',
    description:
      'Pengacara sengketa pertanahan & agraria di Jakarta Pusat (FS dan Rekan). Uji tuntas alas hak, tumpang tindih sertifikat, mediasi, dan litigasi lahan.',
  },
  'hukum-perdata-dan-perlindungan-aset': {
    title: 'Pengacara Hukum Perdata Jakarta | FS dan Rekan',
    description:
      'Advokat perkara perdata & perlindungan aset di Jakarta (FS dan Rekan). Penanganan somasi, gugatan wanprestasi, PMH, serta sita jaminan.',
  },
  'hukum-pidana-umum-dan-tipikor': {
    title: 'Pengacara Pidana & Tipikor Jakarta | FS dan Rekan',
    description:
      'Pengacara pidana umum & tipikor Jakarta Pusat (FS dan Rekan). Pendampingan pelaporan, penyidikan, pledoi, hingga upaya hukum di persidangan.',
  },
  'hak-kekayaan-intelektual-hki': {
    title: 'Pengacara HKI & Merek Jakarta | FS dan Rekan',
    description:
      'Advokat Hak Kekayaan Intelektual (HKI) di Jakarta (FS dan Rekan). Konsultasi merek, hak cipta, lisensi, NDA, dan sengketa di Pengadilan Niaga.',
  },
  'ketenagakerjaan-dan-phi': {
    title: 'Pengacara Ketenagakerjaan PHI Jakarta | FS dan Rekan',
    description:
      'Pengacara ketenagakerjaan & hubungan industrial Jakarta (FS dan Rekan). Penyusunan kontrak kerja, perundingan bipartit/tripartit, dan sengketa PHI.',
  },
  'kepailitan-dan-pkpu-niaga': {
    title: 'Advokat Kepailitan & PKPU Jakarta | FS dan Rekan',
    description:
      'Advokat kepailitan & PKPU di Pengadilan Niaga Jakarta (FS dan Rekan). Pendampingan permohonan PKPU, rapat kreditur, verifikasi tagihan, dan perdamaian.',
  },
  'arbitrase-dan-mediasi-bisnis': {
    title: 'Advokat Arbitrase & Mediasi Jakarta | FS dan Rekan',
    description:
      'Advokat arbitrase & mediasi komersial di Jakarta Pusat (FS dan Rekan). Penyelesaian sengketa bisnis di luar pengadilan secara efektif dan rahasia.',
  },
  'hukum-perbankan-dan-pembiayaan': {
    title: 'Pengacara Perbankan & NPL Jakarta | FS dan Rekan',
    description:
      'Pengacara hukum perbankan & pembiayaan Jakarta (FS dan Rekan). Pemulihan kredit bermasalah (NPL), restrukturisasi utang, dan eksekusi agunan.',
  },
  'hukum-keluarga-dan-waris': {
    title: 'Pengacara Hukum Keluarga & Waris Jakarta | FS dan Rekan',
    description:
      'Pengacara hukum keluarga & waris di Jakarta Pusat (FS dan Rekan). Penyusunan perjanjian perkawinan, penataan harta keluarga, dan sengketa waris.',
  },
}

/**
 * Resolve canonical public site URL, strictly rejecting legacy `.id` domain or localhost/127.0.0.1
 * so canonical tags, Open Graph URLs, sitemap, and JSON-LD never leak development/obsolete hosts.
 */
export function resolvePublicSiteUrl(candidate?: string): string {
  const raw = (
    candidate ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_PUBLIC_SITE_URL
  ).trim()

  if (!raw) {
    return DEFAULT_PUBLIC_SITE_URL
  }

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase()
    const isForbiddenHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host === 'fsdanrekan.id' ||
      host.endsWith('.fsdanrekan.id')

    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || isForbiddenHost) {
      return DEFAULT_PUBLIC_SITE_URL
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.origin}${cleanPath}`
  } catch {
    return DEFAULT_PUBLIC_SITE_URL
  }
}

export function normalizePublicContactEmail(rawEmail?: string | null): string {
  const trimmed = (rawEmail || '').trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return OFFICIAL_CONTACT_EMAIL
  }
  if (trimmed.endsWith('@fsdanrekan.id')) {
    return `${trimmed.slice(0, trimmed.indexOf('@'))}@fsdanrekan.com`
  }
  return trimmed
}

export function normalizeLinkedinUrl(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return ''
  const trimmed = rawValue.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    const isLinkedin = host === 'linkedin.com' || host.endsWith('.linkedin.com')
    if (!isLinkedin || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      return ''
    }
    return parsed.toString()
  } catch {
    return ''
  }
}

export function normalizeMapsProfileUrl(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return ''
  const trimmed = rawValue.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    const pathLower = parsed.pathname.toLowerCase()
    const isGoogleMaps =
      host === 'maps.app.goo.gl' ||
      host === 'g.page' ||
      host.endsWith('.g.page') ||
      host === 'maps.google.com' ||
      (host === 'goo.gl' && pathLower.startsWith('/maps')) ||
      ((host === 'google.com' || host === 'www.google.com' || host === 'google.co.id' || host === 'www.google.co.id') &&
        pathLower.startsWith('/maps'))
    if (!isGoogleMaps || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      return ''
    }
    return parsed.toString()
  } catch {
    return ''
  }
}

export function stripMarkdownEmphasis(text: string): string {
  return text.replace(/\*+([^*]+)\*+/g, '$1').replace(/\*/g, '')
}

/**
 * Truncate text cleanly at a word boundary without cutting words in half.
 */
export function truncateAtWordBoundary(
  text: string,
  maxLength: number,
  options?: { stripMarkdown?: boolean; suffix?: string },
): string {
  const base = options?.stripMarkdown ? stripMarkdownEmphasis(text) : text
  const normalized = base.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  const suffix = options?.suffix ?? ''
  const budget = Math.max(1, maxLength - suffix.length)
  const slice = normalized.slice(0, budget + 1)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace >= Math.floor(budget * 0.55) ? slice.slice(0, lastSpace) : normalized.slice(0, budget)
  const cleaned = cut.replace(/[\s,;:\-–—]+$/g, '').trim()
  return suffix ? `${cleaned}${suffix}` : cleaned
}

export function buildPracticeSeoTitle(areaName: string, slug?: string): string {
  if (slug && PRACTICE_SEO_BY_SLUG[slug]) {
    return PRACTICE_SEO_BY_SLUG[slug].title
  }
  const suffix = ` | ${SHORT_BRAND_NAME}`
  const prefix = `Pengacara ${areaName.trim()} Jakarta`
  if (prefix.length + suffix.length <= 60) {
    return `${prefix}${suffix}`
  }
  const maxBody = 60 - suffix.length
  return `${truncateAtWordBoundary(prefix, maxBody)}${suffix}`
}

export function buildPracticeSeoDescription(areaName: string, summary: string, slug?: string): string {
  if (slug && PRACTICE_SEO_BY_SLUG[slug]) {
    return PRACTICE_SEO_BY_SLUG[slug].description
  }
  const cleanSummary = summary.replace(/\s+/g, ' ').trim()
  const lead = `Advokat ${areaName.trim()} di Jakarta Pusat (${SHORT_BRAND_NAME}). ${cleanSummary}`
  return truncateAtWordBoundary(lead, 160)
}

export function buildTeamSeoTitle(displayName: string, roleTitle: string): string {
  const fullCandidate = `${displayName.trim()} — ${roleTitle.trim()} | ${SHORT_BRAND_NAME}`
  if (fullCandidate.length <= 60) {
    return fullCandidate
  }
  const nameBrandCandidate = `${displayName.trim()} | ${SHORT_BRAND_NAME}`
  if (nameBrandCandidate.length <= 60) {
    return nameBrandCandidate
  }
  const suffix = ` | ${SHORT_BRAND_NAME}`
  return `${truncateAtWordBoundary(displayName, 60 - suffix.length)}${suffix}`
}

export function buildTeamSeoDescription(shortBio: string): string {
  return truncateAtWordBoundary(shortBio, 160, { stripMarkdown: true })
}

export function buildArticleSeoTitle(seoTitle: string | undefined, articleTitle: string): string {
  const custom = (seoTitle || '').replace(/\s+/g, ' ').trim()
  if (custom) {
    return custom.length <= 60 ? custom : truncateAtWordBoundary(custom, 60)
  }
  const suffix = ` | ${SHORT_BRAND_NAME}`
  const cleanTitle = articleTitle.replace(/\s+/g, ' ').trim()
  if (cleanTitle.length + suffix.length <= 60) {
    return `${cleanTitle}${suffix}`
  }
  return `${truncateAtWordBoundary(cleanTitle, 60 - suffix.length)}${suffix}`
}

export function buildArticleSeoDescription(seoDescription: string | undefined, excerpt: string): string {
  const source = (seoDescription || '').trim() || excerpt
  return truncateAtWordBoundary(source, 160, { stripMarkdown: true })
}

export function buildPageMetadata({
  title,
  description,
  path = '/',
  ogImage = '/og-default.webp',
  ogImageAlt,
}: {
  title: string
  description: string
  path?: string
  ogImage?: string
  ogImageAlt?: string
}): Metadata {
  const siteUrl = resolvePublicSiteUrl()
  const canonicalUrl = new URL(path, siteUrl).toString()
  const resolvedOgImage = new URL(ogImage, siteUrl).toString()
  const resolvedAlt = ogImageAlt?.trim() || `Logo ${OFFICIAL_FIRM_NAME}`

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
          url: resolvedOgImage,
          width: 1200,
          height: 630,
          alt: resolvedAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolvedOgImage],
    },
  }
}

export interface LegalServiceSchemaSettings {
  firmName?: string
  shortBrandName?: string
  formerFirmName?: string
  address?: string
  whatsappDisplay?: string
  whatsappNumber?: string
  inquiryRecipientEmail?: string
  instagramUrl?: string
  linkedinUrl?: string
  mapsProfileUrl?: string
  mapsDirectUrl?: string
}

function buildPostalAddressSchema(rawAddress?: string) {
  const clean = (rawAddress || OFFICIAL_ADDRESS).trim()
  if (clean === OFFICIAL_ADDRESS) {
    return {
      '@type': 'PostalAddress',
      streetAddress:
        'Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng',
      addressLocality: 'Jakarta Pusat',
      addressRegion: 'DKI Jakarta',
      postalCode: '10350',
      addressCountry: 'ID',
    }
  }
  return {
    '@type': 'PostalAddress',
    streetAddress: clean,
    addressLocality: 'Jakarta Pusat',
    addressRegion: 'DKI Jakarta',
    addressCountry: 'ID',
  }
}

export function buildLegalServiceJsonLd(
  siteUrlOrOptions?: string | { siteUrl?: string; settings?: LegalServiceSchemaSettings },
  legacyInstagramUrl?: string,
) {
  const opts =
    typeof siteUrlOrOptions === 'string' || siteUrlOrOptions === undefined
      ? { siteUrl: siteUrlOrOptions, settings: { instagramUrl: legacyInstagramUrl } }
      : siteUrlOrOptions

  const siteUrl = resolvePublicSiteUrl(opts.siteUrl)
  const settings = opts.settings ?? {}
  const firmName = settings.firmName?.trim() || OFFICIAL_FIRM_NAME
  const shortBrandName = settings.shortBrandName?.trim() || SHORT_BRAND_NAME
  const formerFirmName = settings.formerFirmName?.trim() || ''

  const alternateNames = Array.from(
    new Set([shortBrandName, formerFirmName].filter((v) => Boolean(v) && v !== firmName)),
  )

  const canonicalInstagramUrl = normalizeInstagramProfileUrl(
    settings.instagramUrl || process.env.INSTAGRAM_PROFILE_URL,
    DEFAULT_INSTAGRAM_PROFILE_URL,
  )
  const cleanLinkedinUrl = normalizeLinkedinUrl(settings.linkedinUrl)
  const cleanMapsProfileUrl = normalizeMapsProfileUrl(settings.mapsProfileUrl)

  const sameAs = Array.from(
    new Set([canonicalInstagramUrl, cleanLinkedinUrl, cleanMapsProfileUrl].filter(Boolean)),
  )

  const telephone =
    settings.whatsappDisplay?.trim() ||
    (settings.whatsappNumber ? `+${settings.whatsappNumber.replace(/\D/g, '')}` : '+62 811-830-991')

  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    '@id': `${siteUrl}/#legal-service`,
    name: firmName,
    alternateName: alternateNames.length > 1 ? alternateNames : alternateNames[0] ?? shortBrandName,
    url: siteUrl,
    telephone,
    email: normalizePublicContactEmail(settings.inquiryRecipientEmail),
    priceRange: '$$$',
    logo: `${siteUrl}/logo-seal-transparent.png`,
    image: `${siteUrl}/og-default.webp`,
    address: buildPostalAddressSchema(settings.address),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -6.192815,
      longitude: 106.8363629,
    },
    hasMap: cleanMapsProfileUrl || settings.mapsDirectUrl?.trim() || DEFAULT_MAPS_DIRECT_URL,
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
    sameAs,
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
  siteUrl,
}: {
  title: string
  description: string
  slug: string
  publishedAt: string
  coverUrl?: string
  authorName?: string
  siteUrl?: string
}) {
  const resolvedSiteUrl = resolvePublicSiteUrl(siteUrl)
  const pageUrl = `${resolvedSiteUrl}/artikel/${slug}`
  const fullCoverUrl = coverUrl.startsWith('http') ? coverUrl : `${resolvedSiteUrl}${coverUrl}`
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
      url: resolvedSiteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: OFFICIAL_FIRM_NAME,
      url: resolvedSiteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${resolvedSiteUrl}/logo-seal-transparent.png`,
      },
    },
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
  siteUrl?: string,
) {
  const resolvedSiteUrl = resolvePublicSiteUrl(siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${resolvedSiteUrl}${item.url}`,
    })),
  }
}
