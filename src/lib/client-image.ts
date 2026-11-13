import { computeSafeWorkingDimensions } from '@/lib/crop-math'

/**
 * Utilitas pemrosesan foto di peramban (client-side) tanpa dependensi native.
 *
 * Fitur:
 * 1. Pengecilan dimensi proporsional (sisi terpanjang maksimal 1600 px).
 * 2. Pembersihan metadata sensitif (GPS & EXIF) melalui Canvas rendering.
 * 3. Koreksi orientasi gambar EXIF (via createImageBitmap imageOrientation: 'from-image').
 * 4. Pembatasan ukuran gambar sumber di Canvas kerja (maks 2400 px) agar aman untuk memori HP.
 * 5. Kompresi WebP dengan fallback otomatis ke JPEG.
 * 6. Deteksi format iPhone HEIC/HEIF dengan pesan panduan ramah.
 * 7. Penolakan upload file asli jika peramban gagal memproses demi melindungi privasi lokasi.
 */

export interface ProcessedImageResult {
  blob: Blob
  filename: string
  mimeType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
}

export interface LoadedCropSource {
  previewUrl: string
  sourceElement: HTMLCanvasElement | HTMLImageElement
  width: number
  height: number
  originalFilename: string
  cleanup: () => void
}

export function isHeicFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

export function validateClientImageFile(file: File): void {
  if (isHeicFile(file)) {
    throw new Error(
      'Format HEIC dari iPhone belum didukung langsung oleh peramban. Silakan ubah foto ke format JPG/PNG atau pilih opsi "Paling Kompatibel" di pengaturan kamera iPhone Anda.',
    )
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const validExts = ['.jpg', '.jpeg', '.png', '.webp']
  const lowerName = file.name.toLowerCase()
  const hasValidExt = validExts.some((ext) => lowerName.endsWith(ext))

  if (!validTypes.includes(file.type) && !hasValidExt) {
    throw new Error(
      'Format berkas tidak didukung. Harap pilih foto berformat JPG, PNG, atau WebP.',
    )
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Ukuran foto terlalu besar untuk diproses (maksimal 25 MB).')
  }
}

function sanitizeOutputFilename(rawName: string, ext: string): string {
  const cleanBaseName = rawName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 50)
  return `${cleanBaseName || 'foto'}${ext}`
}

async function exportCanvasToProcessedImage(
  canvas: HTMLCanvasElement,
  rawName: string,
): Promise<ProcessedImageResult> {
  let blob: Blob | null = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.85)
  })

  let finalMime: 'image/webp' | 'image/jpeg' = 'image/webp'
  let finalExt = '.webp'

  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
    })
    finalMime = 'image/jpeg'
    finalExt = '.jpg'
  }

  if (!blob) {
    throw new Error(
      'Gagal mengompresi foto. Demi privasi dan pencegahan kebocoran data lokasi (GPS), foto asli tidak diunggah otomatis. Harap gunakan foto JPG standar.',
    )
  }

  return {
    blob,
    filename: sanitizeOutputFilename(rawName, finalExt),
    mimeType: finalMime,
    width: canvas.width,
    height: canvas.height,
  }
}

/**
 * Loads an image from a File or existing URL into a memory-safe working element
 * with EXIF orientation applied and dimensions capped at 2400px for mobile safety.
 */
