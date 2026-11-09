import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { getAdminSessionFromRequest, verifyAdminCsrf } from '@/lib/admin-auth'
import {
  DEFAULT_SITE_SETTINGS,
  getAllNormalizedArticles,
  getPublicCaseRecords,
  getPublishedPracticeAreas,
  getPublishedTeamMembers,
} from '@/lib/content'
import { checkDatabaseHealth, getDbPool, runIdempotentDataMigration } from '@/lib/db'
import { assertSameOrigin } from '@/lib/security/origin'
import { hashPassword, validatePasswordStrength } from '@/lib/security/password'
import { cleanHtml } from '@/lib/security/sanitize'
import { isValidIndonesianWaNumber } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140)
}

function toMysqlDateTime(isoOrDate?: string): string {
  const parsed = isoOrDate ? new Date(isoOrDate) : new Date()
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ')
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === 'object') return raw as T
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

const ArticleUpsertSchema = z
  .object({
    module: z.literal('article'),
    action: z.literal('upsert'),
    id: z.string().trim().max(64).optional(),
    slug: z.string().trim().max(180).optional(),
    title: z.string().trim().min(3).max(255),
    excerpt: z.string().trim().min(5).max(1000),
    bodyHtml: z.string().trim().min(5).max(100000),
    coverUrl: z.string().trim().min(1).max(500).default('/images/practice-corporate.webp'),
    coverAlt: z.string().trim().max(255).optional(),
    categorySlug: z.string().trim().min(1).max(120),
    categoryName: z.string().trim().min(1).max(120),
    authorName: z.string().trim().min(2).max(120).default('Tim Redaksi FS dan Rekan'),
    status: z.enum(['draft', 'published']),
    publishedAt: z.string().trim().optional(),
    seoTitle: z.string().trim().max(160).optional(),
    seoDescription: z.string().trim().max(320).optional(),
  })
  .strict()

const ArticleDeleteSchema = z
  .object({
    module: z.literal('article'),
    action: z.literal('delete'),
    id: z.string().trim().min(1).max(64),
  })
  .strict()

const CategoryUpsertSchema = z
  .object({
    module: z.literal('category'),
    action: z.literal('upsert'),
    id: z.string().trim().max(64).optional(),
    slug: z.string().trim().max(120).optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().default(''),
  })
  .strict()

const CategoryDeleteSchema = z
  .object({
    module: z.literal('category'),
    action: z.literal('delete'),
    id: z.string().trim().min(1).max(64),
    slug: z.string().trim().min(1).max(120),
  })
  .strict()

const PracticeAreaUpsertSchema = z
  .object({
    module: z.literal('practice_area'),
    action: z.literal('upsert'),
    id: z.string().trim().max(64).optional(),
    slug: z.string().trim().max(140).optional(),
    name: z.string().trim().min(3).max(160),
    label: z.string().trim().min(2).max(64),
    summary: z.string().trim().min(5).max(1000),
    description: z.string().trim().min(3).max(255),
    advocacyScope: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
    image: z.string().trim().min(1).max(500).default('/images/practice-corporate.webp'),
    displayOrder: z.coerce.number().int().min(1).max(99).default(1),
    isPublished: z.boolean().default(true),
  })
  .strict()

const TeamMemberUpsertSchema = z
  .object({
    module: z.literal('team_member'),
    action: z.literal('upsert'),
    id: z.string().trim().max(64).optional(),
    slug: z.string().trim().max(140).optional(),
    fullName: z.string().trim().min(2).max(160),
    honorific: z.string().trim().max(120).default(''),
    roleTitle: z.string().trim().min(2).max(160),
    group: z.string().trim().min(2).max(120),
    motto: z.string().trim().max(255).nullable().optional(),
    shortBio: z.string().trim().min(10).max(200),
    fullBio: z.string().trim().min(20).max(15000),
    education: z.array(z.string().trim().min(1).max(255)).default([]),
    credentials: z.array(z.string().trim().min(1).max(255)).default([]),
    languages: z.array(z.string().trim().min(1).max(120)).default([]),
    tags: z.array(z.string().trim().min(1).max(120)).default([]),
    photoUrl: z.string().trim().min(1).max(500),
    displayOrder: z.coerce.number().int().min(1).max(99).default(1),
    isPublished: z.boolean().default(true),
  })
  .strict()

