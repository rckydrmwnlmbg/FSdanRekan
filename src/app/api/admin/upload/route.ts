import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSessionFromRequest, verifyAdminCsrf } from '@/lib/admin-auth'
import { getDbPool } from '@/lib/db'
import { assertSameOrigin } from '@/lib/security/origin'
import { saveValidatedImageUpload } from '@/lib/uploads'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JsonUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(180),
    mimeType: z.string().trim().min(1).max(64),
    altText: z.string().trim().max(255).optional().default(''),
    dataBase64: z.string().min(8),
  })
  .strict()

export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req)

    const session = await getAdminSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
    }
    if (session.mustChangePassword) {
      return NextResponse.json(
        { error: 'Wajib mengganti kata sandi awal sebelum mengunggah media.' },
        { status: 403 },
      )
    }
    if (!verifyAdminCsrf(req, session)) {
      return NextResponse.json({ error: 'Sesi keamanan telah kedaluwarsa. Silakan muat ulang halaman.' }, { status: 403 })
    }

    const contentType = req.headers.get('content-type') || ''
    let buffer: Buffer
    let declaredMimeType = ''
    let originalFilename = 'upload'
    let altText = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const fileEntry = formData.get('file')
      const altEntry = formData.get('altText')
      if (!(fileEntry instanceof File)) {
        return NextResponse.json({ error: 'File gambar tidak ditemukan.' }, { status: 400 })
      }
      declaredMimeType = fileEntry.type
      originalFilename = fileEntry.name
      altText = typeof altEntry === 'string' ? altEntry.trim().slice(0, 255) : ''
      const arrayBuf = await fileEntry.arrayBuffer()
      buffer = Buffer.from(arrayBuf)
    } else if (contentType.includes('application/json')) {
      const rawJson = await req.json().catch(() => null)
      const parsed = JsonUploadSchema.safeParse(rawJson)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Data unggahan tidak valid.' }, { status: 400 })
      }
      declaredMimeType = parsed.data.mimeType
      originalFilename = parsed.data.filename
      altText = parsed.data.altText
      const cleanB64 = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, '')
      buffer = Buffer.from(cleanB64, 'base64')
    } else {
      return NextResponse.json({ error: 'Format unggahan tidak didukung.' }, { status: 415 })
    }

    let saved: ReturnType<typeof saveValidatedImageUpload>
    try {
      saved = saveValidatedImageUpload({
        buffer,
        declaredMimeType,
        originalFilename,
      })
    } catch (validationErr) {
      return NextResponse.json(
        {
          error:
            validationErr instanceof Error
              ? validationErr.message
              : 'File gambar ditolak oleh pemeriksaan keamanan.',
        },
        { status: 400 },
      )
    }

    const assetId = `media-${Date.now()}`
    const finalAlt = altText || `Media ${saved.originalName}`

    const pool = getDbPool()
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO \`media_assets\`
            (\`id\`, \`filename\`, \`original_name\`, \`mime_type\`, \`size_bytes\`, \`alt_text\`, \`url\`, \`uploaded_by\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assetId,
            saved.filename,
            saved.originalName,
            saved.mimeType,
            saved.sizeBytes,
            finalAlt,
            saved.url,
            session.email,
          ],
        )
        await pool.query(
          `INSERT INTO \`audit_logs\`
            (\`id\`, \`actor\`, \`action\`, \`collection_name\`, \`target_id\`, \`detail\`)
           VALUES (?, ?, 'UPLOAD_MEDIA', 'media_assets', ?, ?)`,
          [
            `audit-${Date.now()}`,
            session.email,
            assetId,
            `Unggah gambar ${saved.filename} (${saved.mimeType}, ${saved.sizeBytes} bytes)`,
          ],
        )
      } catch {
        // File is already persisted to UPLOAD_DIR
      }
    }

    return NextResponse.json(
      {
        ok: true,
        asset: {
          id: assetId,
          filename: saved.filename,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          altText: finalAlt,
          url: saved.url,
        },
      },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof Response) {
      return e
    }
    logger.error(
      { errName: e instanceof Error ? e.name : 'UploadError' },
      'Admin media upload failed',
    )
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengunggah gambar.' }, { status: 500 })
  }
}

