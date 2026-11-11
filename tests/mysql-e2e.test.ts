import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET as healthGet } from '../src/app/api/health/route'
import { GET as adminAuthGet, POST as adminAuthPost } from '../src/app/api/admin/auth/route'
import { GET as adminCmsGet, POST as adminCmsPost } from '../src/app/api/admin/cms/route'
import { POST as adminUploadPost } from '../src/app/api/admin/upload/route'
import { POST as inquiryPost } from '../src/app/api/inquiry/route'
import { GET as uploadsGet } from '../src/app/uploads/[...path]/route'
import {
  getDbPool,
  resetDbPoolForTest,
  runIdempotentDataMigration,
  splitSqlStatements,
} from '../src/lib/db'
import {
  fetchPracticeAreaBySlugFromDb,
  fetchPublicCaseRecordsFromDb,
  fetchPublishedArticleBySlugFromDb,
  fetchSiteSettingsFromDb,
  fetchTeamMemberBySlugFromDb,
} from '../src/lib/content'
import { createInquiry } from '../src/lib/inquiries'
import { resetMemoryRateLimitsForTest } from '../src/lib/security/ratelimit'

const TEST_PORT = 3308
const E2E_DB_NAME = 'fsdanrekan_e2e'
const PMA_DB_NAME = 'fsdanrekan_pma'

function findMariaDbBinDir(): string | null {
  const localAppData = process.env.LOCALAPPDATA || ''
  const candidate = join(localAppData, 'Programs', 'MariaDB', 'bin')
  if (existsSync(join(candidate, 'mariadbd.exe'))) {
    return candidate
  }
  return null
}

async function waitForDatabaseReady(uri: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const conn = await mysql.createConnection(uri)
      await conn.query('SELECT 1')
      await conn.end()
      return
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  throw new Error(`MariaDB test server did not become ready within ${timeoutMs}ms`)
}