const CaseRecordUpsertSchema = z
  .object({
    module: z.literal('case_record'),
    action: z.literal('upsert'),
    id: z.string().trim().max(64).optional(),
    caseType: z.string().trim().min(3).max(200),
    region: z.string().trim().min(2).max(160),
    displayMode: z.enum(['anonymous', 'named']).default('anonymous'),
    clientName: z.string().trim().max(200).nullable().optional(),
    consentRef: z.string().trim().max(255).nullable().optional(),
    imageUrl: z.string().trim().max(500).optional().default('/images/hero-slide-courtroom.webp'),
    imageAlt: z.string().trim().max(255).optional(),
    displayOrder: z.coerce.number().int().min(1).max(99).default(1),
    isPublished: z.boolean().default(true),
  })
  .strict()

const CaseRecordDeleteSchema = z
  .object({
    module: z.literal('case_record'),
    action: z.literal('delete'),
    id: z.string().trim().min(1).max(64),
  })
  .strict()

const InquiryUpdateSchema = z
  .object({
    module: z.literal('inquiry'),
    action: z.literal('update'),
    id: z.string().trim().min(1).max(64),
    status: z.enum(['baru', 'dihubungi', 'selesai', 'spam']),
    internalNotes: z.string().trim().max(2000).optional().default(''),
  })
  .strict()

const InquiryDeleteSchema = z
  .object({
    module: z.literal('inquiry'),
    action: z.literal('delete'),
    id: z.string().trim().min(1).max(64),
  })
  .strict()

const SiteSettingsUpdateSchema = z
  .object({
    module: z.literal('site_settings'),
    action: z.literal('update'),
    firmName: z.string().trim().min(3).max(160),
    shortBrandName: z.string().trim().min(2).max(80),
    address: z.string().trim().min(10).max(400),
    whatsappNumber: z.string().trim().min(9).max(20),
    whatsappDisplay: z.string().trim().min(6).max(32),
    defaultWaMessage: z.string().trim().min(5).max(300),
    inquiryRecipientEmail: z.string().trim().email().max(190),
    instagramUrl: z.string().trim().url().max(300),
    officeHoursPagi: z.string().trim().min(3).max(120),
    officeHoursSiang: z.string().trim().min(3).max(120),
    officeHoursSore: z.string().trim().min(3).max(120),
  })
  .strict()

const UserCreateSchema = z
  .object({
    module: z.literal('user'),
    action: z.literal('create'),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(190),
    password: z.string().min(12).max(256),
    role: z.enum(['admin', 'editor']),
  })
  .strict()

const MigrateSeedSchema = z
  .object({
    module: z.literal('system'),
    action: z.literal('migrate_seed'),
  })
  .strict()

const AdminMutationSchema = z.union([
  ArticleUpsertSchema,
  ArticleDeleteSchema,
  CategoryUpsertSchema,
  CategoryDeleteSchema,
  PracticeAreaUpsertSchema,
  TeamMemberUpsertSchema,
  CaseRecordUpsertSchema,
  CaseRecordDeleteSchema,
  InquiryUpdateSchema,
  InquiryDeleteSchema,
  SiteSettingsUpdateSchema,
  UserCreateSchema,
  MigrateSeedSchema,
])

