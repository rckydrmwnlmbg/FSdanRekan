import fs from 'node:fs'
import { NextResponse } from 'next/server'
import { detectImageMimeFromBytes, MAX_UPLOAD_BYTES, resolveSafeUploadFilePath } from '@/lib/uploads'

export const runtime = 'nodejs'

interface UploadRouteContext {
  params: Promise<{
    path: string[]
  }>
}

/**
 * GET /uploads/[...path]
 * Serves uploaded images from persistent UPLOAD_DIR (outside .next/standalone build folder)
 * with strict path traversal protection, MIME verification, and nosniff security headers.
 */
export async function GET(_req: Request, context: UploadRouteContext): Promise<Response> {
  const resolvedParams = await context.params
  const safeTarget = resolveSafeUploadFilePath(resolvedParams.path)
  if (!safeTarget) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (!fs.existsSync(safeTarget.fullPath)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(safeTarget.fullPath)
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_UPLOAD_BYTES) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const buffer = fs.readFileSync(safeTarget.fullPath)
  const verifiedMime = detectImageMimeFromBytes(buffer)
  if (!verifiedMime) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': verifiedMime,
      'Content-Length': String(buffer.length),
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="${safeTarget.filename}"`,
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