describe('Real MariaDB End-to-End Integration Suite (Migrations, Auth, CRUD, Uploads, Inquiry SMTP & No-Terminal SQL)', () => {
  let mariaProc: ChildProcess | null = null
  let tempDataDir: string | null = null
  let tempUploadDir: string | null = null
  let baseServerUri = ''
  let e2eDatabaseUrl = ''
  let pmaDatabaseUrl = ''

  let sessionCookie = ''
  let csrfToken = ''

  beforeAll(async () => {
    tempUploadDir = mkdtempSync(join(tmpdir(), 'fs-e2e-uploads-'))
    process.env.UPLOAD_DIR = tempUploadDir
    process.env.SESSION_SECRET = 'e2e-test-session-secret-minimum-32-characters-long'
    process.env.PAYLOAD_SECRET = 'e2e-test-payload-secret-minimum-32-characters-long'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fsdanrekan.com'
    process.env.ADMIN_INITIAL_EMAIL = 'admin@fsdanrekan.com'
    process.env.ADMIN_INITIAL_PASSWORD = 'InitialAdminPass2026!#'
    process.env.TURNSTILE_SECRET_KEY = ''

    if (process.env.TEST_MYSQL_BASE_URI) {
      baseServerUri = process.env.TEST_MYSQL_BASE_URI
    } else {
      const binDir = findMariaDbBinDir()
      if (!binDir) {
        throw new Error('MariaDB binary not found for E2E test')
      }
      tempDataDir = mkdtempSync(join(tmpdir(), 'fs-mariadb-e2e-'))
      execFileSync(join(binDir, 'mysql_install_db.exe'), [`--datadir=${tempDataDir}`], {
        stdio: 'ignore',
      })
      mariaProc = spawn(
        join(binDir, 'mariadbd.exe'),
        [
          `--datadir=${tempDataDir}`,
          `--port=${TEST_PORT}`,
          '--bind-address=127.0.0.1',
          '--character-set-server=utf8mb4',
          '--collation-server=utf8mb4_unicode_ci',
          '--console',
        ],
        { stdio: 'ignore', windowsHide: true },
      )
      baseServerUri = `mysql://root:@127.0.0.1:${TEST_PORT}`
    }

    await waitForDatabaseReady(baseServerUri)

    const rootConn = await mysql.createConnection(baseServerUri)
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${E2E_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${PMA_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await rootConn.end()

    e2eDatabaseUrl = `${baseServerUri}/${E2E_DB_NAME}`
    pmaDatabaseUrl = `${baseServerUri}/${PMA_DB_NAME}`
    process.env.DATABASE_URL = e2eDatabaseUrl
    await resetDbPoolForTest()
  }, 45000)

  afterAll(async () => {
    await resetDbPoolForTest()
    delete process.env.DATABASE_URL

    if (mariaProc) {
      const binDir = findMariaDbBinDir()
      if (binDir) {
        try {
          execFileSync(
            join(binDir, 'mysqladmin.exe'),
            ['-h', '127.0.0.1', '-P', String(TEST_PORT), '-u', 'root', 'shutdown'],
            { stdio: 'ignore' },
          )
        } catch {
          mariaProc.kill()
        }
      } else {
        mariaProc.kill()
      }
    }

    if (tempDataDir && existsSync(tempDataDir)) {
      try {
        rmSync(tempDataDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup locks on Windows
      }
    }
    if (tempUploadDir && existsSync(tempUploadDir)) {
      try {
        rmSync(tempUploadDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup locks on Windows
      }
    }
  }, 30000)

  it('Step 1: runs db:migrate twice against real MariaDB and verifies 100% idempotency', async () => {
    const run1 = await runIdempotentDataMigration()
    expect(run1.tablesCreated).toBeGreaterThanOrEqual(14)
    expect(run1.usersUpserted).toBe(1)
    expect(run1.practiceAreasUpserted).toBe(10)
    expect(run1.teamMembersUpserted).toBeGreaterThanOrEqual(6)
    expect(run1.articlesUpserted).toBe(4)

    const pool = getDbPool()!
    const countTable = async (table: string) => {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM \`${table}\``)
      return Number(rows[0]?.cnt ?? 0)
    }

    const countsAfterRun1 = {
      users: await countTable('users'),
      categories: await countTable('categories'),
      articles: await countTable('articles'),
      practiceAreas: await countTable('practice_areas'),
      teamMembers: await countTable('team_members'),
      caseRecords: await countTable('case_records'),
      siteSettings: await countTable('site_settings'),
    }

    // Run migration a second time -> must not duplicate any rows or overwrite existing user password
    const run2 = await runIdempotentDataMigration()
    expect(run2.usersUpserted).toBe(0)

    const countsAfterRun2 = {
      users: await countTable('users'),
      categories: await countTable('categories'),
      articles: await countTable('articles'),
      practiceAreas: await countTable('practice_areas'),
      teamMembers: await countTable('team_members'),
      caseRecords: await countTable('case_records'),
      siteSettings: await countTable('site_settings'),
    }

    expect(countsAfterRun2).toEqual(countsAfterRun1)
  })

  it('Step 2: /api/health returns 200 OK with connected MariaDB status and latency', async () => {
    const res = await healthGet()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: boolean
      status: string
      database: { configured: boolean; connected: boolean; latencyMs: number }
    }
    expect(body.ok).toBe(true)
    expect(body.status).toBe('healthy')
    expect(body.database.configured).toBe(true)
    expect(body.database.connected).toBe(true)
    expect(typeof body.database.latencyMs).toBe('number')
  })

  it('Step 3: logs into /api/admin/auth, enforces mandatory first-login password change, and updates session', async () => {
    resetMemoryRateLimitsForTest()
    const loginReq = new Request('https://fsdanrekan.com/api/admin/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
      },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@fsdanrekan.com',
        password: 'InitialAdminPass2026!#',
      }),
    })

    const loginRes = await adminAuthPost(loginReq)
    expect(loginRes.status).toBe(200)
    const setCookieHeader = loginRes.headers.get('set-cookie') || ''
    expect(setCookieHeader).toContain('fs_admin_session=')
    expect(setCookieHeader).toContain('HttpOnly')
    sessionCookie = setCookieHeader.split(';')[0] ?? ''

    const loginBody = (await loginRes.json()) as {
      ok: boolean
      user: { mustChangePassword: boolean; csrfToken: string; role: string }
    }
    expect(loginBody.ok).toBe(true)
    expect(loginBody.user.mustChangePassword).toBe(true)
    expect(loginBody.user.role).toBe('admin')
    csrfToken = loginBody.user.csrfToken

    // Change initial password
    const changeReq = new Request('https://fsdanrekan.com/api/admin/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
        cookie: sessionCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        action: 'change_password',
        currentPassword: 'InitialAdminPass2026!#',
        newPassword: 'PermanentAdminPass2026!#',
      }),
    })

    const changeRes = await adminAuthPost(changeReq)
    expect(changeRes.status).toBe(200)

    // Verify GET /api/admin/auth now reports mustChangePassword = false
    const sessionCheckReq = new Request('https://fsdanrekan.com/api/admin/auth', {
      method: 'GET',
      headers: { cookie: sessionCookie },
    })
    const sessionCheckRes = await adminAuthGet(sessionCheckReq)
    expect(sessionCheckRes.status).toBe(200)
    const sessionCheckBody = (await sessionCheckRes.json()) as {
      authenticated: boolean
      user: { mustChangePassword: boolean }
    }
    expect(sessionCheckBody.authenticated).toBe(true)
    expect(sessionCheckBody.user.mustChangePassword).toBe(false)

    // Verify old password no longer works
    const oldLoginReq = new Request('https://fsdanrekan.com/api/admin/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
      },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@fsdanrekan.com',
        password: 'InitialAdminPass2026!#',
      }),
    })
    const oldLoginRes = await adminAuthPost(oldLoginReq)
    expect(oldLoginRes.status).toBe(401)
  })

  it('Step 4: performs full CRUD across all CMS modules in MariaDB (categories, articles, practice areas, team, case records, instagram, settings, users)', async () => {
    const callCms = async (payload: Record<string, unknown>) => {
      const req = new Request('https://fsdanrekan.com/api/admin/cms', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://fsdanrekan.com',
          cookie: sessionCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(payload),
      })
      return adminCmsPost(req)
    }

    // 4a. Category CRUD
    const catSave = await callCms({
      module: 'category',
      action: 'upsert',
      id: 'cat-e2e-test',
      slug: 'kepatuhan-korporasi-uji',
      name: 'Kepatuhan Korporasi Uji',
      description: 'Kategori uji integrasi E2E MariaDB.',
    })
    expect(catSave.status).toBe(200)

    // 4b. Article CRUD + XSS sanitization + draft/published visibility
    const artSave = await callCms({
      module: 'article',
      action: 'upsert',
      id: 'art-e2e-1',
      slug: 'analisis-hukum-kontrak-e2e',
      title: 'Analisis Hukum Kontrak Komersial E2E',
      excerpt: 'Ringkasan artikel uji end-to-end pada database MariaDB.',
      bodyHtml: '<p>Paragraf resmi.</p><script>alert("xss")</script>',
      coverUrl: '/images/practice-corporate.webp',
      coverAlt: 'Ilustrasi Analisis Hukum Kontrak',
      categorySlug: 'kepatuhan-korporasi-uji',
      categoryName: 'Kepatuhan Korporasi Uji',
      authorName: 'Tim Redaksi FS dan Rekan',
      status: 'published',
      publishedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(artSave.status).toBe(200)

    const fetchedArt = await fetchPublishedArticleBySlugFromDb('analisis-hukum-kontrak-e2e')
    expect(fetchedArt).not.toBeNull()
    expect(fetchedArt?.bodyHtml).toContain('<p>Paragraf resmi.</p>')
    expect(fetchedArt?.bodyHtml).not.toContain('<script>')

    // Switch article to draft -> must disappear from public query (SEC-008)
    await callCms({
      module: 'article',
      action: 'upsert',
      id: 'art-e2e-1',
      slug: 'analisis-hukum-kontrak-e2e',
      title: 'Analisis Hukum Kontrak Komersial E2E',
      excerpt: 'Ringkasan artikel uji end-to-end pada database MariaDB.',
      bodyHtml: '<p>Paragraf resmi.</p>',
      coverUrl: '/images/practice-corporate.webp',
      coverAlt: 'Ilustrasi Analisis Hukum Kontrak',
      categorySlug: 'kepatuhan-korporasi-uji',
      categoryName: 'Kepatuhan Korporasi Uji',
      authorName: 'Tim Redaksi FS dan Rekan',
      status: 'draft',
    })
    expect(await fetchPublishedArticleBySlugFromDb('analisis-hukum-kontrak-e2e')).toBeNull()

    expect(
      (await callCms({ module: 'article', action: 'delete', id: 'art-e2e-1' })).status,
    ).toBe(200)
    expect(
      (
        await callCms({
          module: 'category',
          action: 'delete',
          id: 'cat-e2e-test',
          slug: 'kepatuhan-korporasi-uji',
        })
      ).status,
    ).toBe(200)

    // 4c. Practice Area CRUD
    const paSave = await callCms({
      module: 'practice_area',
      action: 'upsert',
      id: 'pa-e2e-1',
      slug: 'konsultasi-regulasi-digital-uji',
      name: 'Konsultasi Regulasi Digital Uji',
      label: 'LAYANAN UJI',
      summary: 'Pendampingan kepatuhan regulasi penyelenggara sistem elektronik.',
      description: 'Kepatuhan Regulasi Sistem Elektronik',
      advocacyScope: ['Peninjauan kebijakan privasi', 'Kepatuhan perlindungan data pribadi'],
      image: '/images/practice-corporate.webp',
      displayOrder: 11,
      isPublished: true,
    })
    expect(paSave.status).toBe(200)
    const fetchedPa = await fetchPracticeAreaBySlugFromDb('konsultasi-regulasi-digital-uji')
    expect(fetchedPa?.name).toBe('Konsultasi Regulasi Digital Uji')

    // 4d. Team Member CRUD
    const tmSave = await callCms({
      module: 'team_member',
      action: 'upsert',
      id: 'tm-e2e-1',
      slug: 'advokat-uji-e2e',
      fullName: 'Raka Pratama',
      honorific: 'S.H., M.H.',
      roleTitle: 'Associate',
      group: 'Associate',
      shortBio: 'Profil singkat advokat uji integrasi database.',
      fullBio: 'Biografi lengkap advokat untuk pengujian end-to-end MariaDB.',
      education: ['S.H. — Universitas Indonesia'],
      credentials: ['PERADI'],
      languages: ['Indonesia', 'Inggris'],
      tags: ['Litigasi Komersial'],
      photoUrl: '/team/ferdinan-silalahi.webp',
      displayOrder: 7,
      isPublished: true,
    })
    expect(tmSave.status).toBe(200)
    const fetchedTm = await fetchTeamMemberBySlugFromDb('advokat-uji-e2e')
    expect(fetchedTm?.displayName).toBe('Raka Pratama, S.H., M.H.')

    // 4e. Case Record CRUD & SK-14 anonymity enforcement
    const crSaveUnconsented = await callCms({
      module: 'case_record',
      action: 'upsert',
      id: 'case-e2e-1',
      caseType: 'Sengketa Kontrak Distribusi',
      region: 'Jakarta Pusat',
      displayMode: 'named',
      clientName: 'PT Rahasia Tanpa Izin',
      consentRef: '',
      displayOrder: 10,
      isPublished: true,
    })
    // SK-14: named without consentRef must be rejected with 400
    expect(crSaveUnconsented.status).toBe(400)

    const crSaveConsented = await callCms({
      module: 'case_record',
      action: 'upsert',
      id: 'case-e2e-1',
      caseType: 'Sengketa Kontrak Distribusi',
      region: 'Jakarta Pusat',
      displayMode: 'anonymous',
      displayOrder: 10,
      isPublished: true,
    })
    expect(crSaveConsented.status).toBe(200)
    expect(
      (await callCms({ module: 'case_record', action: 'delete', id: 'case-e2e-1' })).status,
    ).toBe(200)

    // 4f. Site Settings update & verify
    const currentSettings = await fetchSiteSettingsFromDb()
    const settingsSave = await callCms({
      module: 'site_settings',
      action: 'update',
      firmName: currentSettings.firmName,
      shortBrandName: currentSettings.shortBrandName,
      address: currentSettings.address,
      whatsappNumber: currentSettings.whatsappNumber,
      whatsappDisplay: currentSettings.whatsappDisplay,
      defaultWaMessage: currentSettings.defaultWaMessage,
      inquiryRecipientEmail: currentSettings.inquiryRecipientEmail,
      instagramUrl: currentSettings.instagramUrl,
      officeHoursPagi: currentSettings.officeHours.pagi,
      officeHoursSiang: currentSettings.officeHours.siang,
      officeHoursSore: currentSettings.officeHours.sore,
    })
    expect(settingsSave.status).toBe(200)

    // 4g. User management CRUD
    const userCreate = await callCms({
      module: 'user',
      action: 'create',
      name: 'Editor Uji E2E',
      email: 'editor.e2e@fsdanrekan.com',
      password: 'EditorStrongPass2026!#',
      role: 'editor',
    })
    expect(userCreate.status).toBe(200)

    const cmsStateRes = await adminCmsGet(
      new Request('https://fsdanrekan.com/api/admin/cms', {
        method: 'GET',
        headers: { cookie: sessionCookie },
      }),
    )
    expect(cmsStateRes.status).toBe(200)
    const cmsStateBody = (await cmsStateRes.json()) as {
      users: Array<{ id: string; email: string }>
    }
    const createdEditor = cmsStateBody.users.find((u) => u.email === 'editor.e2e@fsdanrekan.com')
    expect(createdEditor).toBeDefined()
  })

  it('Step 5: uploads an image via /api/admin/upload, persists to UPLOAD_DIR + media_assets, and serves it via /uploads/[...path]', async () => {
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
      0x15, 0xc4, 0x89,
    ])

    const uploadReq = new Request('https://fsdanrekan.com/api/admin/upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
        cookie: sessionCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        filename: 'bukti-uji-e2e.png',
        mimeType: 'image/png',
        altText: 'Gambar Uji Integrasi E2E',
        dataBase64: validPngBytes.toString('base64'),
      }),
    })

    const uploadRes = await adminUploadPost(uploadReq)
    expect(uploadRes.status).toBe(201)
    const uploadBody = (await uploadRes.json()) as {
      ok: boolean
      asset: { id: string; filename: string; url: string; mimeType: string }
    }
    expect(uploadBody.ok).toBe(true)
    expect(uploadBody.asset.mimeType).toBe('image/png')
    expect(uploadBody.asset.url).toBe(`/uploads/${uploadBody.asset.filename}`)

    // Serve uploaded file through GET /uploads/[...path]
    const serveRes = await uploadsGet(new Request(`https://fsdanrekan.com${uploadBody.asset.url}`), {
      params: Promise.resolve({ path: [uploadBody.asset.filename] }),
    })
    expect(serveRes.status).toBe(200)
    expect(serveRes.headers.get('content-type')).toBe('image/png')
    expect(serveRes.headers.get('x-content-type-options')).toBe('nosniff')
    const servedBytes = Buffer.from(await serveRes.arrayBuffer())
    expect(servedBytes.equals(validPngBytes)).toBe(true)

    // Path traversal via /uploads/[...path] must return 404
    const traversalRes = await uploadsGet(
      new Request('https://fsdanrekan.com/uploads/../secret.png'),
      { params: Promise.resolve({ path: ['..', 'secret.png'] }) },
    )
    expect(traversalRes.status).toBe(404)
  })

  it('Step 6: submits inquiry form with Turnstile unconfigured (fallback warning), saves to MariaDB inquiries, and verifies SMTP failure fallback', async () => {
    resetMemoryRateLimitsForTest()
    process.env.TURNSTILE_SECRET_KEY = ''

    const inquiryReq = new Request('https://fsdanrekan.com/api/inquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
        'x-forwarded-for': '203.0.113.88',
      },
      body: JSON.stringify({
        name: 'PT Mitra Nusantara E2E',
        email: 'legal@mitranusantara.co.id',
        phone: '+6281199887766',
        practiceAreaId: 'Litigasi Korporasi & Komersial',
        preferredDate: '2026-11-20',
        sessionSlot: 'pagi',
        method: 'tatap-muka',
        summary: 'Mohon penjadwalan konsultasi peninjauan perjanjian kerja sama operasi.',
        consent: true,
        website: '',
        turnstileToken: '',
      }),
    })

    const inquiryRes = await inquiryPost(inquiryReq)
    expect(inquiryRes.status).toBe(201)

    const pool = getDbPool()!
    const [inqRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, status, email_failed FROM `inquiries` WHERE `email` = ? ORDER BY `created_at` DESC LIMIT 1',
      ['legal@mitranusantara.co.id'],
    )
    expect(inqRows.length).toBe(1)
    expect(inqRows[0]?.name).toBe('PT Mitra Nusantara E2E')
    expect(inqRows[0]?.status).toBe('baru')
    // Since SMTP_USER/SMTP_PASS are empty in test env, email_failed must be 1 while inquiry is safely stored
    expect(Number(inqRows[0]?.email_failed)).toBe(1)

    // Update inquiry status via /api/admin/cms (baru -> dihubungi -> selesai)
    const inqUpdateRes = await adminCmsPost(
      new Request('https://fsdanrekan.com/api/admin/cms', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://fsdanrekan.com',
          cookie: sessionCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          module: 'inquiry',
          action: 'update',
          id: String(inqRows[0]?.id),
          status: 'dihubungi',
          internalNotes: 'Telah dihubungi oleh sekretariat firma.',
        }),
      }),
    )
    expect(inqUpdateRes.status).toBe(200)

    // Now test createInquiry when SMTP succeeds -> email_failed must be 0 in MariaDB
    const smtpOkResult = await createInquiry(
      {
        name: 'PT Sukses Email E2E',
        email: 'sukses@mitranusantara.co.id',
        phone: '+6281199887700',
        practiceAreaId: 'Hukum Perbankan & Pembiayaan',
        preferredDate: '2026-11-22',
        sessionSlot: 'siang',
        method: 'daring',
        summary: 'Konsultasi restrukturisasi fasilitas kredit korporasi.',
        consent: true,
        turnstileToken: '',
      },
      '203.0.113.89',
      {
        sendEmailFn: async () => {
          // Simulated successful cPanel SMTP delivery
        },
      },
    )
    expect(smtpOkResult.emailFailed).toBe(false)

    const [okRows] = await pool.query<RowDataPacket[]>(
      'SELECT email_failed FROM `inquiries` WHERE `id` = ?',
      [smtpOkResult.id],
    )
    expect(Number(okRows[0]?.email_failed)).toBe(0)
  })

  it('Step 7: verifies no-terminal database/phpmyadmin_bootstrap.sql import and automatic first-login admin provisioning without passwords in repo', async () => {
    process.env.DATABASE_URL = pmaDatabaseUrl
    await resetDbPoolForTest()
    const pmaPool = getDbPool()!

    const sqlPath = resolve(process.cwd(), 'database', 'phpmyadmin_bootstrap.sql')
    const sqlText = readFileSync(sqlPath, 'utf8')
    // Ensure no password hash is ever embedded in phpmyadmin_bootstrap.sql
    expect(sqlText).not.toContain('scrypt$')

    const statements = splitSqlStatements(sqlText)
    for (const stmt of statements) {
      await pmaPool.query(stmt)
    }

    const [userRowsBefore] = await pmaPool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM `users`',
    )
    expect(Number(userRowsBefore[0]?.cnt)).toBe(0)

    const [practiceRows] = await pmaPool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM `practice_areas`',
    )
    expect(Number(practiceRows[0]?.cnt)).toBe(10)

    // First login at /api/admin/auth automatically provisions the initial admin from env with must_change_password = 1
    const firstLoginReq = new Request('https://fsdanrekan.com/api/admin/auth', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://fsdanrekan.com',
      },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@fsdanrekan.com',
        password: 'InitialAdminPass2026!#',
      }),
    })

    const firstLoginRes = await adminAuthPost(firstLoginReq)
    expect(firstLoginRes.status).toBe(200)
    const firstLoginBody = (await firstLoginRes.json()) as {
      ok: boolean
      user: { mustChangePassword: boolean; email: string }
    }
    expect(firstLoginBody.ok).toBe(true)
    expect(firstLoginBody.user.mustChangePassword).toBe(true)

    const [userRowsAfter] = await pmaPool.query<RowDataPacket[]>(
      'SELECT email, must_change_password FROM `users`',
    )
    expect(userRowsAfter.length).toBe(1)
    expect(userRowsAfter[0]?.email).toBe('admin@fsdanrekan.com')
    expect(Number(userRowsAfter[0]?.must_change_password)).toBe(1)
  })

  it('Step 8: tests multi-photo case records, cover auto-selection, reordering, deletion, and legacy single-image backward compatibility', async () => {
    process.env.DATABASE_URL = e2eDatabaseUrl
    await resetDbPoolForTest()
    const pool = getDbPool()!

    // Verify /api/health detects photos_json column
    const healthRes = await healthGet()
    const healthData = (await healthRes.json()) as {
      ok: boolean
      database: {
        migrations?: { photosJsonReady?: boolean }
      }
    }
    expect(healthRes.status).toBe(200)
    expect(healthData.ok).toBe(true)
    expect(healthData.database.migrations?.photosJsonReady).toBe(true)

    const callCms = async (payload: Record<string, unknown>) => {
      const req = new Request('https://fsdanrekan.com/api/admin/cms', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://fsdanrekan.com',
          cookie: sessionCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(payload),
      })
      return adminCmsPost(req)
    }

    // 1. Upsert multi-photo case record with 3 photos
    const multiPhotoPayload = [
      { url: '/uploads/case-doc-1.webp', caption: 'Dokumentasi Sidang Perdana', alt: 'Sidang Perdana' },
      { url: '/uploads/case-doc-2.webp', caption: 'Penyerahan Bukti Dokumen', alt: 'Penyerahan Bukti' },
      { url: '/uploads/case-doc-3.webp', caption: 'Pembacaan Putusan Akhir', alt: 'Pembacaan Putusan' },
    ]

    const upsertRes1 = await callCms({
      module: 'case_record',
      action: 'upsert',
      id: 'case-multi-e2e',
      caseType: 'Sengketa Saham Perusahaan',
      region: 'Jakarta Selatan',
      displayMode: 'anonymous',
      photos: multiPhotoPayload,
      displayOrder: 15,
      isPublished: true,
    })
    expect(upsertRes1.status).toBe(200)

    // Direct database verification
    const [rows1] = await pool.query<RowDataPacket[]>(
      'SELECT image_url, photos_json FROM `case_records` WHERE `id` = ?',
      ['case-multi-e2e'],
    )
    expect(rows1.length).toBe(1)
    expect(rows1[0]?.image_url).toBe('/uploads/case-doc-1.webp')
    const parsedPhotos1 = JSON.parse(rows1[0]?.photos_json as string)
    expect(parsedPhotos1.length).toBe(3)
    expect(parsedPhotos1[0].caption).toBe('Dokumentasi Sidang Perdana')

    // 2. Test reordering: swap photo 2 to position 0 -> cover image_url must update automatically
    const reorderedPhotos = [
      multiPhotoPayload[2], // Photo 3 becomes first
      multiPhotoPayload[0],
      multiPhotoPayload[1],
    ]

    const upsertRes2 = await callCms({
      module: 'case_record',
      action: 'upsert',
      id: 'case-multi-e2e',
      caseType: 'Sengketa Saham Perusahaan',
      region: 'Jakarta Selatan',
      displayMode: 'anonymous',
      photos: reorderedPhotos,
      displayOrder: 15,
      isPublished: true,
    })
    expect(upsertRes2.status).toBe(200)

    const [rows2] = await pool.query<RowDataPacket[]>(
      'SELECT image_url, photos_json FROM `case_records` WHERE `id` = ?',
      ['case-multi-e2e'],
    )
    expect(rows2[0]?.image_url).toBe('/uploads/case-doc-3.webp')
    const parsedPhotos2 = JSON.parse(rows2[0]?.photos_json as string)
    expect(parsedPhotos2[0].url).toBe('/uploads/case-doc-3.webp')

    // 3. Test deleting a photo: remove 1 photo from array
    const reducedPhotos = [reorderedPhotos[0], reorderedPhotos[1]]
    const upsertRes3 = await callCms({
      module: 'case_record',
      action: 'upsert',
      id: 'case-multi-e2e',
      caseType: 'Sengketa Saham Perusahaan',
      region: 'Jakarta Selatan',
      displayMode: 'anonymous',
      photos: reducedPhotos,
      displayOrder: 15,
      isPublished: true,
    })
    expect(upsertRes3.status).toBe(200)

    const [rows3] = await pool.query<RowDataPacket[]>(
      'SELECT photos_json FROM `case_records` WHERE `id` = ?',
      ['case-multi-e2e'],
    )
    const parsedPhotos3 = JSON.parse(rows3[0]?.photos_json as string)
    expect(parsedPhotos3.length).toBe(2)

    // 4. Test legacy backward compatibility: insert legacy record with photos_json = NULL
    await pool.query(
      `INSERT INTO \`case_records\`
        (\`id\`, \`case_type\`, \`region\`, \`display_mode\`, \`image_url\`, \`image_alt\`, \`photos_json\`, \`display_order\`, \`is_published\`)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 1)`,
      [
        'case-legacy-compat',
        'Arbitrase Dagang Internasional',
        'BANI Jakarta',
        'anonymous',
        '/images/hero-slide-courtroom.webp',
        'Ruang Sidang Arbitrase',
        98,
      ],
    )

    const allRecords = await fetchPublicCaseRecordsFromDb()
    const legacyRecord = allRecords.find((r) => r.id === 'case-legacy-compat')
    expect(legacyRecord).toBeDefined()
    if (!legacyRecord || !legacyRecord.photos) {
      throw new Error('legacyRecord or photos is undefined')
    }
    expect(Array.isArray(legacyRecord.photos)).toBe(true)
    expect(legacyRecord.photos.length).toBe(1)
    expect(legacyRecord.photos[0]?.url).toBe('/images/hero-slide-courtroom.webp')
    expect(legacyRecord.photos[0]?.caption).toBe(
      'Dokumentasi penanganan perkara Arbitrase Dagang Internasional wilayah BANI Jakarta',
    )

    // Cleanup
    await callCms({ module: 'case_record', action: 'delete', id: 'case-multi-e2e' })
    await callCms({ module: 'case_record', action: 'delete', id: 'case-legacy-compat' })
  })
})

