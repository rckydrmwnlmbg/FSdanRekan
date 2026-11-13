/**
 * Pure math and configuration helpers for client-side image cropping.
 * Designed with zero DOM dependencies so all geometry calculations can be
 * thoroughly unit-tested in Node/Vitest.
 */

export type ImageCropPreset =
  | 'article-cover'
  | 'team-photo'
  | 'practice-header'
  | 'case-record'
  | 'media-library'

export type CropRatioOptionId = '16:9' | '4:5' | '3:2' | '1:1' | 'free'

export interface CropRatioOption {
  id: CropRatioOptionId
  label: string
  ratio: number | null // null means original/free aspect ratio
}

export interface SafeAreaGuide {
  /** Human-readable label shown inside the cropper overlay */
  label: string
  /** Optional secondary hint */
  hint?: string
  /** Guide shape type */
  type: 'center-box' | 'portrait-head-and-badge' | 'bottom-scrim' | 'top-badges'
  /** Width fraction (0-1) of the crop box for center-box */
  widthFraction?: number
  /** Height fraction (0-1) of the crop box */
  heightFraction?: number
  /** Bottom reserved fraction (0-1) for overlaid labels/scrim */
  bottomReservedFraction?: number
  /** Top reserved fraction (0-1) for corner badges */
  topReservedFraction?: number
}

export interface CropPresetConfig {
  id: ImageCropPreset
  title: string
  defaultRatioId: CropRatioOptionId
  ratioOptions: CropRatioOption[]
  recommendedMinWidth: number
  recommendedMinHeight: number
  safeArea: SafeAreaGuide | null
  siteFrameDescription: string
}

/**
 * Actual dimensions of the secondary article card thumbnail on the homepage
 * (.article-card-item -> grid-template-columns: 150px 1fr in globals.css).
 * Typical card height with 2-3 lines of title + badge + link + padding is ~165px.
 */
export const SECONDARY_ARTICLE_CARD_WIDTH_PX = 150
export const SECONDARY_ARTICLE_CARD_ESTIMATED_HEIGHT_PX = 165

/**
 * Computes the horizontal visible width fraction of a 16:9 article cover
 * when rendered inside the narrow 150px secondary card frame with object-fit: cover.
 */
export function computeSecondaryArticleCardVisibleFraction(
  cropAspectRatio: number = 16 / 9,
  cardWidthPx: number = SECONDARY_ARTICLE_CARD_WIDTH_PX,
  cardHeightPx: number = SECONDARY_ARTICLE_CARD_ESTIMATED_HEIGHT_PX,
): number {
  if (cropAspectRatio <= 0 || cardWidthPx <= 0 || cardHeightPx <= 0) {
    return 0.5
  }
  const cardAspect = cardWidthPx / cardHeightPx
  const fraction = cardAspect / cropAspectRatio
  return Math.max(0.2, Math.min(1, Number(fraction.toFixed(4))))
}