async function writeAuditLog(
  actor: string,
  action: string,
  collectionName: string,
  targetId: string,
  detail: string,
): Promise<void> {
  const pool = getDbPool()
  if (!pool) return
  try {
    await pool.query(
      `INSERT INTO \`audit_logs\`
        (\`id\`, \`actor\`, \`action\`, \`collection_name\`, \`target_id\`, \`detail\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actor.slice(0, 120),
        action.slice(0, 80),
        collectionName.slice(0, 80),
        targetId.slice(0, 120),
        detail.slice(0, 500),
      ],
    )
  } catch {
    // Non-blocking audit log write
  }
}

export async function GET(req: Request): Promise<Response> {
  const session = await getAdminSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  }

  const dbHealth = await checkDatabaseHealth()
  const pool = getDbPool()

  if (!pool || !dbHealth.connected) {
    const fallbackArticles = getAllNormalizedArticles()
    return NextResponse.json({
      ok: true,
      dbHealth,
      user: session,
      siteSettings: DEFAULT_SITE_SETTINGS,
      articles: fallbackArticles,
      categories: [
        { id: 'cat-1', slug: 'hukum-korporasi', name: 'Hukum Korporasi & Bisnis', description: '' },
        { id: 'cat-2', slug: 'agraria-dan-properti', name: 'Agraria & Properti', description: '' },
        { id: 'cat-3', slug: 'pidana-dan-tipikor', name: 'Pidana & Tipikor', description: '' },
        { id: 'cat-4', slug: 'perdata-keluarga', name: 'Perdata Keluarga', description: '' },
      ],
      practiceAreas: getPublishedPracticeAreas(),
      teamMembers: getPublishedTeamMembers(),
      caseRecords: getPublicCaseRecords(),
      inquiries: [],
      mediaAssets: [],
      users: [],
      auditLogs: [],
    })
  }

  try {
    const [
      [settingsRows],
      [articleRows],
      [catRows],
      [practiceRows],
      [teamRows],
      [caseRows],
      [mediaRows],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>(
        "SELECT `settings_json` FROM `site_settings` WHERE `setting_key` = 'global' LIMIT 1",
      ),
      pool.query<RowDataPacket[]>('SELECT * FROM `articles` ORDER BY `published_at` DESC'),
      pool.query<RowDataPacket[]>('SELECT * FROM `categories` ORDER BY `name` ASC'),
      pool.query<RowDataPacket[]>('SELECT * FROM `practice_areas` ORDER BY `display_order` ASC'),
      pool.query<RowDataPacket[]>('SELECT * FROM `team_members` ORDER BY `display_order` ASC'),
      pool.query<RowDataPacket[]>('SELECT * FROM `case_records` ORDER BY `display_order` ASC'),
      pool.query<RowDataPacket[]>('SELECT * FROM `media_assets` ORDER BY `created_at` DESC LIMIT 100'),
    ])

    let inquiries: Array<Record<string, unknown>> = []
    let users: Array<Record<string, unknown>> = []
    let auditLogs: Array<Record<string, unknown>> = []

    if (session.role === 'admin') {
      const [[inqRows], [userRows], [auditRows]] = await Promise.all([
        pool.query<RowDataPacket[]>(
          'SELECT * FROM `inquiries` ORDER BY `created_at` DESC LIMIT 200',
        ),
        pool.query<RowDataPacket[]>(
          'SELECT `id`, `name`, `email`, `role`, `mfa_enabled`, `must_change_password`, `last_login_at`, `created_at` FROM `users` ORDER BY `created_at` ASC',
        ),
        pool.query<RowDataPacket[]>(
          'SELECT * FROM `audit_logs` ORDER BY `created_at` DESC LIMIT 100',
        ),
      ])

      // SEC-014: Log admin read of inquiries without logging PII content
      await writeAuditLog(
        session.email,
        'READ_INQUIRIES',
        'inquiries',
        'list',
        `Admin membaca daftar permohonan konsultasi (${inqRows.length} baris)`,
      )

      inquiries = inqRows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        phone: String(r.phone),
        practiceAreaId: String(r.practice_area_id),
        preferredDate: String(r.preferred_date),
        sessionSlot: String(r.session_slot),
        method: String(r.method),
        summary: String(r.summary),
        consentAt:
          r.consent_at instanceof Date ? r.consent_at.toISOString() : String(r.consent_at || ''),
        status: String(r.status),
        internalNotes: String(r.internal_notes || ''),
        emailFailed: Boolean(r.email_failed),
        createdAt:
          r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ''),
      }))

      users = userRows.map((u) => ({
        id: String(u.id),
        name: String(u.name),
        email: String(u.email),
        role: String(u.role),
        mfaEnabled: Boolean(u.mfa_enabled),
        mustChangePassword: Boolean(u.must_change_password),
        lastLoginAt:
          u.last_login_at instanceof Date
            ? u.last_login_at.toISOString()
            : u.last_login_at
              ? String(u.last_login_at)
              : null,
      }))

      auditLogs = auditRows.map((a) => ({
        id: String(a.id),
        actor: String(a.actor),
        action: String(a.action),
        collectionName: String(a.collection_name),
        targetId: String(a.target_id),
        detail: String(a.detail),
        createdAt:
          a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at || ''),
      }))
    }

    const rawSettings = safeJsonParse<Record<string, unknown>>(settingsRows[0]?.settings_json, {})
    const siteSettings = {
      firmName: String(rawSettings.officialFirmName || rawSettings.firmName || DEFAULT_SITE_SETTINGS.firmName),
      shortBrandName: String(rawSettings.shortBrandName || DEFAULT_SITE_SETTINGS.shortBrandName),
      address: String(rawSettings.address || DEFAULT_SITE_SETTINGS.address),
      whatsappNumber: String(rawSettings.whatsappNumber || DEFAULT_SITE_SETTINGS.whatsappNumber),
      whatsappDisplay: String(rawSettings.whatsappDisplay || DEFAULT_SITE_SETTINGS.whatsappDisplay),
      defaultWaMessage: String(rawSettings.defaultWaMessage || DEFAULT_SITE_SETTINGS.defaultWaMessage),
      inquiryRecipientEmail: String(
        rawSettings.inquiryRecipientEmail || DEFAULT_SITE_SETTINGS.inquiryRecipientEmail,
      ),
      instagramUrl: String(rawSettings.instagramUrl || DEFAULT_SITE_SETTINGS.instagramUrl),
      officeHours: {
        pagi: String(rawSettings.officeHoursPagi || DEFAULT_SITE_SETTINGS.officeHours.pagi),
        siang: String(rawSettings.officeHoursSiang || DEFAULT_SITE_SETTINGS.officeHours.siang),
        sore: String(rawSettings.officeHoursSore || DEFAULT_SITE_SETTINGS.officeHours.sore),
      },
    }

    const articles =
      articleRows.length > 0
        ? articleRows.map((r) => ({
            id: String(r.id),
            slug: String(r.slug),
            title: String(r.title),
            excerpt: String(r.excerpt || ''),
            bodyHtml: String(r.body_html || ''),
            coverImage: {
              url: String(r.cover_url || '/images/practice-corporate.webp'),
              alt: String(r.cover_alt || ''),
            },
            category: {
              slug: String(r.category_slug || 'hukum-korporasi'),
              name: String(r.category_name || 'Hukum Korporasi & Bisnis'),
            },
            authorName: String(r.author_name || 'Tim Redaksi FS dan Rekan'),
            status: r.status === 'published' ? 'published' : 'draft',
            publishedAt:
              r.published_at instanceof Date
                ? r.published_at.toISOString()
                : String(r.published_at || ''),
            seoTitle: String(r.seo_title || ''),
            seoDescription: String(r.seo_description || ''),
          }))
        : getAllNormalizedArticles()

    const categories =
      catRows.length > 0
        ? catRows.map((c) => ({
            id: String(c.id),
            slug: String(c.slug),
            name: String(c.name),
            description: String(c.description || ''),
          }))
        : [
            { id: 'cat-1', slug: 'hukum-korporasi', name: 'Hukum Korporasi & Bisnis', description: '' },
            { id: 'cat-2', slug: 'agraria-dan-properti', name: 'Agraria & Properti', description: '' },
            { id: 'cat-3', slug: 'pidana-dan-tipikor', name: 'Pidana & Tipikor', description: '' },
            { id: 'cat-4', slug: 'perdata-keluarga', name: 'Perdata Keluarga', description: '' },
          ]

    const practiceAreas =
      practiceRows.length > 0
        ? practiceRows.map((p) => ({
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            label: String(p.label),
            summary: String(p.summary),
            description: String(p.description),
            advocacyScope: safeJsonParse<string[]>(p.advocacy_scope_json, []),
            icon: String(p.icon || ''),
            image: String(p.image || '/images/practice-corporate.webp'),
            displayOrder: Number(p.display_order) || 1,
            isPublished: Boolean(p.is_published),
          }))
        : getPublishedPracticeAreas()

    const teamMembers =
      teamRows.length > 0
        ? teamRows.map((t) => {
            const rawPhoto = safeJsonParse<Record<string, unknown>>(t.photo_json, {})
            return {
              id: String(t.id),
              slug: String(t.slug),
              fullName: String(t.full_name),
              honorific: String(t.honorific || ''),
              displayName: String(t.display_name || t.full_name),
              roleTitle: String(t.role_title),
              group: String(t.group_name),
              motto: t.motto ? String(t.motto) : null,
              shortBio: String(t.short_bio),
              fullBio: String(t.full_bio),
              education: safeJsonParse<string[]>(t.education_json, []),
              credentials: safeJsonParse<string[]>(t.credentials_json, []),
              languages: safeJsonParse<string[]>(t.languages_json, []),
              tags: safeJsonParse<string[]>(t.tags_json, []),
              photo: {
                url: String(rawPhoto.url || `/team/${String(t.slug)}.webp`),
                alt: String(rawPhoto.alt || `Foto ${String(t.full_name)}`),
              },
              displayOrder: Number(t.display_order) || 1,
              isPublished: Boolean(t.is_published),
            }
          })
        : getPublishedTeamMembers()

    const caseRecords =
      caseRows.length > 0
        ? caseRows.map((c) => ({
            id: String(c.id),
            caseType: String(c.case_type),
            region: String(c.region),
            displayMode: c.display_mode === 'named' ? 'named' : 'anonymous',
            clientName: c.client_name ? String(c.client_name) : null,
            consentRef: c.consent_ref ? String(c.consent_ref) : null,
            imageUrl: String(c.image_url || '/images/hero-slide-courtroom.webp'),
            imageAlt: String(c.image_alt || ''),
            displayOrder: Number(c.display_order) || 1,
            isPublished: Boolean(c.is_published),
          }))
        : getPublicCaseRecords()

    const mediaAssets = mediaRows.map((m) => ({
      id: String(m.id),
      filename: String(m.filename),
      originalName: String(m.original_name),
      mimeType: String(m.mime_type),
      sizeBytes: Number(m.size_bytes),
      altText: String(m.alt_text || ''),
      url: String(m.url),
      createdAt:
        m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at || ''),
    }))

    return NextResponse.json({
      ok: true,
      dbHealth,
      user: session,
      siteSettings,
      articles,
      categories,
      practiceAreas,
      teamMembers,
      caseRecords,
      inquiries,
      mediaAssets,
      users,
      auditLogs,
    })
  } catch (err) {
    logger.error(
      { errName: err instanceof Error ? err.name : 'AdminGetError' },
      'Failed to load admin CMS state from MySQL',
    )
    return NextResponse.json(
      { error: 'Gagal memuat data dari database. Pastikan skema tabel sudah dimigrasikan.' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req)

    const session = await getAdminSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
    }
    if (session.mustChangePassword) {
      return NextResponse.json(
        { error: 'Wajib mengganti kata sandi awal sebelum mengelola konten.' },
        { status: 403 },
      )
    }
    if (!verifyAdminCsrf(req, session)) {
      return NextResponse.json({ error: 'Token keamanan CSRF tidak valid.' }, { status: 403 })
    }

    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Format permintaan tidak didukung.' }, { status: 415 })
    }

    const rawJson = await req.json().catch(() => null)
    const parsed = AdminMutationSchema.safeParse(rawJson)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data input tidak valid. Periksa kembali seluruh kolom wajib.' },
        { status: 400 },
      )
    }

    const data = parsed.data

    // SEC-002 / FR-6.2: Editor role can only manage articles and categories
    const adminOnlyModules = new Set([
      'practice_area',
      'team_member',
      'case_record',
      'inquiry',
      'site_settings',
      'user',
      'system',
    ])
    if (session.role !== 'admin' && adminOnlyModules.has(data.module)) {
      return NextResponse.json(
        { error: 'Akses ditolak. Peran Editor hanya diizinkan mengelola Artikel dan Kategori.' },
        { status: 403 },
      )
    }

    const pool = getDbPool()
    if (!pool) {
      return NextResponse.json(
        { error: 'Koneksi database MySQL (DATABASE_URL) belum dikonfigurasi.' },
        { status: 503 },
      )
    }

    if (data.module === 'system' && data.action === 'migrate_seed') {
      const summary = await runIdempotentDataMigration({ conn: pool })
      await writeAuditLog(
        session.email,
        'MIGRATE_SEED',
        'system',
        'database',
        `Migrasi idempoten dijalankan (${summary.articlesUpserted} artikel, ${summary.teamMembersUpserted} tim)`,
      )
      return NextResponse.json({ ok: true, summary })
    }

    if (data.module === 'article') {
      if (data.action === 'delete') {
        await pool.query('DELETE FROM `articles` WHERE `id` = ?', [data.id])
        await writeAuditLog(session.email, 'DELETE_ARTICLE', 'articles', data.id, 'Hapus artikel')
        return NextResponse.json({ ok: true })
      }

      const id = data.id && data.id.length > 0 ? data.id : `article-${Date.now()}`
      let baseSlug = slugify(data.slug || data.title)
      if (!baseSlug) baseSlug = `artikel-${Date.now()}`

      // FR-8: Auto-resolve slug collision by appending numeric suffix
      const [existingSlugs] = await pool.query<RowDataPacket[]>(
        'SELECT `id`, `slug` FROM `articles` WHERE `slug` LIKE ? AND `id` != ?',
        [`${baseSlug}%`, id],
      )
      let finalSlug = baseSlug
      let slugWarning: string | undefined
      if (existingSlugs.some((r) => String(r.slug) === baseSlug)) {
        let counter = 2
        while (existingSlugs.some((r) => String(r.slug) === `${baseSlug}-${counter}`)) {
          counter += 1
        }
        finalSlug = `${baseSlug}-${counter}`
        slugWarning = `Slug disesuaikan otomatis menjadi "${finalSlug}" karena sudah digunakan.`
      }

      // SEC-004 / FR-5.4: Sanitize rich text HTML before saving
      const sanitizedBody = cleanHtml(data.bodyHtml)
      const pubTime = toMysqlDateTime(data.publishedAt)
      const coverAlt = data.coverAlt?.trim() || `Ilustrasi ${data.title}`

      await pool.query(
        `INSERT INTO \`articles\`
          (\`id\`, \`slug\`, \`title\`, \`excerpt\`, \`body_html\`, \`cover_url\`, \`cover_alt\`,
           \`category_slug\`, \`category_name\`, \`author_name\`, \`status\`, \`published_at\`,
           \`seo_title\`, \`seo_description\`, \`created_by\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`slug\` = VALUES(\`slug\`),
           \`title\` = VALUES(\`title\`),
           \`excerpt\` = VALUES(\`excerpt\`),
           \`body_html\` = VALUES(\`body_html\`),
           \`cover_url\` = VALUES(\`cover_url\`),
           \`cover_alt\` = VALUES(\`cover_alt\`),
           \`category_slug\` = VALUES(\`category_slug\`),
           \`category_name\` = VALUES(\`category_name\`),
           \`author_name\` = VALUES(\`author_name\`),
           \`status\` = VALUES(\`status\`),
           \`published_at\` = VALUES(\`published_at\`),
           \`seo_title\` = VALUES(\`seo_title\`),
           \`seo_description\` = VALUES(\`seo_description\`)`,
        [
          id,
          finalSlug,
          data.title,
          data.excerpt,
          sanitizedBody,
          data.coverUrl,
          coverAlt,
          data.categorySlug,
          data.categoryName,
          data.authorName,
          data.status,
          pubTime,
          data.seoTitle || data.title,
          data.seoDescription || data.excerpt.slice(0, 155),
          session.id,
        ],
      )

      await writeAuditLog(
        session.email,
        'UPSERT_ARTICLE',
        'articles',
        id,
        `${data.status.toUpperCase()}: ${data.title}`,
      )

      return NextResponse.json({ ok: true, id, slug: finalSlug, warning: slugWarning })
    }

    if (data.module === 'category') {
      if (data.action === 'delete') {
        // FR-6.4: Category still used by articles cannot be deleted
        const [usedRows] = await pool.query<RowDataPacket[]>(
          'SELECT COUNT(*) AS cnt FROM `articles` WHERE `category_slug` = ?',
          [data.slug],
        )
        if (Number(usedRows[0]?.cnt ?? 0) > 0) {
          return NextResponse.json(
            {
              error:
                'Kategori tidak dapat dihapus karena masih digunakan oleh satu atau lebih artikel (FR-6.4).',
            },
            { status: 400 },
          )
        }
        await pool.query('DELETE FROM `categories` WHERE `id` = ?', [data.id])
        await writeAuditLog(session.email, 'DELETE_CATEGORY', 'categories', data.id, data.slug)
        return NextResponse.json({ ok: true })
      }

      const slug = slugify(data.slug || data.name)
      const id = data.id && data.id.length > 0 ? data.id : `cat-${slug}`
      await pool.query(
        `INSERT INTO \`categories\` (\`id\`, \`slug\`, \`name\`, \`description\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`name\` = VALUES(\`name\`),
           \`description\` = VALUES(\`description\`)`,
        [id, slug, data.name, data.description],
      )
      await writeAuditLog(session.email, 'UPSERT_CATEGORY', 'categories', id, data.name)
      return NextResponse.json({ ok: true, id, slug })
    }

    if (data.module === 'practice_area') {
      const slug = slugify(data.slug || data.name)
      const id = data.id && data.id.length > 0 ? data.id : `pa-${slug}`
      await pool.query(
        `INSERT INTO \`practice_areas\`
          (\`id\`, \`slug\`, \`name\`, \`label\`, \`summary\`, \`description\`,
           \`advocacy_scope_json\`, \`icon\`, \`image\`, \`display_order\`, \`is_published\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`name\` = VALUES(\`name\`),
           \`label\` = VALUES(\`label\`),
           \`summary\` = VALUES(\`summary\`),
           \`description\` = VALUES(\`description\`),
           \`advocacy_scope_json\` = VALUES(\`advocacy_scope_json\`),
           \`image\` = VALUES(\`image\`),
           \`display_order\` = VALUES(\`display_order\`),
           \`is_published\` = VALUES(\`is_published\`)`,
        [
          id,
          slug,
          data.name,
          data.label,
          data.summary,
          data.description,
          JSON.stringify(data.advocacyScope),
          data.image,
          data.displayOrder,
          data.isPublished ? 1 : 0,
        ],
      )
      await writeAuditLog(session.email, 'UPSERT_PRACTICE', 'practice_areas', id, data.name)
      return NextResponse.json({ ok: true, id, slug })
    }

    if (data.module === 'team_member') {
      const slug = slugify(data.slug || data.fullName)
      const id = data.id && data.id.length > 0 ? data.id : `team-${slug}`
      const displayName = data.honorific
        ? `${data.fullName}, ${data.honorific}`
        : data.fullName
      const photoObj = {
        id: `photo-${slug}`,
        filename: `${slug}.webp`,
        sourceFilename: `${slug}.webp`,
        mimeType: 'image/webp',
        size: 24000,
        width: 640,
        height: 800,
        aspectRatio: '4:5',
        url: data.photoUrl,
        sizes: {
          sm: data.photoUrl,
          md: data.photoUrl,
          lg: data.photoUrl,
        },
        srcSet: `${data.photoUrl} 640w`,
        alt: `Foto ${displayName}`,
      }

      await pool.query(
        `INSERT INTO \`team_members\`
          (\`id\`, \`slug\`, \`full_name\`, \`honorific\`, \`display_name\`, \`role_title\`, \`group_name\`,
           \`motto\`, \`short_bio\`, \`full_bio\`, \`education_json\`, \`credentials_json\`,
           \`languages_json\`, \`tags_json\`, \`photo_json\`, \`display_order\`, \`is_published\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`full_name\` = VALUES(\`full_name\`),
           \`honorific\` = VALUES(\`honorific\`),
           \`display_name\` = VALUES(\`display_name\`),
           \`role_title\` = VALUES(\`role_title\`),
           \`group_name\` = VALUES(\`group_name\`),
           \`motto\` = VALUES(\`motto\`),
           \`short_bio\` = VALUES(\`short_bio\`),
           \`full_bio\` = VALUES(\`full_bio\`),
           \`education_json\` = VALUES(\`education_json\`),
           \`credentials_json\` = VALUES(\`credentials_json\`),
           \`languages_json\` = VALUES(\`languages_json\`),
           \`tags_json\` = VALUES(\`tags_json\`),
           \`photo_json\` = VALUES(\`photo_json\`),
           \`display_order\` = VALUES(\`display_order\`),
           \`is_published\` = VALUES(\`is_published\`)`,
        [
          id,
          slug,
          data.fullName,
          data.honorific,
          displayName,
          data.roleTitle,
          data.group,
          data.motto || null,
          data.shortBio,
          data.fullBio,
          JSON.stringify(data.education),
          JSON.stringify(data.credentials),
          JSON.stringify(data.languages),
          JSON.stringify(data.tags),
          JSON.stringify(photoObj),
          data.displayOrder,
          data.isPublished ? 1 : 0,
        ],
      )
      await writeAuditLog(session.email, 'UPSERT_TEAM', 'team_members', id, displayName)
      return NextResponse.json({ ok: true, id, slug })
    }

    if (data.module === 'case_record') {
      if (data.action === 'delete') {
        await pool.query('DELETE FROM `case_records` WHERE `id` = ?', [data.id])
        await writeAuditLog(session.email, 'DELETE_CASE', 'case_records', data.id, 'Hapus perkara')
        return NextResponse.json({ ok: true })
      }

      // SK-14 Anonymity Guard: named displayMode requires explicit consentRef
      if (data.displayMode === 'named' && (!data.consentRef || data.consentRef.trim().length < 3)) {
        return NextResponse.json(
          {
            error:
              'Pelanggaran Kerahasiaan Klien (SK-14): Mode tampil "named" wajib disertai nomor referensi persetujuan tertulis klien (consentRef).',
          },
          { status: 400 },
        )
      }

      const id = data.id && data.id.length > 0 ? data.id : `case-record-${Date.now()}`
      const imageAlt =
        data.imageAlt?.trim() ||
        `Dokumentasi penanganan perkara ${data.caseType} di wilayah ${data.region}`
      const photosJson = JSON.stringify([
        {
          url: data.imageUrl,
          caption: imageAlt,
          alt: imageAlt,
        },
      ])

      await pool.query(
        `INSERT INTO \`case_records\`
          (\`id\`, \`case_type\`, \`region\`, \`display_mode\`, \`client_name\`, \`consent_ref\`,
           \`display_order\`, \`is_published\`, \`image_url\`, \`image_alt\`, \`photos_json\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`case_type\` = VALUES(\`case_type\`),
           \`region\` = VALUES(\`region\`),
           \`display_mode\` = VALUES(\`display_mode\`),
           \`client_name\` = VALUES(\`client_name\`),
           \`consent_ref\` = VALUES(\`consent_ref\`),
           \`display_order\` = VALUES(\`display_order\`),
           \`is_published\` = VALUES(\`is_published\`),
           \`image_url\` = VALUES(\`image_url\`),
           \`image_alt\` = VALUES(\`image_alt\`),
           \`photos_json\` = VALUES(\`photos_json\`)`,
        [
          id,
          data.caseType,
          data.region,
          data.displayMode,
          data.displayMode === 'named' ? data.clientName || null : null,
          data.displayMode === 'named' ? data.consentRef || null : null,
          data.displayOrder,
          data.isPublished ? 1 : 0,
          data.imageUrl,
          imageAlt,
          photosJson,
        ],
      )
      await writeAuditLog(
        session.email,
        'UPSERT_CASE',
        'case_records',
        id,
        `${data.caseType} (${data.region})`,
      )
      return NextResponse.json({ ok: true, id })
    }

    if (data.module === 'inquiry') {
      if (data.action === 'delete') {
        await pool.query('DELETE FROM `inquiries` WHERE `id` = ?', [data.id])
        await writeAuditLog(
          session.email,
          'DELETE_INQUIRY_PDP',
          'inquiries',
          data.id,
          'Penghapusan data permohonan konsultasi (UU PDP)',
        )
        return NextResponse.json({ ok: true })
      }

      await pool.query(
        'UPDATE `inquiries` SET `status` = ?, `internal_notes` = ? WHERE `id` = ?',
        [data.status, data.internalNotes, data.id],
      )
      await writeAuditLog(
        session.email,
        'UPDATE_INQUIRY_STATUS',
        'inquiries',
        data.id,
        `Status diubah menjadi ${data.status}`,
      )
      return NextResponse.json({ ok: true })
    }

    if (data.module === 'site_settings') {
      if (!isValidIndonesianWaNumber(data.whatsappNumber)) {
        return NextResponse.json(
          {
            error:
              'Nomor WhatsApp wajib menggunakan format internasional Indonesia diawali 62 (contoh: 62811830991).',
          },
          { status: 400 },
        )
      }

      const settingsPayload = {
        officialFirmName: data.firmName,
        shortBrandName: data.shortBrandName,
        address: data.address,
        whatsappNumber: data.whatsappNumber,
        whatsappDisplay: data.whatsappDisplay,
        defaultWaMessage: data.defaultWaMessage,
        inquiryRecipientEmail: data.inquiryRecipientEmail,
        instagramUrl: data.instagramUrl,
        officeHoursPagi: data.officeHoursPagi,
        officeHoursSiang: data.officeHoursSiang,
        officeHoursSore: data.officeHoursSore,
      }

      await pool.query(
        `INSERT INTO \`site_settings\` (\`setting_key\`, \`settings_json\`)
         VALUES ('global', ?)
         ON DUPLICATE KEY UPDATE \`settings_json\` = VALUES(\`settings_json\`)`,
        [JSON.stringify(settingsPayload)],
      )
      await writeAuditLog(
        session.email,
        'UPDATE_SITE_SETTINGS',
        'site_settings',
        'global',
        'Pembaruan pengaturan global situs',
      )
      return NextResponse.json({ ok: true })
    }

    if (data.module === 'user') {
      const strength = validatePasswordStrength(data.password)
      if (!strength.valid) {
        return NextResponse.json({ error: strength.message }, { status: 400 })
      }
      const userId = `user-${Date.now()}`
      const passwordHash = hashPassword(data.password)
      await pool.query(
        `INSERT INTO \`users\`
          (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
         VALUES (?, ?, ?, ?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE
           \`name\` = VALUES(\`name\`),
           \`password_hash\` = VALUES(\`password_hash\`),
           \`role\` = VALUES(\`role\`),
           \`must_change_password\` = 1`,
        [userId, data.name, data.email, passwordHash, data.role],
      )
      await writeAuditLog(
        session.email,
        'UPSERT_USER',
        'users',
        data.email,
        `Pengguna peran ${data.role} dibuat/diperbarui`,
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Operasi tidak didukung.' }, { status: 400 })
  } catch (e) {
    if (e instanceof Response) {
      return e
    }
    logger.error(
      { errName: e instanceof Error ? e.name : 'AdminMutationError' },
      'Admin CMS mutation failed',
    )
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat menyimpan perubahan.' },
      { status: 500 },
    )
  }
}

