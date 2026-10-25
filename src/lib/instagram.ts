import { InstagramGalleryItem, INITIAL_INSTAGRAM_GALLERY } from './content'

export interface InstagramMediaItem {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
}

export interface InstagramGraphApiResponse {
  data?: InstagramMediaItem[]
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
  }
}

export interface InstagramSyncResult {
  success: boolean
  source: 'live' | 'cache' | 'curated'
  items: InstagramGalleryItem[]
  message: string
  lastSyncAt?: string
}

/**
 * Fetch live posts from Instagram Graph API (SK-13 / TECH_STACK.md).
 * Gracefully falls back to cached or curated posts if token is missing or network fails.
 */
export async function fetchLiveInstagramMedia(
  accessToken?: string,
): Promise<InstagramSyncResult> {
  const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN

  if (!token) {
    return {
      success: false,
      source: 'curated',
      items: INITIAL_INSTAGRAM_GALLERY,
      message: 'INSTAGRAM_ACCESS_TOKEN belum dikonfigurasi. Menggunakan galeri edukasi kurasi.',
    }
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=6&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache 1 hour (SK-13)
    })

    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as InstagramGraphApiResponse
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`
      return {
        success: false,
        source: 'curated',
        items: INITIAL_INSTAGRAM_GALLERY,
        message: `Gagal mengambil data dari Instagram Graph API: ${errMsg}`,
      }
    }

    const json = (await res.json()) as InstagramGraphApiResponse
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      return {
        success: true,
        source: 'curated',
        items: INITIAL_INSTAGRAM_GALLERY,
        message: 'Tidak ada postingan yang ditemukan di akun Instagram.',
      }
    }

    const liveItems: InstagramGalleryItem[] = json.data.map((item, index) => {
      const rawDate = item.timestamp ? new Date(item.timestamp) : new Date()
      const formattedDate = rawDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const fullCaption = item.caption?.trim() || 'Publikasi resmi Ferdinan Silalahi dan Rekan Law Firm.'
      const image = item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url

      // Auto-detect legal category from caption keywords
      let category = 'Publikasi Resmi'
      const lower = fullCaption.toLowerCase()
      if (lower.includes('korporasi') || lower.includes('kontrak') || lower.includes('bisnis')) {
        category = 'Hukum Korporasi'
      } else if (lower.includes('tanah') || lower.includes('lahan') || lower.includes('properti') || lower.includes('agraria')) {
        category = 'Agraria & Properti'
      } else if (lower.includes('litigasi') || lower.includes('sidang') || lower.includes('pengadilan')) {
        category = 'Litigasi & Advokasi'
      } else if (lower.includes('pailit') || lower.includes('pkpu') || lower.includes('utang')) {
        category = 'Kepailitan & PKPU'
      } else if (lower.includes('merek') || lower.includes('hki') || lower.includes('cipta')) {
        category = 'Kekayaan Intelektual'
      } else if (lower.includes('keluarga') || lower.includes('waris') || lower.includes('perdata')) {
        category = 'Hukum Perdata'
      }

      return {
        id: `ig-live-${item.id}`,
        imageUrl: image,
        alt: `Postingan Instagram: ${fullCaption.slice(0, 60)} – Ferdinan Silalahi dan Rekan Law Firm`,
        category,
        caption: fullCaption.length > 180 ? `${fullCaption.slice(0, 180)}...` : fullCaption,
        publishedDate: formattedDate,
        permalink: item.permalink || 'https://instagram.com/',
        displayOrder: index + 1,
        isPublished: true,
      }
    })

    return {
      success: true,
      source: 'live',
      items: liveItems,
      message: `Berhasil memuat ${liveItems.length} postingan langsung dari Instagram.`,
      lastSyncAt: new Date().toISOString(),
    }
  } catch (error) {
    const errText = error instanceof Error ? error.message : 'Kesalahan jaringan'
    return {
      success: false,
      source: 'curated',
      items: INITIAL_INSTAGRAM_GALLERY,
      message: `Kesalahan saat menghubungkan ke Instagram: ${errText}`,
    }
  }
}