export async function loadSafeImageForCrop(source: File | string): Promise<LoadedCropSource> {
  let objectUrlToRevoke: string | null = null
  let bitmap: ImageBitmap | null = null
  let loadedImg: HTMLImageElement | null = null
  let naturalWidth = 0
  let naturalHeight = 0
  let originalFilename = 'foto.webp'

  try {
    if (typeof source !== 'string') {
      validateClientImageFile(source)
      originalFilename = source.name || 'foto.webp'

      if (typeof createImageBitmap === 'function') {
        try {
          bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
          naturalWidth = bitmap.width
          naturalHeight = bitmap.height
        } catch {
          bitmap = null
        }
      }

      if (!bitmap) {
        objectUrlToRevoke = URL.createObjectURL(source)
        loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () =>
            reject(new Error('Foto tidak dapat dibaca oleh peramban. Pastikan berkas foto tidak rusak.'))
          el.src = objectUrlToRevoke!
        })
        naturalWidth = loadedImg.naturalWidth || loadedImg.width
        naturalHeight = loadedImg.naturalHeight || loadedImg.height
      }
    } else {
      const cleanPath = source.split('?')[0] || 'foto'
      const lastSeg = cleanPath.split('/').pop()
      originalFilename = lastSeg && lastSeg.length > 0 ? lastSeg : 'foto-potong'

      loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.crossOrigin = 'anonymous'
        el.onload = () => resolve(el)
        el.onerror = () =>
          reject(
            new Error(
              'Foto dari tautan internet eksternal tidak dapat dipotong langsung demi keamanan peramban. Silakan unggah ulang berkas foto dari perangkat Anda.',
            ),
          )
        el.src = source
      })
      naturalWidth = loadedImg.naturalWidth || loadedImg.width
      naturalHeight = loadedImg.naturalHeight || loadedImg.height
    }

    if (!naturalWidth || !naturalHeight) {
      throw new Error('Dimensi gambar tidak valid atau tidak terbaca.')
    }

    const working = computeSafeWorkingDimensions(naturalWidth, naturalHeight, 2400)
    const workCanvas = document.createElement('canvas')
    workCanvas.width = working.width
    workCanvas.height = working.height

    const ctx = workCanvas.getContext('2d')
    if (!ctx) {
      throw new Error(
        'Foto tidak dapat diproses secara aman di peramban ini. Silakan coba muat ulang halaman.',
      )
    }

    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, working.width, working.height)
      bitmap.close()
      bitmap = null
    } else if (loadedImg) {
      ctx.drawImage(loadedImg, 0, 0, working.width, working.height)
    }

    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke)
      objectUrlToRevoke = null
    }

    // Uji apakah canvas tercemar CORS (tainted)
    try {
      ctx.getImageData(0, 0, 1, 1)
    } catch {
      workCanvas.width = 0
      workCanvas.height = 0
      throw new Error(
        'Foto dari tautan internet eksternal tidak dapat dipotong langsung demi keamanan peramban. Silakan unggah ulang berkas foto dari perangkat Anda.',
      )
    }

    const previewBlob = await new Promise<Blob | null>((resolve) => {
      workCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    })

    const previewUrl = previewBlob
      ? URL.createObjectURL(previewBlob)
      : workCanvas.toDataURL('image/jpeg', 0.85)

    return {
      previewUrl,
      sourceElement: workCanvas,
      width: working.width,
      height: working.height,
      originalFilename,
      cleanup: () => {
        if (previewBlob && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
        workCanvas.width = 0
        workCanvas.height = 0
      },
    }
  } catch (err) {
    if (bitmap) bitmap.close()
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
    throw err instanceof Error ? err : new Error('Gagal memuat gambar untuk pemrosesan.')
  }
}

/**
 * Renders the selected crop area to a clean Canvas (max 1600px, strips EXIF/GPS)
 * and exports WebP (or JPEG fallback).
 */
export async function renderCroppedImageForUpload(
  sourceElement: HTMLCanvasElement | HTMLImageElement,
  cropRect: { sx: number; sy: number; sw: number; sh: number; outputWidth: number; outputHeight: number },
  originalFilename: string,
): Promise<ProcessedImageResult> {
  const outCanvas = document.createElement('canvas')
  outCanvas.width = Math.max(1, Math.round(cropRect.outputWidth))
  outCanvas.height = Math.max(1, Math.round(cropRect.outputHeight))

  const ctx = outCanvas.getContext('2d')
  if (!ctx) {
    throw new Error(
      'Foto tidak dapat diproses secara aman di peramban ini untuk membersihkan data lokasi (GPS).',
    )
  }

  ctx.drawImage(
    sourceElement,
    cropRect.sx,
    cropRect.sy,
    cropRect.sw,
    cropRect.sh,
    0,
    0,
    outCanvas.width,
    outCanvas.height,
  )

  try {
    return await exportCanvasToProcessedImage(outCanvas, originalFilename)
  } finally {
    // Bebaskan memori Canvas segera setelah ekspor
    outCanvas.width = 0
    outCanvas.height = 0
  }
}

/**
 * Processes an image directly without cropping (resizes max 1600px, fixes EXIF orientation,
 * strips GPS/EXIF metadata, exports WebP or JPEG).
 */
export async function processClientImageForUpload(file: File): Promise<ProcessedImageResult> {
  const loaded = await loadSafeImageForCrop(file)
  try {
    const working = computeSafeWorkingDimensions(loaded.width, loaded.height, 1600)
    return await renderCroppedImageForUpload(
      loaded.sourceElement,
      {
        sx: 0,
        sy: 0,
        sw: loaded.width,
        sh: loaded.height,
        outputWidth: working.width,
        outputHeight: working.height,
      },
      loaded.originalFilename,
    )
  } finally {
    loaded.cleanup()
  }
}
