import { afterEach, describe, expect, it } from 'vitest'
import {
  getAllNormalizedArticles,
  getPublishedPracticeAreas,
  getPublishedTeamMembers,
} from '@/lib/content'
import {
  ARTICLES_INDEX_SEO,
  buildArticleSeoDescription,
  buildArticleSeoTitle,
  buildLegalServiceJsonLd,
  buildPageMetadata,
  buildPracticeSeoDescription,
  buildPracticeSeoTitle,
  buildTeamSeoDescription,
  buildTeamSeoTitle,
  HOME_SEO,
  normalizeLinkedinUrl,
  normalizeMapsProfileUrl,
  normalizePublicContactEmail,
  OFFICIAL_FIRM_NAME,
  PRIVACY_POLICY_SEO,
  resolvePublicSiteUrl,
  truncateAtWordBoundary,
} from '@/lib/seo'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
const ORIGINAL_SITE_URL = process.env.SITE_URL

afterEach(() => {
  if (ORIGINAL_NEXT_PUBLIC_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_NEXT_PUBLIC_SITE_URL
  }

  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.SITE_URL
  } else {
    process.env.SITE_URL = ORIGINAL_SITE_URL
  }
})

describe('SEO URL resolution & domain guard', () => {
  it('always rejects legacy .id domain and localhost/loopback fallbacks', () => {
    expect(resolvePublicSiteUrl('https://fsdanrekan.id')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('http://fsdanrekan.id/')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('https://sub.fsdanrekan.id')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('http://localhost:3000')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('http://127.0.0.1:3000')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('not-a-valid-url')).toBe('https://fsdanrekan.com')
    expect(resolvePublicSiteUrl('https://fsdanrekan.com/')).toBe('https://fsdanrekan.com')

    process.env.NEXT_PUBLIC_SITE_URL = 'https://fsdanrekan.id'
    expect(resolvePublicSiteUrl()).toBe('https://fsdanrekan.com')

    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    expect(resolvePublicSiteUrl()).toBe('https://fsdanrekan.com')
  })

  it('normalizes legacy .id contact email to official .com email', () => {
    expect(normalizePublicContactEmail('konsultasi@fsdanrekan.id')).toBe(
      'konsultasi@fsdanrekan.com',
    )
    expect(normalizePublicContactEmail('')).toBe('konsultasi@fsdanrekan.com')
    expect(normalizePublicContactEmail(undefined)).toBe('konsultasi@fsdanrekan.com')
    expect(normalizePublicContactEmail('info@contohmitra.co.id')).toBe('info@contohmitra.co.id')
  })

  it('validates optional LinkedIn and Google Maps profile URLs strictly', () => {
    expect(normalizeLinkedinUrl('https://www.linkedin.com/company/fsdanrekan')).toBe(
      'https://www.linkedin.com/company/fsdanrekan',
    )
    expect(normalizeLinkedinUrl('https://evil-linkedin.com/company/fsdanrekan')).toBe('')
    expect(normalizeLinkedinUrl('javascript:alert(1)')).toBe('')

    expect(normalizeMapsProfileUrl('https://maps.app.goo.gl/abc123')).toBe(
      'https://maps.app.goo.gl/abc123',
    )
    expect(
      normalizeMapsProfileUrl('https://www.google.com/maps/place/Gedung+Mandira'),
    ).toBe('https://www.google.com/maps/place/Gedung+Mandira')
    expect(normalizeMapsProfileUrl('https://www.google.com/search?q=mandira')).toBe('')
    expect(normalizeMapsProfileUrl('https://example.org/maps')).toBe('')
  })
})

