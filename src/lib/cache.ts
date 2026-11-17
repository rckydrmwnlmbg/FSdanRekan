import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'

export const PUBLIC_REVALIDATE_SECONDS = 60

export const CACHE_TAGS = {
  siteSettings: 'cms-site-settings',
  articles: 'cms-articles',
  practiceAreas: 'cms-practice-areas',
  teamMembers: 'cms-team-members',
  caseRecords: 'cms-case-records',
  instagramGallery: 'cms-instagram-gallery',
} as const

export type CmsCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

function isTestRuntime(): boolean {
  return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
}

/**
 * Wrap a public CMS read query with Next.js Data Cache (`unstable_cache`) tagged for instant
 * on-demand invalidation when staff save changes in `/admin`.
 * Bypasses Next.js cache automatically in Vitest/unit tests where Next incrementalCache is absent.
 */
export async function cachedCmsRead<T>(
  keyParts: string[],
  fn: () => Promise<T>,
  tags: CmsCacheTag[],
  revalidateSeconds: number = PUBLIC_REVALIDATE_SECONDS,
): Promise<T> {
  if (isTestRuntime()) {
    return fn()
  }

  try {
    const cachedFn = unstable_cache(fn, keyParts, {
      revalidate: revalidateSeconds,
      tags,
    })
    return await cachedFn()
  } catch {
    return fn()
  }
}

export function safeRevalidateTag(tag: CmsCacheTag): void {
  if (isTestRuntime()) return
  try {
    revalidateTag(tag)
  } catch {
    // Ignore when called outside Next.js server request context
  }
}

export function safeRevalidatePath(path: string, type?: 'page' | 'layout'): void {
  if (isTestRuntime()) return
  try {
    revalidatePath(path, type)
  } catch {
    // Ignore when called outside Next.js server request context
  }
}

export type CmsMutationModule =
  | 'article'
  | 'category'
  | 'practice_area'
  | 'team_member'
  | 'case_record'
  | 'site_settings'
  | 'instagram'
  | 'system'

/**
 * Immediately invalidate Next.js Data Cache & Full Route Cache after an admin mutation
 * so public pages reflect saved changes within seconds while drafts remain strictly hidden.
 */
export function revalidateCmsPublicPages(
  moduleName: CmsMutationModule,
  slugs?: Array<string | undefined | null>,
): void {
  const cleanSlugs = Array.from(
    new Set((slugs ?? []).map((s) => (s || '').trim()).filter(Boolean)),
  )

  switch (moduleName) {
    case 'site_settings':
      safeRevalidateTag(CACHE_TAGS.siteSettings)
      safeRevalidatePath('/', 'layout')
      safeRevalidatePath('/')
      safeRevalidatePath('/artikel')
      safeRevalidatePath('/kebijakan-privasi')
      safeRevalidatePath('/layanan/[slug]', 'page')
      safeRevalidatePath('/tim/[slug]', 'page')
      safeRevalidatePath('/artikel/[slug]', 'page')
      break

    case 'article':
    case 'category':
      safeRevalidateTag(CACHE_TAGS.articles)
      safeRevalidatePath('/')
      safeRevalidatePath('/artikel')
      safeRevalidatePath('/artikel/[slug]', 'page')
      for (const slug of cleanSlugs) {
        safeRevalidatePath(`/artikel/${slug}`)
      }
      safeRevalidatePath('/layanan/[slug]', 'page')
      safeRevalidatePath('/sitemap.xml')
      break

    case 'practice_area':
      safeRevalidateTag(CACHE_TAGS.practiceAreas)
      safeRevalidatePath('/')
      safeRevalidatePath('/layanan/[slug]', 'page')
      for (const slug of cleanSlugs) {
        safeRevalidatePath(`/layanan/${slug}`)
      }
      safeRevalidatePath('/sitemap.xml')
      break

    case 'team_member':
      safeRevalidateTag(CACHE_TAGS.teamMembers)
      safeRevalidatePath('/')
      safeRevalidatePath('/tim/[slug]', 'page')
      for (const slug of cleanSlugs) {
        safeRevalidatePath(`/tim/${slug}`)
      }
      safeRevalidatePath('/layanan/[slug]', 'page')
      safeRevalidatePath('/sitemap.xml')
      break

    case 'case_record':
      safeRevalidateTag(CACHE_TAGS.caseRecords)
      safeRevalidatePath('/')
      break

    case 'instagram':
      safeRevalidateTag(CACHE_TAGS.instagramGallery)
      safeRevalidatePath('/')
      break

    case 'system':
      Object.values(CACHE_TAGS).forEach((tag) => safeRevalidateTag(tag))
      safeRevalidatePath('/', 'layout')
      safeRevalidatePath('/')
      safeRevalidatePath('/artikel')
      safeRevalidatePath('/kebijakan-privasi')
      safeRevalidatePath('/layanan/[slug]', 'page')
      safeRevalidatePath('/tim/[slug]', 'page')
      safeRevalidatePath('/artikel/[slug]', 'page')
      safeRevalidatePath('/sitemap.xml')
      break
  }
}
