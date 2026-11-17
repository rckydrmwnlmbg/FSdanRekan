export const DEFAULT_INSTAGRAM_HANDLE = '@fsdanrekan'
export const DEFAULT_INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/fsdanrekan/'

export interface InstagramGalleryItem {
  id: string
  imageUrl: string
  alt: string
  category: string
  caption: string
  publishedDate: string
  permalink: string
  displayOrder: number
  isPublished: boolean
}

export const INITIAL_INSTAGRAM_GALLERY: InstagramGalleryItem[] = [
  {
    id: 'ig-real-1',
    imageUrl: 'https://www.instagram.com/p/DbTC57rEjrA/media/?size=l',
    alt: 'Postingan Instagram @fsdanrekan mengenai lobi dan mediasi penyelesaian sengketa',
    category: 'Mediasi & Sengketa',
    caption: 'Lobby dan mediasi sebagai langkah penyelesaian sengketa dari akun @fsdanrekan.',
    publishedDate: '',
    permalink: 'https://www.instagram.com/p/DbTC57rEjrA/',
    displayOrder: 1,
    isPublished: true,
  },
  {
    id: 'ig-real-2',
    imageUrl: 'https://www.instagram.com/p/DdGbn5YyKb_/media/?size=l',
    alt: 'Postingan Instagram @fsdanrekan mengenai profil Managing Partner',
    category: 'Profil Firma',
    caption: 'Ucapan ulang tahun kepada Managing Partner dari akun @fsdanrekan.',
    publishedDate: '',
    permalink: 'https://www.instagram.com/p/DdGbn5YyKb_/',
    displayOrder: 2,
    isPublished: true,
  },
  {
    id: 'ig-real-3',
    imageUrl: 'https://www.instagram.com/p/Dbp3d5PEuLe/media/?size=l',
    alt: 'Postingan Instagram @fsdanrekan mengenai materi praperadilan KUHAP baru',
    category: 'Hukum Acara Pidana',
    caption: 'Pembahasan materi praperadilan dalam KUHAP baru dari akun @fsdanrekan.',
    publishedDate: '',
    permalink: 'https://www.instagram.com/p/Dbp3d5PEuLe/',
    displayOrder: 3,
    isPublished: true,
  },
  {
    id: 'ig-real-4',
    imageUrl: 'https://www.instagram.com/p/Dc3H8MaGM_D/media/?size=l',
    alt: 'Postingan Instagram @fsdanrekan mengenai mekanisme Plea Bargaining',
    category: 'Litigasi Pidana',
    caption: 'Pembahasan mekanisme Plea Bargaining dalam hukum acara pidana dari akun @fsdanrekan.',
    publishedDate: '',
    permalink: 'https://www.instagram.com/p/Dc3H8MaGM_D/',
    displayOrder: 4,
    isPublished: true,
  },
  {
    id: 'ig-real-5',
    imageUrl: 'https://www.instagram.com/p/DawrpvRxxY7/media/?size=l',
    alt: 'Postingan Instagram @fsdanrekan mengenai wawasan advokasi dan kepemimpinan',
    category: 'Wawasan Advokasi',
    caption: 'Advokasi dan wawasan kepemimpinan dari akun @fsdanrekan.',
    publishedDate: '',
    permalink: 'https://www.instagram.com/p/DawrpvRxxY7/',
    displayOrder: 5,
    isPublished: true,
  },
]

const LEGACY_INSTAGRAM_HANDLES = new Set(['fhspartners'])
const RESERVED_INSTAGRAM_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'tv',
  'explore',
  'accounts',
])

function parseSafeInstagramUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw.trim())
    const host = parsed.hostname.toLowerCase()
    const isInstagramHost =
      host === 'instagram.com' || host === 'www.instagram.com' || host === 'instagr.am'
    if (!isInstagramHost || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Normalize an Instagram profile URL (or @username / username) into a canonical profile URL.
 * Automatically upgrades obsolete legacy handle references (@fhspartners) to @fsdanrekan.
 */
export function normalizeInstagramProfileUrl(
  rawValue?: unknown,
  fallbackUrl: string = DEFAULT_INSTAGRAM_PROFILE_URL,
): string {
  const candidate = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!candidate) {
    return fallbackUrl
  }

  // Allow plain "@username" or "username" inputs to resolve cleanly
  if (!candidate.includes('://') && !candidate.includes('.')) {
    const cleanHandle = candidate.replace(/^@+/, '').replace(/\/+$/, '')
    if (/^[a-zA-Z0-9._]{1,30}$/.test(cleanHandle)) {
      if (LEGACY_INSTAGRAM_HANDLES.has(cleanHandle.toLowerCase())) {
        return DEFAULT_INSTAGRAM_PROFILE_URL
      }
      return `https://www.instagram.com/${cleanHandle}/`
    }
    return fallbackUrl
  }

  const parsed = parseSafeInstagramUrl(candidate)
  if (!parsed) {
    return fallbackUrl
  }

  const firstSegment = parsed.pathname
    .split('/')
    .map((s) => s.trim())
    .find(Boolean)
    ?.replace(/^@+/, '')

  if (
    !firstSegment ||
    RESERVED_INSTAGRAM_SEGMENTS.has(firstSegment.toLowerCase()) ||
    LEGACY_INSTAGRAM_HANDLES.has(firstSegment.toLowerCase())
  ) {
    return DEFAULT_INSTAGRAM_PROFILE_URL
  }

  return `https://www.instagram.com/${firstSegment}/`
}

/**
 * Extract the @handle label from an Instagram profile URL, defaulting to @fsdanrekan.
 */
export function extractInstagramHandle(urlOrHandle?: unknown): string {
  const normalizedUrl = normalizeInstagramProfileUrl(urlOrHandle)
  const match = normalizedUrl.match(/instagram\.com\/([^/?#]+)/i)
  const rawSegment = match?.[1]?.replace(/^@+/, '').trim()
  if (
    !rawSegment ||
    RESERVED_INSTAGRAM_SEGMENTS.has(rawSegment.toLowerCase()) ||
    LEGACY_INSTAGRAM_HANDLES.has(rawSegment.toLowerCase())
  ) {
    return DEFAULT_INSTAGRAM_HANDLE
  }
  return `@${rawSegment}`
}

/**
 * Replace stale @fhspartners mentions in synced or seeded copy with the active handle.
 */
export function normalizeInstagramHandleMentions(
  text: string,
  targetHandle: string = DEFAULT_INSTAGRAM_HANDLE,
): string {
  return text.replace(/@fhspartners\b/gi, targetHandle)
}

export interface ParsedInstagramEmbedTarget {
  type: 'p' | 'reel' | 'tv'
  shortcode: string
  postUrl: string
  embedUrl: string
}

/**
 * Parse post, reel, or TV shortcodes from standard or username-prefixed Instagram URLs.
 */
export function parseInstagramEmbedTarget(
  permalink?: string | null,
): ParsedInstagramEmbedTarget | null {
  if (!permalink) return null
  const parsed = parseSafeInstagramUrl(permalink)
  if (!parsed) {
    return null
  }

  const match = parsed.pathname.match(/^\/(?:[^/]+\/)?(p|reel|reels|tv)\/([^/?#]+)/i)
  const rawKind = match?.[1]?.toLowerCase()
  const shortcode = match?.[2]?.trim()
  if (!rawKind || !shortcode || !/^[a-zA-Z0-9_-]+$/.test(shortcode)) {
    return null
  }
  const type: 'p' | 'reel' | 'tv' = rawKind.startsWith('reel')
    ? 'reel'
    : rawKind === 'tv'
      ? 'tv'
      : 'p'

  const postUrl = `https://www.instagram.com/${type}/${shortcode}/`
  return {
    type,
    shortcode,
    postUrl,
    embedUrl: `${postUrl}embed/`,
  }
}
