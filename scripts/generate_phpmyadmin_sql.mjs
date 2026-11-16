#!/usr/bin/env node
/**
 * Generates `database/phpmyadmin_bootstrap.sql`:
 * A single SQL file ready for import via phpMyAdmin (for cPanel accounts without SSH/Terminal).
 * Includes:
 *   1. Full 14-table schema (`database/schema.sql`)
 *   2. Idempotent seed data from `content/*.json` and `content/cms_state.json`
 *      (`INSERT ... ON DUPLICATE KEY UPDATE`) matching `runIdempotentDataMigration()`
 *   3. Zero credentials or password hashes in the SQL file (the initial admin user is
 *      provisioned automatically on first login from `ADMIN_INITIAL_EMAIL` +
 *      `ADMIN_INITIAL_PASSWORD` environment variables with `must_change_password = 1`).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()

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

function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return Number.isFinite(val) ? String(Math.trunc(val)) : '0'
  if (typeof val === 'boolean') return val ? '1' : '0'
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\0/g, '\\0')
  return `'${str}'`
}

function toMysqlDateTime(isoOrDate) {
  if (!isoOrDate) return '2026-10-01 09:00:00'
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) return '2026-10-01 09:00:00'
  return parsed.toISOString().slice(0, 19).replace('T', ' ')
}

function readJsonSafe(relPath, fallback) {
  const full = resolve(ROOT, relPath)
  if (!existsSync(full)) return fallback
  try {
    return JSON.parse(readFileSync(full, 'utf8'))
  } catch {
    return fallback
  }
}

function main() {
  const schemaSql = readFileSync(resolve(ROOT, 'database', 'schema.sql'), 'utf8')
  const cmsState = readJsonSafe('content/cms_state.json', {})
  const teamSeed = readJsonSafe('content/team.json', [])
  const practiceSeed = readJsonSafe('content/practice_areas.json', [])
  const articlesSeed = readJsonSafe('content/articles.json', [])
  const caseSeed = readJsonSafe('content/case_records.json', [])

  const lines = [
    '-- ============================================================================',
    '-- Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan)',
    '-- File Bootstrap Database Lengkap untuk phpMyAdmin (Jalur Tanpa Terminal / SSH)',
    '-- Mencakup: 14 Tabel Skema + Seed Konten Resmi dari content/*.json (Idempoten)',
    '-- Keamanan: Tidak menyimpan password admin di dalam file SQL.',
    '--           Akun admin pertama dibuat otomatis saat login pertama di /admin',
    '--           menggunakan env ADMIN_INITIAL_EMAIL & ADMIN_INITIAL_PASSWORD.',
    '-- ============================================================================',
    '',
    'SET NAMES utf8mb4;',
    "SET time_zone = '+00:00';",
    '',
    schemaSql.trim(),
    '',
    '-- ============================================================================',
    '-- SEED DATA AWAL (IDEMPOTEN — AMAN DIIMPOR BERULANG KALI)',
    '-- ============================================================================',
    '',
  ]

  // 1. Site Settings
  const rawSettings = cmsState.siteSettings ?? {}
  if (Object.keys(rawSettings).length > 0) {
    lines.push('-- 1. Site Settings (Global)')
    lines.push(
      `INSERT INTO \`site_settings\` (\`setting_key\`, \`settings_json\`) VALUES ('global', ${sqlVal(JSON.stringify(rawSettings))}) ON DUPLICATE KEY UPDATE \`settings_json\` = VALUES(\`settings_json\`);`,
    )
    lines.push('')
  }

  // 2. Categories
  const categories = Array.isArray(cmsState.categories) ? cmsState.categories : []
  lines.push('-- 2. Categories')
  for (const cat of categories) {
    const id = String(cat.id || `cat-${cat.slug}`)
    const slug = String(cat.slug || '').trim()
    const name = String(cat.name || '').trim()
    const description = String(cat.description || '')
    if (!slug || !name) continue
    lines.push(
      `INSERT INTO \`categories\` (\`id\`, \`slug\`, \`name\`, \`description\`) VALUES (${sqlVal(id)}, ${sqlVal(slug)}, ${sqlVal(name)}, ${sqlVal(description)}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`description\` = VALUES(\`description\`);`,
    )
  }
  lines.push('')

  // 3. Articles
  lines.push('-- 3. Articles')
  for (const art of articlesSeed) {
    const id = String(art.id || '')
    const slug = String(art.slug || '').trim()
    const title = String(art.title || '').trim()
    if (!id || !slug || !title) continue
    const coverImage = art.coverImage ?? {}
    const coverUrl = String(art.coverUrl || coverImage.url || '/images/practice-corporate.webp')
    const coverAlt = String(art.coverAlt || coverImage.alt || `Ilustrasi ${title}`)
    const catObj = art.category ?? {}
    const categorySlug = String(catObj.slug || 'hukum-korporasi')
    const categoryName = String(catObj.name || 'Hukum Korporasi & Bisnis')
    const status = art.status === 'published' ? 'published' : 'draft'
    const publishedAt = toMysqlDateTime(String(art.publishedAt || '2026-10-01T09:00:00.000Z'))
    lines.push(
      `INSERT INTO \`articles\` (\`id\`, \`slug\`, \`title\`, \`excerpt\`, \`body_html\`, \`cover_url\`, \`cover_alt\`, \`category_slug\`, \`category_name\`, \`author_name\`, \`status\`, \`published_at\`, \`seo_title\`, \`seo_description\`) VALUES (${sqlVal(id)}, ${sqlVal(slug)}, ${sqlVal(title)}, ${sqlVal(String(art.excerpt || ''))}, ${sqlVal(String(art.bodyHtml || ''))}, ${sqlVal(coverUrl)}, ${sqlVal(coverAlt)}, ${sqlVal(categorySlug)}, ${sqlVal(categoryName)}, ${sqlVal(String(art.authorName || 'Tim Redaksi FS dan Rekan'))}, ${sqlVal(status)}, ${sqlVal(publishedAt)}, ${sqlVal(String(art.seoTitle || title))}, ${sqlVal(String(art.seoDescription || art.excerpt || ''))}) ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`), \`status\` = VALUES(\`status\`);`,
    )
  }
  lines.push('')

  // 4. Practice Areas
  lines.push('-- 4. Practice Areas (10 Bidang Layanan Hukum)')
  const practiceOverrides = cmsState.practiceOverrides ?? {}
  const customPracticeAreas = Array.isArray(cmsState.customPracticeAreas)
    ? cmsState.customPracticeAreas
    : []
  for (const rawArea of [...practiceSeed, ...customPracticeAreas]) {
    const slug = String(rawArea.slug || '').trim()
    if (!slug) continue
    const merged = { ...rawArea, ...(practiceOverrides[slug] ?? {}) }
    const pres = DEFAULT_PRACTICE_PRESENTATION[slug]
    const id = String(merged.id || `pa-${slug}`)
    const name = String(merged.name || '')
    const label = String(merged.label || 'LAYANAN')
    const rawSummary = String(merged.summary || '')
    const summaryText = rawSummary.startsWith('TODO(client)') && pres ? pres.summary : rawSummary
    const rawDesc = String(merged.description || '')
    const descText = rawDesc.startsWith('TODO(client)') && pres ? pres.description : rawDesc
    const rawScope = Array.isArray(merged.advocacyScope) ? merged.advocacyScope : []
    const scopeList =
      rawScope.some((s) => String(s).startsWith('TODO(client)')) && pres
        ? pres.advocacyScope
        : rawScope
    const rawIcon = String(merged.icon || '')
    const icon = rawIcon.startsWith('TODO(client)') ? '' : rawIcon
    const image = String(merged.image || pres?.image || '/images/practice-corporate.webp')
    const displayOrder = Number(merged.displayOrder) || 1
    const isPublished = merged.isPublished === false ? 0 : 1
    lines.push(
      `INSERT INTO \`practice_areas\` (\`id\`, \`slug\`, \`name\`, \`label\`, \`summary\`, \`description\`, \`advocacy_scope_json\`, \`icon\`, \`image\`, \`display_order\`, \`is_published\`) VALUES (${sqlVal(id)}, ${sqlVal(slug)}, ${sqlVal(name)}, ${sqlVal(label)}, ${sqlVal(summaryText)}, ${sqlVal(descText)}, ${sqlVal(JSON.stringify(scopeList))}, ${sqlVal(icon)}, ${sqlVal(image)}, ${sqlVal(displayOrder)}, ${sqlVal(isPublished)}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`summary\` = VALUES(\`summary\`);`,
    )
  }
  lines.push('')

  // 5. Team Members
  lines.push('-- 5. Team Members (Profil Advokat & Konsultan Hukum)')
  const teamOverrides = cmsState.teamOverrides ?? {}
  const customTeamMembers = Array.isArray(cmsState.customTeamMembers)
    ? cmsState.customTeamMembers
    : []
  for (const rawMember of [...teamSeed, ...customTeamMembers]) {
    const slug = String(rawMember.slug || '').trim()
    if (!slug) continue
    const merged = { ...rawMember, ...(teamOverrides[slug] ?? {}) }
    const id = String(merged.id || `team-${slug}`)
    const fullName = String(merged.fullName || '')
    const honorific = String(merged.honorific || '')
    const displayName = String(
      merged.displayName ||
        (honorific && !honorific.startsWith('TODO(client)')
          ? `${fullName}, ${honorific}`
          : fullName),
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
    lines.push(
      `INSERT INTO \`team_members\` (\`id\`, \`slug\`, \`full_name\`, \`honorific\`, \`display_name\`, \`role_title\`, \`group_name\`, \`motto\`, \`short_bio\`, \`full_bio\`, \`education_json\`, \`credentials_json\`, \`languages_json\`, \`tags_json\`, \`photo_json\`, \`display_order\`, \`is_published\`) VALUES (${sqlVal(id)}, ${sqlVal(slug)}, ${sqlVal(fullName)}, ${sqlVal(honorific)}, ${sqlVal(displayName)}, ${sqlVal(roleTitle)}, ${sqlVal(groupName)}, ${sqlVal(motto)}, ${sqlVal(shortBio)}, ${sqlVal(fullBio)}, ${sqlVal(educationJson)}, ${sqlVal(credentialsJson)}, ${sqlVal(languagesJson)}, ${sqlVal(tagsJson)}, ${sqlVal(photoJson)}, ${sqlVal(displayOrder)}, ${sqlVal(isPublished)}) ON DUPLICATE KEY UPDATE \`display_name\` = VALUES(\`display_name\`), \`role_title\` = VALUES(\`role_title\`);`,
    )
  }
  lines.push('')

  // 6. Case Records
  lines.push('-- 6. Case Records (Rekam Jejak Perkara)')
  const caseList = Array.isArray(cmsState.caseRecords) ? cmsState.caseRecords : caseSeed
  for (const c of caseList) {
    const id = String(c.id || '')
    if (!id) continue
    const caseType = String(c.caseType || '')
    const region = String(c.region || '')
    const displayMode = c.displayMode === 'named' && c.consentRef ? 'named' : 'anonymous'
    const clientName = displayMode === 'named' && c.clientName ? String(c.clientName) : null
    const consentRef = c.consentRef ? String(c.consentRef) : null
    const scopeText = c.scope ? String(c.scope) : null
    const displayOrder = Number(c.displayOrder) || 1
    const isPublished = c.isPublished === false ? 0 : 1
    const imageUrl = c.imageUrl ? String(c.imageUrl) : null
    const imageAlt = c.imageAlt ? String(c.imageAlt) : null
    const photosJson = JSON.stringify(Array.isArray(c.photos) ? c.photos : [])
    lines.push(
      `INSERT INTO \`case_records\` (\`id\`, \`case_type\`, \`region\`, \`display_mode\`, \`client_name\`, \`consent_ref\`, \`scope_text\`, \`display_order\`, \`is_published\`, \`image_url\`, \`image_alt\`, \`photos_json\`) VALUES (${sqlVal(id)}, ${sqlVal(caseType)}, ${sqlVal(region)}, ${sqlVal(displayMode)}, ${sqlVal(clientName)}, ${sqlVal(consentRef)}, ${sqlVal(scopeText)}, ${sqlVal(displayOrder)}, ${sqlVal(isPublished)}, ${sqlVal(imageUrl)}, ${sqlVal(imageAlt)}, ${sqlVal(photosJson)}) ON DUPLICATE KEY UPDATE \`case_type\` = VALUES(\`case_type\`), \`region\` = VALUES(\`region\`);`,
    )
  }
  lines.push('')

  // 7. Instagram Gallery
  lines.push('-- 7. Instagram Gallery')
  const igItems = Array.isArray(cmsState.instagramGallery) ? cmsState.instagramGallery : []
  for (const ig of igItems) {
    const id = String(ig.id || '')
    if (!id) continue
    lines.push(
      `INSERT INTO \`instagram_gallery\` (\`id\`, \`shortcode\`, \`permalink\`, \`embed_url\`, \`alt_text\`, \`category\`, \`caption\`, \`published_date\`, \`image_url\`, \`display_order\`, \`is_published\`) VALUES (${sqlVal(id)}, ${sqlVal(String(ig.shortcode || ''))}, ${sqlVal(String(ig.permalink || ''))}, ${sqlVal(String(ig.embedUrl || ''))}, ${sqlVal(String(ig.alt || ''))}, ${sqlVal(String(ig.category || 'Publikasi Resmi'))}, ${sqlVal(String(ig.caption || ''))}, ${sqlVal(String(ig.publishedDate || 'Instagram Live'))}, ${sqlVal(String(ig.imageUrl || ''))}, ${sqlVal(Number(ig.displayOrder) || 1)}, ${sqlVal(ig.isPublished === false ? 0 : 1)}) ON DUPLICATE KEY UPDATE \`permalink\` = VALUES(\`permalink\`), \`embed_url\` = VALUES(\`embed_url\`), \`alt_text\` = VALUES(\`alt_text\`), \`caption\` = VALUES(\`caption\`);`,
    )
  }
  lines.push('')

  const outPath = resolve(ROOT, 'database', 'phpmyadmin_bootstrap.sql')
  writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log(`[generate_phpmyadmin_sql] Berhasil membuat ${outPath}`)
}

main()
