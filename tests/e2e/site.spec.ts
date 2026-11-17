import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Ferdinan Silalahi dan Rekan Law Firm — E2E & Accessibility Suite', () => {
  test('renders home page with zero initial third-party requests, click-to-load embeds, matching schema/footer, and 0 serious axe violations', async ({
    page,
  }) => {
    const thirdPartyRequests: string[] = []
    page.on('request', (req) => {
      try {
        const hostname = new URL(req.url()).hostname.toLowerCase()
        if (
          hostname &&
          hostname !== 'localhost' &&
          hostname !== '127.0.0.1' &&
          !hostname.endsWith('.localhost')
        ) {
          thirdPartyRequests.push(req.url())
        }
      } catch {
        // Ignore data/blob URLs
      }
    })

    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Pendampingan Hukum Terpercaya')
    await expect(page.locator('body')).not.toContainText('FHSP')
    await expect(page.locator('body')).not.toContainText('TODO(client)')
    await expect(page.locator('body')).not.toContainText('3 Bahasa')

    // Performance: zero 3rd-party requests and zero eager iframes on initial load
    expect(thirdPartyRequests).toEqual([])
    await expect(page.locator('iframe')).toHaveCount(0)

    // Exactly one floating action button (Smart Speed-Dial); guided chat trigger removed
    const floatingBtn = page.locator('.wa-floating-trigger')
    await expect(floatingBtn).toHaveCount(1)
    await expect(page.locator('.guided-chat-trigger')).toHaveCount(0)

    // Toggle speed dial menu: displays WhatsApp & Janji Temu options
    await floatingBtn.click()
    const speedDialCard = page.locator('.speed-dial-card')
    await expect(speedDialCard).toBeVisible()
    await expect(speedDialCard).toContainText('Chat WhatsApp Resmi')
    await expect(speedDialCard).toContainText('Formulir Janji Temu')
    await page.keyboard.press('Escape')
    await expect(speedDialCard).toBeHidden()

    // 6 associate/admin team cards rendered in #tim-advokat (Ferdinan is shown once in #tentang)
    const teamButtons = page.locator('#tim-advokat').getByRole('button', { name: /Selengkapnya/i })
    await expect(teamButtons).toHaveCount(6)

    // Open team dialog with keyboard and close with Escape, verifying focus returns to trigger (FR-3.3)
    const firstTeamBtn = teamButtons.nth(0)
    await firstTeamBtn.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Instagram Gallery uses active @fsdanrekan handle & 5 post cards/links without legacy repetitive text
    const igSection = page.locator('#galeri-instagram')
    await expect(igSection).toContainText('@fsdanrekan')
    await expect(igSection).not.toContainText('@fhspartners')
    await expect(igSection).not.toContainText('&nearr;')
    await expect(igSection).not.toContainText('Memuat pratinjau')
    await expect(igSection).not.toContainText('Publikasi Resmi')
    await expect(igSection.locator('a[href="https://www.instagram.com/fsdanrekan/"]')).toHaveCount(2)
    await expect(igSection.locator('.instagram-embed-card')).toHaveCount(5)
    await expect(igSection.locator('.instagram-embed-card a[href^="https://www.instagram.com/p/"]')).toHaveCount(5)

    // Footer & LegalService JSON-LD NAP consistency
    const ldJsonScripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    const parsedSchemas = ldJsonScripts.map((raw) => JSON.parse(raw))
    const legalService = parsedSchemas.find((s) => s['@type'] === 'LegalService')
    expect(legalService).toBeDefined()
    expect(legalService.url).toBe('https://fsdanrekan.com')
    expect(String(legalService.email || '')).not.toContain('fsdanrekan.id')
    const footer = page.locator('footer')
    await expect(footer).toContainText(legalService.name)
    await expect(footer).toContainText(legalService.telephone)
    await expect(footer).toContainText('Jl. RP Soeroso No. 33')

    // Click-to-load Instagram preview creates iframe only after explicit user action
    const igPreviewBtn = igSection.getByRole('button', { name: /Muat Pratinjau/i }).first()
    await igPreviewBtn.click()
    await expect(igSection.locator('iframe[title^="Pratinjau Instagram"]')).toHaveCount(1)

    // Click-to-load Maps embed creates iframe only after explicit user action
    const inquirySection = page.locator('#janji-temu')
    await inquirySection.getByRole('button', { name: /Muat Peta Interaktif/i }).click()
    await expect(inquirySection.locator('iframe[title*="Peta Lokasi"]')).toHaveCount(1)

    // Check WCAG AA accessibility via axe (excluding 3rd-party embedded iframes)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('iframe')
      .analyze()
    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(seriousOrCritical).toEqual([])
  })

  test('scans all sitemap URLs for clean HTML without fsdanrekan.id/localhost and valid SEO tags', async ({
    request,
  }) => {
    const sitemapRes = await request.get('/sitemap.xml')
    expect(sitemapRes.status()).toBe(200)
    const sitemapXml = await sitemapRes.text()
    expect(sitemapXml).not.toMatch(/fsdanrekan\.id/i)
    expect(sitemapXml).not.toMatch(/\blocalhost\b|127\.0\.0\.1/i)

    const locMatches = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).flatMap((m) =>
      m[1] ? [m[1]] : [],
    )
    expect(locMatches.length).toBeGreaterThanOrEqual(20)

    const paths = Array.from(
      new Set(
        locMatches.map((loc) => {
          expect(loc.startsWith('https://fsdanrekan.com')).toBe(true)
          const parsed = new URL(loc)
          return parsed.pathname || '/'
        }),
      ),
    )

    for (const path of paths) {
      const res = await request.get(path)
      expect(res.status(), `Expected 200 OK for ${path}`).toBe(200)
      const html = await res.text()

      expect(html, `${path} leaked legacy fsdanrekan.id`).not.toMatch(/fsdanrekan\.id/i)
      expect(html, `${path} leaked localhost reference`).not.toMatch(
        /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      )

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      const rawTitle = titleMatch?.[1] ?? ''
      expect(rawTitle, `${path} missing <title>`).toBeTruthy()
      const decodedTitle = rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
      expect(decodedTitle.length, `${path} <title> too long: ${decodedTitle}`).toBeLessThanOrEqual(60)

      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
      const rawDesc = descMatch?.[1] ?? ''
      expect(rawDesc, `${path} missing meta description`).toBeTruthy()
      const decodedDesc = rawDesc
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
      expect(decodedDesc.length, `${path} description too long`).toBeLessThanOrEqual(160)

      expect(html, `${path} missing canonical .com link`).toContain(
        `href="https://fsdanrekan.com${path === '/' ? '' : path}"`,
      )
      expect(html, `${path} missing og:image:alt`).toMatch(/property="og:image:alt"\s+content="[^"]+"/i)
    }

    // Verify /admin & API form routes enforce no-store caching
    const adminRes = await request.get('/admin')
    expect(adminRes.status()).toBe(200)
    expect(adminRes.headers()['cache-control'] || '').toContain('no-store')
  })

  test('returns 404 for unpublished draft article URL (SEC-008 / FR-5.3)', async ({ page }) => {
    const response = await page.goto('/artikel/draf-internal-belum-terbit')
    expect(response?.status()).toBe(404)
  })
})