export const CROP_PRESET_CONFIGS: Record<ImageCropPreset, CropPresetConfig> = {
  'article-cover': {
    id: 'article-cover',
    title: 'Sesuaikan Foto Sampul Artikel',
    defaultRatioId: '16:9',
    ratioOptions: [{ id: '16:9', label: '16:9 (Standar Artikel)', ratio: 16 / 9 }],
    recommendedMinWidth: 800,
    recommendedMinHeight: 450,
    safeArea: {
      type: 'center-box',
      label: 'Area yang tampil di kartu kecil',
      hint: 'Objek utama di tengah juga cocok untuk pratinjau tautan media sosial.',
      widthFraction: computeSecondaryArticleCardVisibleFraction(16 / 9),
      heightFraction: 1,
    },
    siteFrameDescription: 'Bingkai 16:9 untuk halaman detail & daftar artikel, serta potongan tengah untuk kartu kecil Beranda.',
  },
  'team-photo': {
    id: 'team-photo',
    title: 'Sesuaikan Foto Profil Tim',
    defaultRatioId: '4:5',
    ratioOptions: [{ id: '4:5', label: '4:5 (Potret Tegak)', ratio: 4 / 5 }],
    recommendedMinWidth: 500,
    recommendedMinHeight: 625,
    safeArea: {
      type: 'portrait-head-and-badge',
      label: 'Area aman wajah & label nama',
      hint: 'Posisikan mata di garis atas; hindari bagian bawah agar tidak tertutup label nama.',
      bottomReservedFraction: 0.16,
    },
    siteFrameDescription: 'Bingkai potret 4:5 untuk kartu tim, modal profil, dan halaman detail advokat.',
  },
  'practice-header': {
    id: 'practice-header',
    title: 'Sesuaikan Gambar Header Layanan',
    defaultRatioId: '16:9',
    ratioOptions: [
      { id: '16:9', label: '16:9 (Halaman Detail)', ratio: 16 / 9 },
      { id: '3:2', label: '3:2 (Panggung Beranda)', ratio: 3 / 2 },
    ],
    recommendedMinWidth: 800,
    recommendedMinHeight: 450,
    safeArea: {
      type: 'bottom-scrim',
      label: 'Area tertutup teks layanan di Beranda',
      hint: 'Fokus foto sebaiknya berada di separuh bagian atas.',
      bottomReservedFraction: 0.48,
    },
    siteFrameDescription: 'Bingkai 16:9 di halaman layanan dan latar panggung Beranda.',
  },
  'case-record': {
    id: 'case-record',
    title: 'Sesuaikan Foto Rekam Jejak',
    defaultRatioId: '16:9',
    ratioOptions: [
      { id: '16:9', label: '16:9 (Standar Kartu & Galeri)', ratio: 16 / 9 },
      { id: 'free', label: 'Bebas / Asli', ratio: null },
    ],
    recommendedMinWidth: 800,
    recommendedMinHeight: 450,
    safeArea: {
      type: 'top-badges',
      label: 'Area lencana wilayah & jumlah foto',
      hint: 'Sudut kiri dan kanan atas akan ditempeli lencana informasi.',
      topReservedFraction: 0.16,
    },
    siteFrameDescription: 'Bingkai 16:9 untuk kartu sampul dan jendela galeri perkara.',
  },
  'media-library': {
    id: 'media-library',
    title: 'Sesuaikan Foto Pustaka',
    defaultRatioId: 'free',
    ratioOptions: [
      { id: 'free', label: 'Bebas / Asli', ratio: null },
      { id: '16:9', label: '16:9 (Artikel/Layanan)', ratio: 16 / 9 },
      { id: '4:5', label: '4:5 (Foto Tim)', ratio: 4 / 5 },
      { id: '1:1', label: '1:1 (Persegi)', ratio: 1 },
    ],
    recommendedMinWidth: 600,
    recommendedMinHeight: 400,
    safeArea: null,
    siteFrameDescription: 'Pustaka foto serbaguna untuk artikel, profil tim, atau layanan.',
  },
}

export interface CropViewportInput {
  sourceWidth: number
  sourceHeight: number
  frameWidth: number
  frameHeight: number
  zoom: number
  panX: number
  panY: number
  maxOutputDimension?: number
}

export interface CropCalculationResult {
  /** Effective scale factor from source pixels to CSS frame pixels */
  scale: number
  /** Clamped horizontal pan in CSS pixels */
  clampedPanX: number
  /** Clamped vertical pan in CSS pixels */
  clampedPanY: number
  /** Maximum horizontal pan allowed in CSS pixels */
  maxPanX: number
  /** Maximum vertical pan allowed in CSS pixels */
  maxPanY: number
  /** Rendered image width in CSS pixels */
  renderedWidth: number
  /** Rendered image height in CSS pixels */
  renderedHeight: number
  /** Source rectangle X in source pixels */
  sx: number
  /** Source rectangle Y in source pixels */
  sy: number
  /** Source rectangle width in source pixels */
  sw: number
  /** Source rectangle height in source pixels */
  sh: number
  /** Final exported image width (capped at maxOutputDimension) */
  outputWidth: number
  /** Final exported image height (capped at maxOutputDimension) */
  outputHeight: number
}

