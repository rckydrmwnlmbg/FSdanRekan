import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cleanHtml, escapeHtml } from '../src/lib/security/sanitize'
import { verifyConstantTimeToken, verifyMetaSignature } from '../src/lib/security/signature'
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from '../src/lib/security/password'
import {
  limitByIp,
  limitLogin,
  resetMemoryRateLimitsForTest,
} from '../src/lib/security/ratelimit'
import { splitSqlStatements } from '../src/lib/db'
import {
  authenticateAdminUser,
  changeAdminUserPassword,
  resetAdminAuthMemoryForTest,
  verifyAdminCsrf,
} from '../src/lib/admin-auth'
import {
  detectImageMimeFromBytes,
  resolveSafeUploadFilePath,
} from '../src/lib/uploads'
import { InquiryBodySchema } from '../src/lib/validation/inquiry'
import { GuidedChatSchema } from '../src/lib/validation/chat'
import { isValidIndonesianWaNumber, waLink } from '../src/lib/whatsapp'
import {
  getPublishedArticleBySlug,
  getPublishedArticles,
  serializePublicCaseRecord,
} from '../src/lib/content'

describe('Security & Validation Unit Suite (SEC-004, SEC-005, SEC-006, SEC-008, SEC-011, SK-04, SK-05, SK-14)', () => {
  it('SEC-004: sanitizes XSS payloads in article HTML', () => {
    const dirty =
      '<p>Halo</p><script>alert(1)</script><img src="https://example.com/a.webp" onerror="fetch(\'https://evil.example\')" alt="Test"><a href="javascript:alert(1)">Klik</a>'
    const cleaned = cleanHtml(dirty)
    expect(cleaned).not.toContain('<script>')
    expect(cleaned).not.toContain('onerror')
    expect(cleaned).not.toContain('javascript:')
    expect(cleaned).toContain('<p>Halo</p>')
  })

  it('SEC-004: escapes HTML entities in plain text email fields', () => {
    expect(escapeHtml('<script>"test" & \'single\'</script>')).toBe(
      '&lt;script&gt;&quot;test&quot; &amp; &#39;single&#39;&lt;/script&gt;',
    )
  })

  it('SEC-005 & SEC-006: validates inquiry body strictly and rejects missing consent or extra fields', () => {
    const validPayload = {
      name: 'Budi Santoso',
      email: 'budi@perusahaan.co.id',
      phone: '+6281234567890',
      practiceAreaId: 'Litigasi Korporasi & Komersial',
      preferredDate: '2026-11-15',
      sessionSlot: 'pagi' as const,
      method: 'tatap-muka' as const,
      summary: 'Ingin menjadwalkan konsultasi terkait peninjauan kontrak kerja sama komersial.',
      consent: true as const,
      turnstileToken: 'valid-turnstile-token',
    }
    expect(InquiryBodySchema.safeParse(validPayload).success).toBe(true)

    // Missing consent -> fails
    expect(
      InquiryBodySchema.safeParse({ ...validPayload, consent: false }).success,
    ).toBe(false)

    // Unknown extra field -> fails (.strict())
    expect(
      InquiryBodySchema.safeParse({ ...validPayload, role: 'admin' }).success,
    ).toBe(false)

    // Non-empty honeypot -> fails
    expect(
      InquiryBodySchema.safeParse({ ...validPayload, website: 'http://spam.example' }).success,
    ).toBe(false)
  })

  it('SK-05: builds valid wa.me links and validates Indonesian E.164 phone numbers', () => {
    const link = waLink('+62 811-830-991', 'Halo FS dan Rekan, saya ingin konsultasi hukum.')
    expect(link).toBe(
      'https://wa.me/62811830991?text=Halo%20FS%20dan%20Rekan%2C%20saya%20ingin%20konsultasi%20hukum.',
    )
    expect(isValidIndonesianWaNumber('62811830991')).toBe(true)
    expect(isValidIndonesianWaNumber('0811830991')).toBe(false)
  })

  it('SEC-011: verifies Meta HMAC-SHA256 webhook signature with constant-time comparison', () => {
    const secret = 'test_meta_app_secret'
    const rawBody = '{"object":"whatsapp_business_account","entry":[]}'
    const validHmac =
      'sha256=' + crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

    expect(verifyMetaSignature(rawBody, validHmac, secret)).toBe(true)
    expect(verifyMetaSignature(rawBody, 'sha256=deadbeef', secret)).toBe(false)
    expect(verifyMetaSignature(rawBody, null, secret)).toBe(false)
    expect(verifyConstantTimeToken('secret-123', 'secret-123')).toBe(true)
    expect(verifyConstantTimeToken('secret-123', 'wrong-123')).toBe(false)
  })

  it('SEC-008 & FR-5.3: never exposes draft articles in public article queries', () => {
    const published = getPublishedArticles()
    expect(published.every((a) => a.status === 'published')).toBe(true)
    expect(getPublishedArticleBySlug('draf-internal-belum-terbit')).toBeNull()
  })

  it('SK-14: strips clientName from public CaseRecord unless displayMode is named AND consentRef is present', () => {
    const unconsented = serializePublicCaseRecord({
      id: 'case-1',
      caseType: 'Tindak Pidana Korupsi',
      region: 'Semarang, Jawa Tengah',
      displayMode: 'named',
      clientName: 'PT Rahasia Internal',
      consentRef: null,
      displayOrder: 1,
      isPublished: true,
    })
    expect(unconsented.displayMode).toBe('anonymous')
    expect(unconsented.clientName).toBeUndefined()
  })

  it('SK-11 & SEC-005: strictly validates GuidedChatSchema and rejects missing consent or extra keys', () => {
    const validChat = {
      visitorName: 'Budi Santoso',
      visitorPhone: '+6281234567890',
      practiceArea: 'Hukum Korporasi & Bisnis',
      preferredSchedule: 'Senin, 10.00 WIB',
      notes: 'Konsultasi draf perjanjian komersial.',
      consent: true,
    }
    expect(GuidedChatSchema.safeParse(validChat).success).toBe(true)

    // Missing consent -> fails
    expect(GuidedChatSchema.safeParse({ ...validChat, consent: false }).success).toBe(false)

    // Short name -> fails
    expect(GuidedChatSchema.safeParse({ ...validChat, visitorName: 'A' }).success).toBe(false)

    // Invalid phone -> fails
    expect(GuidedChatSchema.safeParse({ ...validChat, visitorPhone: '123' }).success).toBe(false)

    // Extra unknown field -> fails (.strict())
    expect(GuidedChatSchema.safeParse({ ...validChat, isAdmin: true }).success).toBe(false)
  })

  it('SEC-001: hashes and verifies passwords with native Node scrypt and enforces 12-char policy', () => {
    const strongPass = 'AdminFSdanRekan2026!#'
    expect(validatePasswordStrength(strongPass).valid).toBe(true)
    expect(validatePasswordStrength('short123').valid).toBe(false)
    expect(validatePasswordStrength('alllowercase12345').valid).toBe(false)

    const hashed = hashPassword(strongPass)
    expect(hashed.startsWith('scrypt$16384$8$1$')).toBe(true)
    expect(verifyPassword(strongPass, hashed)).toBe(true)
    expect(verifyPassword('WrongPassword2026!#', hashed)).toBe(false)
    expect(verifyPassword(strongPass, 'invalid$hash')).toBe(false)
  })

  it('SEC-007: enforces inquiry (5/10m) and login (10/15m) rate limits', async () => {
    resetMemoryRateLimitsForTest()
    const testIp = '203.0.113.55'
    for (let i = 1; i <= 5; i++) {
      expect(await limitByIp(testIp)).toBe(true)
    }
    expect(await limitByIp(testIp)).toBe(false)

    for (let i = 1; i <= 10; i++) {
      expect(await limitLogin(testIp, 'admin@fsdanrekan.com')).toBe(true)
    }
    expect(await limitLogin(testIp, 'admin@fsdanrekan.com')).toBe(false)
  })

  it('Database Schema: database/schema.sql contains all required MySQL/MariaDB tables', () => {
    const schemaText = readFileSync(join(process.cwd(), 'database', 'schema.sql'), 'utf8')
    const stmts = splitSqlStatements(schemaText)
    expect(stmts.length).toBeGreaterThanOrEqual(14)
    const requiredTables = [
      'CREATE TABLE IF NOT EXISTS `users`',
      'CREATE TABLE IF NOT EXISTS `sessions`',
      'CREATE TABLE IF NOT EXISTS `categories`',
      'CREATE TABLE IF NOT EXISTS `articles`',
      'CREATE TABLE IF NOT EXISTS `practice_areas`',
      'CREATE TABLE IF NOT EXISTS `team_members`',
      'CREATE TABLE IF NOT EXISTS `case_records`',
      'CREATE TABLE IF NOT EXISTS `inquiries`',
      'CREATE TABLE IF NOT EXISTS `site_settings`',
      'CREATE TABLE IF NOT EXISTS `media_assets`',
      'CREATE TABLE IF NOT EXISTS `audit_logs`',
      'CREATE TABLE IF NOT EXISTS `rate_limits`',
    ]
    for (const tableClause of requiredTables) {
      expect(schemaText).toContain(tableClause)
    }
  })

  it('SEC-013: validates image magic bytes, blocks SVG/polyglot scripts, and prevents path traversal in /uploads', () => {
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ])
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ])
    const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

    expect(detectImageMimeFromBytes(validPng)).toBe('image/png')
    expect(detectImageMimeFromBytes(validJpeg)).toBe('image/jpeg')
    expect(detectImageMimeFromBytes(svgPayload)).toBeNull()

    expect(resolveSafeUploadFilePath(['media-123.webp'])?.filename).toBe('media-123.webp')
    expect(resolveSafeUploadFilePath(['..', 'secret.txt'])).toBeNull()
    expect(resolveSafeUploadFilePath(['../secret.webp'])).toBeNull()
    expect(resolveSafeUploadFilePath(['xss.svg'])).toBeNull()
    expect(resolveSafeUploadFilePath(['shell.php.webp/../../etc'])).toBeNull()
  })

  it('SEC-001: enforces 5-attempt admin login lockout, CSRF check, and mandatory first-login password change', async () => {
    resetAdminAuthMemoryForTest()
    process.env.ADMIN_INITIAL_EMAIL = 'admin@fsdanrekan.com'
    process.env.ADMIN_INITIAL_PASSWORD = 'InitialSecurePass2026!#'

    // 4 failed attempts -> 401
    for (let i = 1; i <= 4; i++) {
      const bad = await authenticateAdminUser({
        email: 'admin@fsdanrekan.com',
        password: 'WrongPassword123!',
        ip: '198.51.100.10',
      })
      expect(bad.ok).toBe(false)
      if (!bad.ok) expect(bad.status).toBe(401)
    }

    // 5th failed attempt -> 423 Locked
    const fifth = await authenticateAdminUser({
      email: 'admin@fsdanrekan.com',
      password: 'WrongPassword123!',
      ip: '198.51.100.10',
    })
    expect(fifth.ok).toBe(false)
    if (!fifth.ok) expect(fifth.status).toBe(423)

    // Reset memory store and verify successful login with mustChangePassword=true
    resetAdminAuthMemoryForTest()
    const good = await authenticateAdminUser({
      email: 'admin@fsdanrekan.com',
      password: 'InitialSecurePass2026!#',
      ip: '198.51.100.11',
    })
    expect(good.ok).toBe(true)
    if (good.ok) {
      expect(good.user.mustChangePassword).toBe(true)
      const validReq = new Request('https://fsdanrekan.com/api/admin/cms', {
        headers: { 'x-csrf-token': good.user.csrfToken },
      })
      const invalidReq = new Request('https://fsdanrekan.com/api/admin/cms', {
        headers: { 'x-csrf-token': 'wrong-token' },
      })
      expect(verifyAdminCsrf(validReq, good.user)).toBe(true)
      expect(verifyAdminCsrf(invalidReq, good.user)).toBe(false)

      const changed = await changeAdminUserPassword({
        userId: good.user.id,
        email: good.user.email,
        currentPassword: 'InitialSecurePass2026!#',
        newPassword: 'UpdatedSecurePass2026!#',
      })
      expect(changed.ok).toBe(true)
    }
  })
})
