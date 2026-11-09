import fs from 'node:fs'
import path from 'node:path'
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise'
import { logger } from '@/lib/logger'
import { hashPassword } from '@/lib/security/password'

function resolveMysqlDatabaseUrl(): string {
  const explicitUrl = (process.env.DATABASE_URL || '').trim()
  if (explicitUrl.startsWith('mysql://') || explicitUrl.startsWith('mariadb://')) {
    return explicitUrl
  }
  const legacyUri = (process.env.DATABASE_URI || '').trim()
  if (legacyUri.startsWith('mysql://') || legacyUri.startsWith('mariadb://')) {
    return legacyUri
  }
  return ''
}

declare global {
  // eslint-disable-next-line no-var
  var __fsMysqlPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __fsMysqlSchemaReady: boolean | undefined
}

/**
 * Returns true if a valid MySQL/MariaDB DATABASE_URL is configured.
 */
export function isMysqlConfigured(): boolean {
  return resolveMysqlDatabaseUrl().length > 0
}

/**
 * Lightweight singleton MySQL/MariaDB pool tuned for Biznet Gio Personal Large (1 GB RAM).
 * Uses connectionLimit: 5 to avoid exhausting shared cPanel MySQL user connection limits.
 */
export function getDbPool(): Pool | null {
  const dbUrl = resolveMysqlDatabaseUrl()
  if (!dbUrl) {
    return null
  }

  if (!globalThis.__fsMysqlPool) {
    globalThis.__fsMysqlPool = mysql.createPool({
      uri: dbUrl,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30000,
      waitForConnections: true,
      queueLimit: 25,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: 'Z',
      dateStrings: false,
    })
  }

  return globalThis.__fsMysqlPool
}

/**
 * Split a SQL file into individual executable statements (stripping comments and empty lines).
 */
export function splitSqlStatements(sqlContent: string): string[] {
  const withoutComments = sqlContent
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')

  return withoutComments
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0)
}

/**
 * Ensure all tables from database/schema.sql exist in the connected MySQL/MariaDB database.
 */
export async function ensureDatabaseSchema(pool?: Pool | null): Promise<boolean> {
  const activePool = pool ?? getDbPool()
  if (!activePool) {
    return false
  }
  if (globalThis.__fsMysqlSchemaReady) {
    return true
  }

  const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql')
  if (!fs.existsSync(schemaPath)) {
    logger.warn({ schemaPath }, 'database/schema.sql not found; skipping auto-schema check')
    return false
  }

  const sqlText = fs.readFileSync(schemaPath, 'utf8')
  const statements = splitSqlStatements(sqlText)
  const conn = await activePool.getConnection()
  try {
    for (const stmt of statements) {
      await conn.query(stmt)
    }
    globalThis.__fsMysqlSchemaReady = true
    return true
  } finally {
    conn.release()
  }
}

/**
 * Ping database connection for /api/health endpoint.
 */
export async function checkDatabaseHealth(): Promise<{
  configured: boolean
  connected: boolean
  latencyMs: number | null
  error?: string
}> {
  const pool = getDbPool()
  if (!pool) {
    return {
      configured: false,
      connected: false,
      latencyMs: null,
    }
  }

  const start = Date.now()
  try {
    await pool.query('SELECT 1 AS ok')
    return {
      configured: true,
      connected: true,
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.name : 'DatabaseConnectionError',
    }
  }
}

export interface MigrationSummary {
  tablesCreated: number
  usersUpserted: number
  categoriesUpserted: number
  articlesUpserted: number
  practiceAreasUpserted: number
  teamMembersUpserted: number
  caseRecordsUpserted: number
  inquiriesUpserted: number
  instagramItemsUpserted: number
  chatSessionsUpserted: number
  auditLogsUpserted: number
  siteSettingsUpdated: boolean
}

function toMysqlDateTime(isoOrDate?: string | null): string {
  if (!isoOrDate) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ')
}

