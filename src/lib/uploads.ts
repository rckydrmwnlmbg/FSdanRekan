import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB (FR-6.8 / SEC-013)

export const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/**
 * Resolve persistent upload directory outside Next.js build output (.next).
 * Defaults to <project_root>/uploads when UPLOAD_DIR is not set.
 */
export function getUploadDir(): string {
  const configured = (process.env.UPLOAD_DIR || '').trim()
  const resolved = configured
    ? path.resolve(process.cwd(), configured)
    : path.resolve(process.cwd(), 'uploads')
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true })
  }
  return resolved
}

/**
 * SEC-013: Inspect binary magic bytes to verify genuine JPEG, PNG, or WebP image content.
 * Rejects SVG, HTML, PHP, or polyglot scripts masquerading with an image extension.
 */
export function detectImageMimeFromBytes(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) {
    return null
  }

  // Reject if buffer starts with XML/HTML/SVG tags even if padded with whitespace
  const headAscii = buffer.subarray(0, 128).toString('utf8').trimStart().toLowerCase()
  if (
    headAscii.startsWith('<svg') ||
    headAscii.startsWith('<?xml') ||
    headAscii.startsWith('<!doctype') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<script')
  ) {
    return null
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

/**
 * SEC-013: Validate and sanitize a relative path inside UPLOAD_DIR (anti-path-traversal).
 * Returns null if the path is unsafe or attempts directory traversal.
 */
export function resolveSafeUploadFilePath(pathSegments: string[]): {
  fullPath: string
  filename: string
  mimeType: string
} | null {
  if (!Array.isArray(pathSegments) || pathSegments.length !== 1) {
    return null
  }

  const rawName = pathSegments[0] ?? ''
  if (
    !rawName ||
    rawName.includes('..') ||
    rawName.includes('/') ||
    rawName.includes('\\') ||
    rawName.includes('\0') ||
    !/^[a-zA-Z0-9._-]+$/.test(rawName)
  ) {
    return null
  }

  const ext = path.extname(rawName).toLowerCase()
  const mimeType = EXTENSION_TO_MIME[ext]
  if (!mimeType) {
    return null
  }

  const baseDir = getUploadDir()
  const fullPath = path.resolve(baseDir, rawName)
  const relative = path.relative(baseDir, fullPath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  return { fullPath, filename: rawName, mimeType }
}

/**
 * Validate and persist an uploaded image buffer to UPLOAD_DIR with a randomized filename (SEC-013).
 */
export function saveValidatedImageUpload(params: {
  buffer: Buffer
  declaredMimeType?: string
  originalFilename?: string
}): {
  filename: string
  originalName: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  url: string
} {
  const { buffer, declaredMimeType, originalFilename = 'upload' } = params

  if (!buffer || buffer.length === 0) {
    throw new Error('File gambar kosong.')
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimum 5 MB.')
  }

  if (declaredMimeType && !ALLOWED_IMAGE_MIMES[declaredMimeType.toLowerCase()]) {
    throw new Error('Tipe file tidak diizinkan. Hanya JPEG, PNG, dan WebP yang diperbolehkan.')
  }

  const detectedMime = detectImageMimeFromBytes(buffer)
  if (!detectedMime) {
    throw new Error('Isi file bukan gambar JPEG, PNG, atau WebP yang valid (SVG/script ditolak).')
  }

  if (declaredMimeType && declaredMimeType.toLowerCase() !== detectedMime) {
    throw new Error('Tipe MIME file tidak sesuai dengan isi biner gambar.')
  }

  const ext = ALLOWED_IMAGE_MIMES[detectedMime] ?? '.webp'
  const randomSuffix = crypto.randomBytes(8).toString('hex')
  const filename = `media-${Date.now()}-${randomSuffix}${ext}`
  const safeOriginal = path
    .basename(originalFilename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180)

  const uploadDir = getUploadDir()
  const destPath = path.join(uploadDir, filename)
  fs.writeFileSync(destPath, buffer, { flag: 'wx' })

  return {
    filename,
    originalName: safeOriginal || filename,
    mimeType: detectedMime,
    sizeBytes: buffer.length,
    url: `/uploads/${filename}`,
  }
}

