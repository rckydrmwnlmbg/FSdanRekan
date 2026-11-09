#!/usr/bin/env node
/**
 * scripts/migrate_mysql.mjs
 * Skrip Migrasi & Seed Idempoten dari content/*.json & content/cms_state.json ke MySQL/MariaDB.
 * Aman dijalankan berulang kali (ON DUPLICATE KEY UPDATE).
 * Password admin awal dibaca dari env ADMIN_INITIAL_PASSWORD (tidak pernah di-hardcode).
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

function loadEnvFiles() {
  for (const envName of ['.env.local', '.env']) {
    const envPath = path.join(ROOT_DIR, envName)
    if (!fs.existsSync(envPath)) continue
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx <= 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

function hashPasswordScrypt(plainPassword) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$8$1$${salt.toString('hex')}$${derived.toString('hex')}`
}

function splitSqlStatements(sqlContent) {
  return sqlContent
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function toMysqlDateTime(isoOrDate) {
  if (!isoOrDate) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ')
}

function readJsonSafe(relPath, fallback) {
  try {
    const full = path.join(ROOT_DIR, relPath)
    if (!fs.existsSync(full)) return fallback
    return JSON.parse(fs.readFileSync(full, 'utf8'))
  } catch {
    return fallback
  }
}

const DEFAULT_PRACTICE_PRESENTATION = {
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

async function main() {
  loadEnvFiles()
  const dbUrl = (process.env.DATABASE_URL || '').trim()
  if (!dbUrl) {
    console.error('[ERROR] Variabel lingkungan DATABASE_URL belum diatur.')
    console.error('Contoh: DATABASE_URL="mysql://user:pass@localhost:3306/fsdanrekan"')
    process.exit(1)
  }

  const conn = await mysql.createConnection({
    uri: dbUrl,
    timezone: 'Z',
  })

  try {
    console.log('[1/4] Menjalankan skema database (database/schema.sql)...')
    const schemaSql = fs.readFileSync(path.join(ROOT_DIR, 'database', 'schema.sql'), 'utf8')
    const statements = splitSqlStatements(schemaSql)
    for (const stmt of statements) {
      await conn.query(stmt)
    }
    console.log(`      -> ${statements.length} pernyataan SQL berhasil dieksekusi.`)

    console.log('[2/4] Memeriksa dan menyiapkan akun Admin awal dari environment variable...')
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@fsdanrekan.com')
      .trim()
      .toLowerCase()
    const adminPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim()

    if (adminPass.length >= 12) {
      const [existing] = await conn.query('SELECT id FROM `users` WHERE `email` = ? LIMIT 1', [
        adminEmail,
      ])
      const passwordHash = hashPasswordScrypt(adminPass)
      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO \`users\`
            (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
           VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
          ['user-admin-1', 'Administrator Utama', adminEmail, passwordHash],
        )
        console.log(
          `      -> Akun admin awal (${adminEmail}) berhasil dibuat (wajib ganti password saat login pertama).`,
        )
      } else {
        console.log(`      -> Akun admin (${adminEmail}) sudah ada, dilewati (idempoten).`)
      }
    } else {
      console.log(
        '      -> [PERINGATAN] ADMIN_INITIAL_PASSWORD belum diisi (minimal 12 karakter); pembuatan user baru dilewati.',
      )
    }

    const editorEmail = (process.env.EDITOR_INITIAL_EMAIL || 'editor@fsdanrekan.com')
      .trim()
      .toLowerCase()
    const editorPass = (process.env.EDITOR_INITIAL_PASSWORD || '').trim()
    if (editorPass.length >= 12) {
      const [existingEd] = await conn.query('SELECT id FROM `users` WHERE `email` = ? LIMIT 1', [
        editorEmail,
      ])
      if (existingEd.length === 0) {
        const editorHash = hashPasswordScrypt(editorPass)
        await conn.query(
          `INSERT INTO \`users\`
            (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`mfa_enabled\`, \`must_change_password\`)
           VALUES (?, ?, ?, ?, 'editor', 1, 1)`,
          ['user-editor-1', 'Tim Redaksi Hukum (Editor)', editorEmail, editorHash],
        )
        console.log(`      -> Akun editor awal (${editorEmail}) berhasil dibuat.`)
      }
    }

    console.log('[3/4] Mengimpor data dari content/cms_state.json dan content/*.json...')
    const cmsState = readJsonSafe('content/cms_state.json', {})
    const teamSeed = readJsonSafe('content/team.json', [])
    const practiceSeed = readJsonSafe('content/practice_areas.json', [])
    const articlesSeed = readJsonSafe('content/articles.json', [])
    const caseSeed = readJsonSafe('content/case_records.json', [])
    const inquiriesSeed = readJsonSafe('content/inquiries.json', [])

    if (cmsState.siteSettings) {
      await conn.query(
        `INSERT INTO \`site_settings\` (\`setting_key\`, \`settings_json\`)
         VALUES ('global', ?)
         ON DUPLICATE KEY UPDATE \`settings_json\` = VALUES(\`settings_json\`)`,
        [JSON.stringify(cmsState.siteSettings)],
      )
    }

    for (const cat of cmsState.categories || []) {
      await conn.query(
        `INSERT INTO \`categories\` (\`id\`, \`slug\`, \`name\`, \`description\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`description\` = VALUES(\`description\`)`,
        [String(cat.id), String(cat.slug), String(cat.name), String(cat.description || '')],
      )
    }

    for (const art of articlesSeed) {
      const coverUrl = art.coverUrl || art.coverImage?.url || '/images/practice-corporate.webp'
      const coverAlt = art.coverAlt || art.coverImage?.alt || `Ilustrasi ${art.title}`
      await conn.query(
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
          String(art.id),
          String(art.slug),
          String(art.title),
          String(art.excerpt || ''),
          String(art.bodyHtml || ''),
          String(coverUrl),
          String(coverAlt),
          String(art.category?.slug || 'hukum-korporasi'),
          String(art.category?.name || 'Hukum Korporasi & Bisnis'),
          String(art.authorName || 'Tim Redaksi FS dan Rekan'),
          art.status === 'published' ? 'published' : 'draft',
          toMysqlDateTime(art.publishedAt),
          String(art.seoTitle || art.title),
          String(art.seoDescription || art.excerpt || ''),
        ],
      )
    }

    const practiceOverrides = cmsState.practiceOverrides || {}
    const allPractices = [...practiceSeed, ...(cmsState.customPracticeAreas || [])]
    for (const rawArea of allPractices) {
      const slug = String(rawArea.slug || '').trim()
      if (!slug) continue
      const merged = { ...rawArea, ...(practiceOverrides[slug] || {}) }
      const pres = DEFAULT_PRACTICE_PRESENTATION[slug]
      const summary =
        String(merged.summary || '').startsWith('TODO(client)') && pres
          ? pres.summary
          : String(merged.summary || '')
      const description =
        String(merged.description || '').startsWith('TODO(client)') && pres
          ? pres.description
          : String(merged.description || '')
      const scope =
        Array.isArray(merged.advocacyScope) &&
        merged.advocacyScope.some((s) => String(s).startsWith('TODO(client)')) &&
        pres
          ? pres.advocacyScope
          : merged.advocacyScope || []

      await conn.query(
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
          String(merged.id || `pa-${slug}`),
          slug,
          String(merged.name || ''),
          String(merged.label || 'LAYANAN'),
          summary,
          description,
          JSON.stringify(scope),
          String(merged.icon || '').startsWith('TODO(client)') ? '' : String(merged.icon || ''),
          String(merged.image || pres?.image || '/images/practice-corporate.webp'),
          Number(merged.displayOrder) || 1,
          merged.isPublished === false ? 0 : 1,
        ],
      )
    }

    const teamOverrides = cmsState.teamOverrides || {}
    const allTeam = [...teamSeed, ...(cmsState.customTeamMembers || [])]
    for (const rawMember of allTeam) {
      const slug = String(rawMember.slug || '').trim()
      if (!slug) continue
      const merged = { ...rawMember, ...(teamOverrides[slug] || {}) }
      await conn.query(
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
          String(merged.id || `team-${slug}`),
          slug,
          String(merged.fullName || ''),
          String(merged.honorific || ''),
          String(merged.displayName || merged.fullName || ''),
          String(merged.roleTitle || merged.group || 'Associate'),
          String(merged.group || 'Associate'),
          merged.motto ? String(merged.motto) : null,
          String(merged.shortBio || ''),
          String(merged.fullBio || ''),
          JSON.stringify(merged.education || []),
          JSON.stringify(merged.credentials || []),
          JSON.stringify(merged.languages || []),
          JSON.stringify(merged.tags || []),
          JSON.stringify(merged.photo || {}),
          Number(merged.displayOrder) || 1,
          merged.isPublished === false ? 0 : 1,
        ],
      )
    }

    const caseList = Array.isArray(cmsState.caseRecords) ? cmsState.caseRecords : caseSeed
    for (const c of caseList) {
      await conn.query(
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
          String(c.id),
          String(c.caseType || ''),
          String(c.region || ''),
          c.displayMode === 'named' ? 'named' : 'anonymous',
          c.clientName ? String(c.clientName) : null,
          c.consentRef ? String(c.consentRef) : null,
          c.scope ? String(c.scope) : null,
          Number(c.displayOrder) || 1,
          c.isPublished === false ? 0 : 1,
          c.imageUrl ? String(c.imageUrl) : null,
          c.imageAlt ? String(c.imageAlt) : null,
          JSON.stringify(c.photos || []),
        ],
      )
    }

    for (const inq of inquiriesSeed) {
      if (!inq.id) continue
      await conn.query(
        `INSERT INTO \`inquiries\`
          (\`id\`, \`name\`, \`email\`, \`phone\`, \`practice_area_id\`, \`preferred_date\`,
           \`session_slot\`, \`method\`, \`summary\`, \`consent_at\`, \`status\`, \`internal_notes\`,
           \`email_failed\`, \`ip_hash\`, \`created_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\` = VALUES(\`status\`)`,
        [
          String(inq.id),
          String(inq.name || ''),
          String(inq.email || ''),
          String(inq.phone || ''),
          String(inq.practiceAreaId || ''),
          String(inq.preferredDate || ''),
          inq.sessionSlot === 'siang' || inq.sessionSlot === 'sore' ? inq.sessionSlot : 'pagi',
          inq.method === 'daring' ? 'daring' : 'tatap-muka',
          String(inq.summary || ''),
          toMysqlDateTime(inq.consentAt || inq.createdAt),
          String(inq.status || 'baru'),
          inq.internalNotes ? String(inq.internalNotes) : null,
          inq.emailFailed ? 1 : 0,
          String(inq.ipHash || 'migrated'),
          toMysqlDateTime(inq.createdAt),
        ],
      )
    }

    for (const ig of cmsState.instagramGallery || []) {
      await conn.query(
        `INSERT INTO \`instagram_gallery\`
          (\`id\`, \`shortcode\`, \`permalink\`, \`embed_url\`, \`alt_text\`, \`category\`,
           \`caption\`, \`published_date\`, \`image_url\`, \`display_order\`, \`is_published\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`caption\` = VALUES(\`caption\`),
           \`image_url\` = VALUES(\`image_url\`),
           \`display_order\` = VALUES(\`display_order\`),
           \`is_published\` = VALUES(\`is_published\`)`,
        [
          String(ig.id),
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
    }

    for (const al of cmsState.auditLogs || []) {
      await conn.query(
        `INSERT INTO \`audit_logs\`
          (\`id\`, \`actor\`, \`action\`, \`collection_name\`, \`target_id\`, \`detail\`, \`created_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`detail\` = VALUES(\`detail\`)`,
        [
          String(al.id),
          String(al.actor || 'system'),
          String(al.action || 'EVENT'),
          String(al.collection || 'system'),
          String(al.targetId || 'global'),
          String(al.detail || ''),
          toMysqlDateTime(al.timestamp),
        ],
      )
    }

    console.log('[4/4] Migrasi & seed idempoten selesai dengan sukses.')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('[ERROR] Migrasi gagal:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})