function readJsonFileSafe<T>(relativePath: string, fallback: T): T {
  try {
    const fullPath = path.resolve(process.cwd(), relativePath)
    if (!fs.existsSync(fullPath)) {
      return fallback
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T
  } catch {
    return fallback
  }
}

const DEFAULT_PRACTICE_PRESENTATION: Record<
  string,
  {
    image: string
    summary: string
    description: string
    advocacyScope: string[]
  }
> = {
  'litigasi-korporasi-dan-komersial': {
    image: '/images/practice-corporate.webp',
    summary:
      'Pendampingan penyelesaian sengketa korporasi, perjanjian komersial, tata kelola perusahaan, serta perlindungan kepentingan hukum pelaku usaha.',
    description: 'Penyelesaian Sengketa Kontrak & Tata Kelola Perusahaan',
    advocacyScope: [
      'Penanganan sengketa pemegang saham, RUPS, dan organ perseroan',
      'Penyusunan, peninjauan, dan negosiasi kontrak bisnis komersial',
      'Representasi litigasi perdata dan komersial di pengadilan',
    ],
  },
  'sengketa-pertanahan-dan-agraria': {
    image: '/images/article-land.webp',
    summary:
      'Pendampingan sengketa hak atas tanah, pemeriksaan keabsahan dokumen pertanahan (legal due diligence), dan penyelesaian klaim penguasaan lahan.',
    description: 'Kepastian Alas Hak & Penanganan Sengketa Pertanahan',
    advocacyScope: [
      'Uji tuntas hukum (legal due diligence) sebelum transaksi aset properti',
      'Pendampingan sengketa tumpang tindih sertifikat dan riwayat kepemilikan',
      'Mediasi dan litigasi sengketa hak atas tanah di peradilan',
    ],
  },
  'hukum-perdata-dan-perlindungan-aset': {
    image: '/images/lady-justice.webp',
    summary:
      'Penanganan gugatan wanprestasi, perbuatan melawan hukum (PMH), permohonan sita jaminan, serta perancangan instrumen perlindungan aset.',
    description: 'Penegakan Hak Perdata & Perlindungan Aset Klien',
    advocacyScope: [
      'Penyusunan somasi, gugatan wanprestasi, dan perbuatan melawan hukum',
      'Permohonan sita jaminan dan pelaksanaan putusan pengadilan',
      'Pendampingan negosiasi pemulihan hak keperdataan',
    ],
  },
  'hukum-pidana-umum-dan-tipikor': {
    image: '/images/hero-slide-courtroom.webp',
    summary:
      'Pendampingan hukum pada tahap pelaporan, penyelidikan, penyidikan, hingga pembelaan di persidangan perkara pidana umum dan tindak pidana korupsi.',
    description: 'Pendampingan Proses Hukum & Pembelaan di Persidangan',
    advocacyScope: [
      'Pendampingan saksi, pelapor, maupun tersangka dalam pemeriksaan',
      'Penyusunan eksepsi, pledoi, memori banding, kasasi, dan PK',
      'Penanganan perkara tindak pidana umum dan tindak pidana khusus/korupsi',
    ],
  },
  'hak-kekayaan-intelektual-hki': {
    image: '/images/practice-ip.webp',
    summary:
      'Perlindungan hukum atas merek, hak cipta, paten, desain industri, rahasia dagang, serta penyelesaian sengketa kekayaan intelektual.',
    description: 'Perlindungan Kekayaan Intelektual & Perjanjian Lisensi',
    advocacyScope: [
      'Konsultasi pendaftaran dan pengelolaan portofolio HKI',
      'Penyusunan perjanjian lisensi, waralaba, dan kerahasiaan (NDA)',
      'Penanganan sengketa pelanggaran merek dan hak cipta di Pengadilan Niaga',
    ],
  },
  'ketenagakerjaan-dan-phi': {
    image: '/images/practice-labor.webp',
    summary:
      'Pendampingan hubungan industrial, perundingan bipartit dan tripartit, penyusunan kontrak kerja, serta penyelesaian sengketa di Pengadilan Hubungan Industrial.',
    description: 'Kepatuhan Ketenagakerjaan & Penyelesaian Perselisihan Hubungan Industrial',
    advocacyScope: [
      'Penyusunan Perjanjian Kerja, Peraturan Perusahaan (PP), dan PKB',
      'Pendampingan perundingan bipartit dan mediasi tripartit',
      'Representasi sengketa Perselisihan Hubungan Industrial (PHI)',
    ],
  },
  'kepailitan-dan-pkpu-niaga': {
    image: '/images/practice-bankruptcy.webp',
    summary:
      'Pendampingan perkara Penundaan Kewajiban Pembayaran Utang (PKPU) dan kepailitan bagi kreditur maupun debitur di Pengadilan Niaga.',
    description: 'Restrukturisasi Kewajiban Utang & Perkara Pengadilan Niaga',
    advocacyScope: [
      'Penyusunan permohonan PKPU dan kepailitan di Pengadilan Niaga',
      'Pendampingan rapat kreditur, verifikasi tagihan, dan proposal perdamaian',
      'Pengelolaan dokumen restrukturisasi utang korporasi',
    ],
  },
  'arbitrase-dan-mediasi-bisnis': {
    image: '/images/gavel-banner.webp',
    summary:
      'Penyelesaian sengketa komersial di luar pengadilan melalui mekanisme negosiasi, mediasi, dan forum arbitrase secara efektif dan terjaga kerahasiaannya.',
    description: 'Penyelesaian Sengketa Alternatif (ADR) & Mediasi Komersial',
    advocacyScope: [
      'Perumusan strategi negosiasi dan fasilitasi mediasi bisnis',
      'Pendampingan proses beracara pada forum arbitrase',
      'Pendaftaran dan pelaksanaan putusan perdamaian atau arbitrase',
    ],
  },
  'hukum-perbankan-dan-pembiayaan': {
    image: '/images/practice-banking.webp',
    summary:
      'Pendampingan hukum di bidang perbankan dan pembiayaan, termasuk penanganan kredit bermasalah (Non-Performing Loan/NPL), restrukturisasi, dan eksekusi agunan.',
    description: 'Kepatuhan Perbankan, Restrukturisasi Kredit & Penanganan NPL',
    advocacyScope: [
      'Penanganan pemulihan kredit bermasalah (Non-Performing Loan / NPL)',
      'Koordinasi restrukturisasi fasilitas kredit dan pengelolaan dokumen jaminan',
      'Pendampingan proses eksekusi hak tanggungan dan jaminan fidusia',
    ],
  },
  'hukum-keluarga-dan-waris': {
    image: '/images/article-family.webp',
    summary:
      'Konsultasi dan pendampingan perkara hukum keluarga, penyusunan perjanjian perkawinan, penataan harta keluarga, serta penyelesaian sengketa waris.',
    description: 'Pendampingan Hukum Keluarga & Penyelesaian Waris',
    advocacyScope: [
      'Penyusunan dan peninjauan perjanjian perkawinan',
      'Konsultasi pembagian waris dan penataan harta keluarga',
      'Pendampingan penyelesaian sengketa keperdataan keluarga di pengadilan',
    ],
  },
}

/**
 * Idempotently migrate all data from content/cms_state.json and content/*.json into MySQL/MariaDB.
 * Safe to run multiple times without duplicating rows or losing existing admin passwords.
 */
export async function runIdempotentDataMigration(options?: {
  conn?: PoolConnection | Pool
  adminEmail?: string
  adminPassword?: string
  editorEmail?: string
  editorPassword?: string
  forceResetPasswords?: boolean
}): Promise<MigrationSummary> {
  const executor = options?.conn ?? getDbPool()
  if (!executor) {
    throw new Error('DATABASE_URL belum dikonfigurasi.')
  }

  const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql')
  const schemaStatements = fs.existsSync(schemaPath)
    ? splitSqlStatements(fs.readFileSync(schemaPath, 'utf8'))
    : []

  for (const stmt of schemaStatements) {
    await executor.query(stmt)
  }

  const summary: MigrationSummary = {
    tablesCreated: schemaStatements.length,
    usersUpserted: 0,
    categoriesUpserted: 0,
    articlesUpserted: 0,
    practiceAreasUpserted: 0,
    teamMembersUpserted: 0,
    caseRecordsUpserted: 0,
    inquiriesUpserted: 0,
    instagramItemsUpserted: 0,
    chatSessionsUpserted: 0,
    auditLogsUpserted: 0,
    siteSettingsUpdated: false,
  }

  const cmsState = readJsonFileSafe<Record<string, unknown>>('content/cms_state.json', {})
  const teamSeed = readJsonFileSafe<Array<Record<string, unknown>>>('content/team.json', [])
  const practiceSeed = readJsonFileSafe<Array<Record<string, unknown>>>(
    'content/practice_areas.json',
    [],
  )
  const articlesSeed = readJsonFileSafe<Array<Record<string, unknown>>>(
    'content/articles.json',
    [],
  )
  const caseSeed = readJsonFileSafe<Array<Record<string, unknown>>>(
    'content/case_records.json',
    [],
  )
  const inquiriesSeed = readJsonFileSafe<Array<Record<string, unknown>>>(
    'content/inquiries.json',
    [],
  )

  // 1. Seed initial Admin & Editor accounts (Password read from env, must_change_password = 1)
  const adminEmail = (
    options?.adminEmail ||
    process.env.ADMIN_INITIAL_EMAIL ||
    'admin@fsdanrekan.com'
  )
    .trim()
    .toLowerCase()
  const adminPlainPassword = (
    options?.adminPassword ??
    process.env.ADMIN_INITIAL_PASSWORD ??
    ''
  ).trim()

  if (adminPlainPassword.length >= 8) {
    const [existingRows] = await executor.query<RowDataPacket[]>(
      'SELECT id FROM `users` WHERE `email` = ? LIMIT 1',
      [adminEmail],
    )
    const adminHash = hashPassword(adminPlainPassword)
    if (existingRows.length === 0) {
      await executor.query(
        `INSERT INTO \`users\`
          (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
         VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
        ['user-admin-1', 'Administrator Utama', adminEmail, adminHash],
      )
      summary.usersUpserted += 1
    } else if (options?.forceResetPasswords) {
      await executor.query(
        `UPDATE \`users\`
         SET \`password_hash\` = ?, \`must_change_password\` = 1, \`failed_login_attempts\` = 0, \`locked_until\` = NULL
         WHERE \`email\` = ?`,
        [adminHash, adminEmail],
      )
      summary.usersUpserted += 1
    }
  }

  const editorEmail = (
    options?.editorEmail ||
    process.env.EDITOR_INITIAL_EMAIL ||
    'editor@fsdanrekan.com'
  )
    .trim()
    .toLowerCase()
  const editorPlainPassword = (
    options?.editorPassword ??
    process.env.EDITOR_INITIAL_PASSWORD ??
    ''
  ).trim()

  if (editorPlainPassword.length >= 8) {
    const [existingEditor] = await executor.query<RowDataPacket[]>(
      'SELECT id FROM `users` WHERE `email` = ? LIMIT 1',
      [editorEmail],
    )
    const editorHash = hashPassword(editorPlainPassword)
    if (existingEditor.length === 0) {
      await executor.query(
        `INSERT INTO \`users\`
          (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
         VALUES (?, ?, ?, ?, 'editor', 1, 1)`,
        ['user-editor-1', 'Tim Redaksi Hukum (Editor)', editorEmail, editorHash],
      )
      summary.usersUpserted += 1
    } else if (options?.forceResetPasswords) {
      await executor.query(
        `UPDATE \`users\`
         SET \`password_hash\` = ?, \`must_change_password\` = 1, \`failed_login_attempts\` = 0, \`locked_until\` = NULL
         WHERE \`email\` = ?`,
        [editorHash, editorEmail],
      )
      summary.usersUpserted += 1
    }
  }

  // 2. Site Settings
  const rawSettings = (cmsState.siteSettings as Record<string, unknown> | undefined) ?? {}
  if (Object.keys(rawSettings).length > 0) {
    await executor.query(
      `INSERT INTO \`site_settings\` (\`setting_key\`, \`settings_json\`)
       VALUES ('global', ?)
       ON DUPLICATE KEY UPDATE \`settings_json\` = VALUES(\`settings_json\`)`,
      [JSON.stringify(rawSettings)],
    )
    summary.siteSettingsUpdated = true
  }

  // 3. Categories
  const categories = Array.isArray(cmsState.categories)
    ? (cmsState.categories as Array<Record<string, unknown>>)
    : []
  for (const cat of categories) {
    const id = String(cat.id || `cat-${cat.slug}`)
    const slug = String(cat.slug || '').trim()
    const name = String(cat.name || '').trim()
    const description = String(cat.description || '')
    if (!slug || !name) continue

    await executor.query(
      `INSERT INTO \`categories\` (\`id\`, \`slug\`, \`name\`, \`description\`)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\` = VALUES(\`name\`),
         \`description\` = VALUES(\`description\`)`,
      [id, slug, name, description],
    )
    summary.categoriesUpserted += 1
  }

  // 4. Articles
  for (const art of articlesSeed) {
    const id = String(art.id || '')
    const slug = String(art.slug || '').trim()
    const title = String(art.title || '').trim()
    if (!id || !slug || !title) continue

    const coverImage = (art.coverImage as Record<string, unknown> | undefined) ?? {}
    const coverUrl = String(art.coverUrl || coverImage.url || '/images/practice-corporate.webp')
    const coverAlt = String(art.coverAlt || coverImage.alt || `Ilustrasi ${title}`)
    const catObj = (art.category as Record<string, unknown> | undefined) ?? {}
    const categorySlug = String(catObj.slug || 'hukum-korporasi')
    const categoryName = String(catObj.name || 'Hukum Korporasi & Bisnis')
    const status = art.status === 'published' ? 'published' : 'draft'
    const publishedAt = toMysqlDateTime(String(art.publishedAt || '2026-10-01T09:00:00.000Z'))

    await executor.query(
      `INSERT INTO \`articles\`
        (\`id\`, \`slug\`, \`title\`, \`excerpt\`, \`body_html\`, \`cover_url\`, \`cover_alt\`,
         \`category_slug\`, \`category_name\`, \`author_name\`, \`status\`, \`published_at\`,
         \`seo_title\`, \`seo_description\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
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
        slug,
        title,
        String(art.excerpt || ''),
        String(art.bodyHtml || ''),
        coverUrl,
        coverAlt,
        categorySlug,
        categoryName,
        String(art.authorName || 'Tim Redaksi FS dan Rekan'),
        status,
        publishedAt,
        String(art.seoTitle || title),
        String(art.seoDescription || art.excerpt || ''),
      ],
    )
    summary.articlesUpserted += 1
  }

  // 5. Practice Areas (seed + cms_state overrides & customPracticeAreas)
  const practiceOverrides =
    (cmsState.practiceOverrides as Record<string, Record<string, unknown>> | undefined) ?? {}
  const customPracticeAreas = Array.isArray(cmsState.customPracticeAreas)
    ? (cmsState.customPracticeAreas as Array<Record<string, unknown>>)
    : []
  const allPractices = [...practiceSeed, ...customPracticeAreas]

  for (const rawArea of allPractices) {
    const slug = String(rawArea.slug || '').trim()
    if (!slug) continue
    const override = practiceOverrides[slug] ?? {}
    const merged = { ...rawArea, ...override }
    const pres = DEFAULT_PRACTICE_PRESENTATION[slug]

    const id = String(merged.id || `pa-${slug}`)
    const name = String(merged.name || '')
    const label = String(merged.label || 'LAYANAN')
    const rawSummary = String(merged.summary || '')
    const summaryText =
      rawSummary.startsWith('TODO(client)') && pres ? pres.summary : rawSummary
    const rawDesc = String(merged.description || '')
    const descText =
      rawDesc.startsWith('TODO(client)') && pres ? pres.description : rawDesc
    const rawScope = Array.isArray(merged.advocacyScope)
      ? (merged.advocacyScope as string[])
      : []
    const scopeList =
      rawScope.some((s) => String(s).startsWith('TODO(client)')) && pres
        ? pres.advocacyScope
        : rawScope
    const rawIcon = String(merged.icon || '')
    const icon = rawIcon.startsWith('TODO(client)') ? '' : rawIcon
    const image = String(merged.image || pres?.image || '/images/practice-corporate.webp')
    const displayOrder = Number(merged.displayOrder) || 1
    const isPublished = merged.isPublished === false ? 0 : 1

    await executor.query(
      `INSERT INTO \`practice_areas\`
        (\`id\`, \`slug\`, \`name\`, \`label\`, \`summary\`, \`description\`,
         \`advocacy_scope_json\`, \`icon\`, \`image\`, \`display_order\`, \`is_published\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\` = VALUES(\`name\`),
         \`label\` = VALUES(\`label\`),
         \`summary\` = VALUES(\`summary\`),
         \`description\` = VALUES(\`description\`),
         \`advocacy_scope_json\` = VALUES(\`advocacy_scope_json\`),
         \`icon\` = VALUES(\`icon\`),
         \`image\` = VALUES(\`image\`),
         \`display_order\` = VALUES(\`display_order\`),
         \`is_published\` = VALUES(\`is_published\`)`,
      [
        id,
        slug,
        name,
        label,
        summaryText,
        descText,
        JSON.stringify(scopeList),
        icon,
        image,
        displayOrder,
        isPublished,
      ],
    )
    summary.practiceAreasUpserted += 1
  }

  // 6. Team Members (seed + cms_state teamOverrides & customTeamMembers)
  const teamOverrides =
    (cmsState.teamOverrides as Record<string, Record<string, unknown>> | undefined) ?? {}
  const customTeamMembers = Array.isArray(cmsState.customTeamMembers)
    ? (cmsState.customTeamMembers as Array<Record<string, unknown>>)
    : []
  const allTeam = [...teamSeed, ...customTeamMembers]

  for (const rawMember of allTeam) {
    const slug = String(rawMember.slug || '').trim()
    if (!slug) continue
    const override = teamOverrides[slug] ?? {}
    const merged = { ...rawMember, ...override }

    const id = String(merged.id || `team-${slug}`)
    const fullName = String(merged.fullName || '')
    const honorific = String(merged.honorific || '')
    const displayName = String(
      merged.displayName || (honorific && !honorific.startsWith('TODO(client)') ? `${fullName}, ${honorific}` : fullName),
    )
    const roleTitle = String(merged.roleTitle || merged.group || 'Associate')
    const groupName = String(merged.group || 'Associate')
    const motto = merged.motto ? String(merged.motto) : null
    const shortBio = String(merged.shortBio || '')
    const fullBio = String(merged.fullBio || '')
    const educationJson = JSON.stringify(Array.isArray(merged.education) ? merged.education : [])
    const credentialsJson = JSON.stringify(
      Array.isArray(merged.credentials) ? merged.credentials : [],
    )
    const languagesJson = JSON.stringify(Array.isArray(merged.languages) ? merged.languages : [])
    const tagsJson = JSON.stringify(Array.isArray(merged.tags) ? merged.tags : [])
    const photoJson = JSON.stringify(merged.photo ?? {})
    const displayOrder = Number(merged.displayOrder) || 1
    const isPublished = merged.isPublished === false ? 0 : 1

    await executor.query(
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
        fullName,
        honorific,
        displayName,
        roleTitle,
        groupName,
        motto,
        shortBio,
        fullBio,
        educationJson,
        credentialsJson,
        languagesJson,
        tagsJson,
        photoJson,
        displayOrder,
        isPublished,
      ],
    )
    summary.teamMembersUpserted += 1
  }

  // 7. Case Records
  const caseList = Array.isArray(cmsState.caseRecords)
    ? (cmsState.caseRecords as Array<Record<string, unknown>>)
    : caseSeed
  for (const c of caseList) {
    const id = String(c.id || '')
    if (!id) continue
    const caseType = String(c.caseType || '')
    const region = String(c.region || '')
    const displayMode = c.displayMode === 'named' ? 'named' : 'anonymous'
    const clientName = c.clientName ? String(c.clientName) : null
    const consentRef = c.consentRef ? String(c.consentRef) : null
    const scopeText = c.scope ? String(c.scope) : null
    const displayOrder = Number(c.displayOrder) || 1
    const isPublished = c.isPublished === false ? 0 : 1
    const imageUrl = c.imageUrl ? String(c.imageUrl) : null
    const imageAlt = c.imageAlt ? String(c.imageAlt) : null
    const photosJson = JSON.stringify(Array.isArray(c.photos) ? c.photos : [])

    await executor.query(
      `INSERT INTO \`case_records\`
        (\`id\`, \`case_type\`, \`region\`, \`display_mode\`, \`client_name\`, \`consent_ref\`,
         \`scope_text\`, \`display_order\`, \`is_published\`, \`image_url\`, \`image_alt\`, \`photos_json\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`case_type\` = VALUES(\`case_type\`),
         \`region\` = VALUES(\`region\`),
         \`display_mode\` = VALUES(\`display_mode\`),
         \`client_name\` = VALUES(\`client_name\`),
         \`consent_ref\` = VALUES(\`consent_ref\`),
         \`scope_text\` = VALUES(\`scope_text\`),
         \`display_order\` = VALUES(\`display_order\`),
         \`is_published\` = VALUES(\`is_published\`),
         \`image_url\` = VALUES(\`image_url\`),
         \`image_alt\` = VALUES(\`image_alt\`),
         \`photos_json\` = VALUES(\`photos_json\`)`,
      [
        id,
        caseType,
        region,
        displayMode,
        clientName,
        consentRef,
        scopeText,
        displayOrder,
        isPublished,
        imageUrl,
        imageAlt,
        photosJson,
      ],
    )
    summary.caseRecordsUpserted += 1
  }

  // 8. Inquiries
  for (const inq of inquiriesSeed) {
    const id = String(inq.id || '')
    if (!id) continue
    await executor.query(
      `INSERT INTO \`inquiries\`
        (\`id\`, \`name\`, \`email\`, \`phone\`, \`practice_area_id\`, \`preferred_date\`,
         \`session_slot\`, \`method\`, \`summary\`, \`consent_at\`, \`status\`, \`internal_notes\`,
         \`email_failed\`, \`ip_hash\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`status\` = VALUES(\`status\`),
         \`internal_notes\` = VALUES(\`internal_notes\`),
         \`email_failed\` = VALUES(\`email_failed\`)`,
      [
        id,
        String(inq.name || ''),
        String(inq.email || ''),
        String(inq.phone || ''),
        String(inq.practiceAreaId || ''),
        String(inq.preferredDate || ''),
        inq.sessionSlot === 'siang' || inq.sessionSlot === 'sore' ? inq.sessionSlot : 'pagi',
        inq.method === 'daring' ? 'daring' : 'tatap-muka',
        String(inq.summary || ''),
        toMysqlDateTime(String(inq.consentAt || inq.createdAt || '')),
        ['baru', 'dihubungi', 'selesai', 'spam'].includes(String(inq.status))
          ? String(inq.status)
          : 'baru',
        inq.internalNotes ? String(inq.internalNotes) : null,
        inq.emailFailed ? 1 : 0,
        String(inq.ipHash || 'migrated'),
        toMysqlDateTime(String(inq.createdAt || '')),
      ],
    )
    summary.inquiriesUpserted += 1
  }

  // 9. Instagram Gallery
  const igItems = Array.isArray(cmsState.instagramGallery)
    ? (cmsState.instagramGallery as Array<Record<string, unknown>>)
    : []
  for (const ig of igItems) {
    const id = String(ig.id || '')
    if (!id) continue
    await executor.query(
      `INSERT INTO \`instagram_gallery\`
        (\`id\`, \`shortcode\`, \`permalink\`, \`embed_url\`, \`alt_text\`, \`category\`,
         \`caption\`, \`published_date\`, \`image_url\`, \`display_order\`, \`is_published\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`shortcode\` = VALUES(\`shortcode\`),
         \`permalink\` = VALUES(\`permalink\`),
         \`embed_url\` = VALUES(\`embed_url\`),
         \`alt_text\` = VALUES(\`alt_text\`),
         \`category\` = VALUES(\`category\`),
         \`caption\` = VALUES(\`caption\`),
         \`published_date\` = VALUES(\`published_date\`),
         \`image_url\` = VALUES(\`image_url\`),
         \`display_order\` = VALUES(\`display_order\`),
         \`is_published\` = VALUES(\`is_published\`)`,
      [
        id,
        String(ig.shortcode || ''),
        String(ig.permalink || ''),
        String(ig.embedUrl || ''),
        String(ig.alt || ''),
        String(ig.category || 'Publikasi Resmi'),
        String(ig.caption || ''),
        String(ig.publishedDate || 'Instagram Live'),
        String(ig.imageUrl || ''),
        Number(ig.displayOrder) || 1,
        ig.isPublished === false ? 0 : 1,
      ],
    )
    summary.instagramItemsUpserted += 1
  }

  // 10. Chat Sessions
  const chatSessions = Array.isArray(cmsState.chatSessions)
    ? (cmsState.chatSessions as Array<Record<string, unknown>>)
    : []
  for (const cs of chatSessions) {
    const id = String(cs.id || '')
    if (!id) continue
    await executor.query(
      `INSERT INTO \`chat_sessions\`
        (\`id\`, \`visitor_name\`, \`visitor_phone\`, \`practice_area\`, \`preferred_schedule\`,
         \`notes\`, \`consent_at\`, \`status\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`status\` = VALUES(\`status\`)`,
      [
        id,
        String(cs.visitorName || ''),
        String(cs.visitorPhone || ''),
        String(cs.practiceArea || ''),
        String(cs.preferredSchedule || ''),
        cs.notes ? String(cs.notes) : null,
        toMysqlDateTime(String(cs.consentAt || cs.createdAt || '')),
        String(cs.status || 'baru'),
        toMysqlDateTime(String(cs.createdAt || '')),
      ],
    )
    summary.chatSessionsUpserted += 1
  }

  // 11. Audit Logs
  const auditLogs = Array.isArray(cmsState.auditLogs)
    ? (cmsState.auditLogs as Array<Record<string, unknown>>)
    : []
  for (const al of auditLogs) {
    const id = String(al.id || '')
    if (!id) continue
    await executor.query(
      `INSERT INTO \`audit_logs\`
        (\`id\`, \`actor\`, \`action\`, \`collection_name\`, \`target_id\`, \`detail\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`detail\` = VALUES(\`detail\`)`,
      [
        id,
        String(al.actor || 'system'),
        String(al.action || 'EVENT'),
        String(al.collection || 'system'),
        String(al.targetId || 'global'),
        String(al.detail || ''),
        toMysqlDateTime(String(al.timestamp || '')),
      ],
    )
    summary.auditLogsUpserted += 1
  }

  return summary
}