/**
 * Calculates clamped pan offsets, source crop coordinates, and final output dimensions.
 */
export function calculateCropRect(input: CropViewportInput): CropCalculationResult {
  const {
    sourceWidth,
    sourceHeight,
    frameWidth,
    frameHeight,
    zoom,
    panX,
    panY,
    maxOutputDimension = 1600,
  } = input

  if (sourceWidth <= 0 || sourceHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    return {
      scale: 1,
      clampedPanX: 0,
      clampedPanY: 0,
      maxPanX: 0,
      maxPanY: 0,
      renderedWidth: 0,
      renderedHeight: 0,
      sx: 0,
      sy: 0,
      sw: 0,
      sh: 0,
      outputWidth: 0,
      outputHeight: 0,
    }
  }

  const safeZoom = Math.max(1, Math.min(4, zoom))
  const baseScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight)
  const scale = baseScale * safeZoom

  const renderedWidth = sourceWidth * scale
  const renderedHeight = sourceHeight * scale

  const maxPanX = Math.max(0, (renderedWidth - frameWidth) / 2)
  const maxPanY = Math.max(0, (renderedHeight - frameHeight) / 2)

  const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, panX)) || 0
  const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, panY)) || 0

  const imgLeft = (frameWidth - renderedWidth) / 2 + clampedPanX
  const imgTop = (frameHeight - renderedHeight) / 2 + clampedPanY

  const sx = Math.max(0, Math.min(sourceWidth - 1, -imgLeft / scale))
  const sy = Math.max(0, Math.min(sourceHeight - 1, -imgTop / scale))
  const sw = Math.max(1, Math.min(sourceWidth - sx, frameWidth / scale))
  const sh = Math.max(1, Math.min(sourceHeight - sy, frameHeight / scale))

  let outputWidth = Math.round(sw)
  let outputHeight = Math.round(sh)

  if (outputWidth > maxOutputDimension || outputHeight > maxOutputDimension) {
    if (outputWidth >= outputHeight) {
      outputHeight = Math.max(1, Math.round((outputHeight * maxOutputDimension) / outputWidth))
      outputWidth = maxOutputDimension
    } else {
      outputWidth = Math.max(1, Math.round((outputWidth * maxOutputDimension) / outputHeight))
      outputHeight = maxOutputDimension
    }
  }

  return {
    scale,
    clampedPanX,
    clampedPanY,
    maxPanX,
    maxPanY,
    renderedWidth,
    renderedHeight,
    sx,
    sy,
    sw,
    sh,
    outputWidth,
    outputHeight,
  }
}

/**
 * Checks whether the cropped region is smaller than recommended frame dimensions.
 */
export function checkCropResolutionWarning(
  croppedSourceWidth: number,
  croppedSourceHeight: number,
  preset: ImageCropPreset,
): string | null {
  const config = CROP_PRESET_CONFIGS[preset]
  if (
    croppedSourceWidth < config.recommendedMinWidth ||
    croppedSourceHeight < config.recommendedMinHeight
  ) {
    return 'Foto ini kecil, hasilnya mungkin kurang tajam.'
  }
  return null
}

/**
 * Computes safe working dimensions for pre-scaling huge mobile camera images
 * so Canvas operations do not exhaust mobile browser memory.
 */
export function computeSafeWorkingDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWorkingDimension: number = 2400,
): { width: number; height: number; downscaled: boolean } {
  if (naturalWidth <= maxWorkingDimension && naturalHeight <= maxWorkingDimension) {
    return { width: naturalWidth, height: naturalHeight, downscaled: false }
  }
  if (naturalWidth >= naturalHeight) {
    return {
      width: maxWorkingDimension,
      height: Math.max(1, Math.round((naturalHeight * maxWorkingDimension) / naturalWidth)),
      downscaled: true,
    }
  }
  return {
    width: Math.max(1, Math.round((naturalWidth * maxWorkingDimension) / naturalHeight)),
    height: maxWorkingDimension,
    downscaled: true,
  }
}