describe('SEO title (<= 60) & meta description (<= 160) budgets', () => {
  it('keeps static pages and all 10 practice area titles/descriptions within SEO limits without awkward repetition', () => {
    expect(HOME_SEO.title.length).toBeLessThanOrEqual(60)
    expect(HOME_SEO.description.length).toBeLessThanOrEqual(160)
    expect(ARTICLES_INDEX_SEO.title.length).toBeLessThanOrEqual(60)
    expect(ARTICLES_INDEX_SEO.description.length).toBeLessThanOrEqual(160)
    expect(PRIVACY_POLICY_SEO.title.length).toBeLessThanOrEqual(60)
    expect(PRIVACY_POLICY_SEO.description.length).toBeLessThanOrEqual(160)

    const practiceAreas = getPublishedPracticeAreas()
    expect(practiceAreas.length).toBe(10)

    for (const area of practiceAreas) {
      const title = buildPracticeSeoTitle(area.name, area.slug)
      const description = buildPracticeSeoDescription(area.name, area.summary, area.slug)
      expect(title.length).toBeLessThanOrEqual(60)
      expect(description.length).toBeLessThanOrEqual(160)
      expect(title).toMatch(/(Pengacara|Advokat)/i)
      expect(title).toContain('Jakarta')
      expect(description).not.toMatch(/\bhukum\s+hukum\b/i)
    }
  })

  it('keeps all team and published article SEO titles/descriptions within bounds and truncates on word boundaries', () => {
    const team = getPublishedTeamMembers()
    expect(team.length).toBeGreaterThanOrEqual(5)
    for (const member of team) {
      const title = buildTeamSeoTitle(member.displayName, member.roleTitle)
      const desc = buildTeamSeoDescription(member.shortBio)
      expect(title.length).toBeLessThanOrEqual(60)
      expect(desc.length).toBeLessThanOrEqual(160)
      expect(desc).not.toContain('*')
    }

    const articles = getAllNormalizedArticles()
    expect(articles.length).toBeGreaterThan(0)
    for (const article of articles) {
      const title = buildArticleSeoTitle(article.seoTitle, article.title)
      const desc = buildArticleSeoDescription(article.seoDescription, article.excerpt)
      expect(title.length).toBeLessThanOrEqual(60)
      expect(desc.length).toBeLessThanOrEqual(160)
      expect(desc).not.toContain('*')
    }

    const cut = truncateAtWordBoundary(
      'Pendampingan hukum strategis bagi perusahaan dalam sengketa korporasi di Jakarta Pusat dan Indonesia.',
      60,
    )
    expect(cut.length).toBeLessThanOrEqual(60)
    expect(cut).toBe('Pendampingan hukum strategis bagi perusahaan dalam sengketa')
  })

  it('builds OpenGraph image alt text and canonical metadata with .com domain', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fsdanrekan.id'
    const meta = buildPageMetadata({
      title: 'Pengacara Sengketa Tanah Jakarta | FS dan Rekan',
      description: 'Pendampingan sengketa tanah di Jakarta Pusat.',
      path: '/layanan/sengketa-pertanahan-dan-agraria',
      ogImage: '/images/practice-land.webp',
      ogImageAlt: 'Ilustrasi layanan hukum Sengketa Pertanahan dan Agraria',
    })

    expect(meta.alternates?.canonical).toBe(
      'https://fsdanrekan.com/layanan/sengketa-pertanahan-dan-agraria',
    )
    const ogImages = Array.isArray(meta.openGraph?.images) ? meta.openGraph.images : []
    expect(ogImages.length).toBe(1)
    expect((ogImages[0] as { url: string; alt?: string }).url).toBe(
      'https://fsdanrekan.com/images/practice-land.webp',
    )
    expect((ogImages[0] as { alt?: string }).alt).toBe(
      'Ilustrasi layanan hukum Sengketa Pertanahan dan Agraria',
    )
  })
})

describe('Schema LegalService, robots & sitemap integrity', () => {
  it('omits optional alternateName and sameAs links when empty, and includes them when populated', () => {
    const schemaDefault = buildLegalServiceJsonLd({
      siteUrl: 'https://fsdanrekan.id',
      settings: {
        firmName: OFFICIAL_FIRM_NAME,
        shortBrandName: 'FS dan Rekan',
        formerFirmName: '',
        whatsappDisplay: '+62 811-830-991',
        inquiryRecipientEmail: 'konsultasi@fsdanrekan.id',
        instagramUrl: 'https://www.instagram.com/fsdanrekan/',
        linkedinUrl: '',
        mapsProfileUrl: '',
      },
    })

    expect(schemaDefault.url).toBe('https://fsdanrekan.com')
    expect(schemaDefault.email).toBe('konsultasi@fsdanrekan.com')
    expect(schemaDefault.telephone).toBe('+62 811-830-991')
    expect(schemaDefault.alternateName).toBe('FS dan Rekan')
    expect(schemaDefault.sameAs).toEqual(['https://www.instagram.com/fsdanrekan/'])

    const schemaPopulated = buildLegalServiceJsonLd({
      siteUrl: 'https://fsdanrekan.com',
      settings: {
        firmName: OFFICIAL_FIRM_NAME,
        shortBrandName: 'FS dan Rekan',
        formerFirmName: 'Nama Terdahulu Terkonfirmasi',
        whatsappDisplay: '+62 811-830-991',
        inquiryRecipientEmail: 'konsultasi@fsdanrekan.com',
        instagramUrl: 'https://www.instagram.com/fsdanrekan/',
        linkedinUrl: 'https://www.linkedin.com/company/fsdanrekan/',
        mapsProfileUrl: 'https://maps.app.goo.gl/contohPeta',
      },
    })

    expect(schemaPopulated.alternateName).toEqual([
      'FS dan Rekan',
      'Nama Terdahulu Terkonfirmasi',
    ])
    expect(schemaPopulated.sameAs).toEqual([
      'https://www.instagram.com/fsdanrekan/',
      'https://www.linkedin.com/company/fsdanrekan/',
      'https://maps.app.goo.gl/contohPeta',
    ])
    expect(schemaPopulated.hasMap).toBe('https://maps.app.goo.gl/contohPeta')
  })

  it('generates robots.txt and sitemap.xml strictly with https://fsdanrekan.com and without drafts', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fsdanrekan.id'
    const robotsCfg = robots()
    expect(robotsCfg.sitemap).toBe('https://fsdanrekan.com/sitemap.xml')
    expect(JSON.stringify(robotsCfg)).not.toContain('fsdanrekan.id')
    expect(JSON.stringify(robotsCfg)).not.toContain('localhost')

    const entries = await sitemap()
    expect(entries.length).toBeGreaterThanOrEqual(20)
    const urls = entries.map((e) => e.url)
    for (const url of urls) {
      expect(url.startsWith('https://fsdanrekan.com')).toBe(true)
      expect(url).not.toContain('fsdanrekan.id')
      expect(url).not.toContain('localhost')
    }
    expect(urls.some((u) => u.includes('draf-internal-belum-terbit'))).toBe(false)
  })
})
