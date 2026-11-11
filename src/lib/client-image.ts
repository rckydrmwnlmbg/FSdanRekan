/**
 * Utilitas pemrosesan foto di peramban (client-side) tanpa dependensi native.
 *
 * Fitur:
 * 1. Pengecilan dimensi proporsional (sisi terpanjang maksimal 1600 px).
 * 2. Pembersihan metadata sensitif (GPS & EXIF) melalui Canvas rendering.
 * 3. Koreksi orientasi gambar.
 * 4. Kompresi WebP dengan fallback otomatis ke JPEG.
 * 5. Deteksi format iPhone HEIC/HEIF dengan pesan panduan ramah.
 * 6. Penolakan upload file asli jika peramban gagal memproses demi melindungi privasi lokasi.
 */

export interface ProcessedImageResult {
  blob: Blob
  filename: string
  mimeType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
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

export async function processClientImageForUpload(file: File): Promise<ProcessedImageResult> {
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

  // Gunakan Image element untuk memuat gambar
  const objectUrl = URL.createObjectURL(file)
  let img: HTMLImageElement

  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image()
      imageEl.onload = () => resolve(imageEl)
      imageEl.onerror = () =>
        reject(
          new Error(
            'Foto tidak dapat dibaca oleh peramban. Pastikan berkas foto tidak rusak.',
          ),
        )
      imageEl.src = objectUrl
    })
  } catch (err) {
    URL.revokeObjectURL(objectUrl)
    throw err instanceof Error
      ? err
      : new Error('Gagal memuat gambar untuk pemrosesan.')
  }

  const naturalWidth = img.naturalWidth || img.width
  const naturalHeight = img.naturalHeight || img.height

  if (!naturalWidth || !naturalHeight) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('Dimensi gambar tidak valid atau tidak terbaca.')
  }

  // Hitung skala sisi terpanjang maksimal 1600 px
  const maxDimension = 1600
  let targetWidth = naturalWidth
  let targetHeight = naturalHeight

  if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
    if (naturalWidth >= naturalHeight) {
      targetHeight = Math.round((naturalHeight * maxDimension) / naturalWidth)
      targetWidth = maxDimension
    } else {
      targetWidth = Math.round((naturalWidth * maxDimension) / naturalHeight)
      targetHeight = maxDimension
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(objectUrl)
    throw new Error(
      'Foto tidak dapat diproses secara aman di peramban ini untuk membersihkan data lokasi (GPS). Demi privasi, silakan gunakan berkas JPG atau PNG standar.',
    )
  }

  // Gambar ke canvas (hanya pixel RGBA yang digambar, EXIF/GPS otomatis terhapus)
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  URL.revokeObjectURL(objectUrl)

  // Coba ekspor WebP terlebih dahulu
  let blob: Blob | null = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.85)
  })

  let finalMime: 'image/webp' | 'image/jpeg' = 'image/webp'
  let finalExt = '.webp'

  // Jika peramban tidak mendukung WebP pada toBlob, beralih ke JPEG
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

  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 50)

  const filename = `${cleanBaseName || 'foto'}${finalExt}`

  return {
    blob,
    filename,
    mimeType: finalMime,
    width: targetWidth,
    height: targetHeight,
  }
}

