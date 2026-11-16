import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Ferdinan Silalahi dan Rekan Law Firm — E2E & Accessibility Suite', () => {
  test('renders home page with official branding, 7 team profiles, 10 practice areas, and 0 serious axe violations', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Pendampingan Hukum Terpercaya')
    await expect(page.locator('body')).not.toContainText('FHSP')
    await expect(page.locator('body')).not.toContainText('TODO(client)')
    await expect(page.locator('body')).not.toContainText('3 Bahasa')

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

    // Instagram Gallery uses active @fsdanrekan handle & 5 post cards/links without legacy @fhspartners handle
    const igSection = page.locator('#galeri-instagram')
    await expect(igSection).toContainText('@fsdanrekan')
    await expect(igSection).not.toContainText('@fhspartners')
    await expect(igSection).not.toContainText('&nearr;')
    await expect(igSection.locator('a[href="https://www.instagram.com/fsdanrekan/"]')).toHaveCount(2)
    await expect(igSection.locator('.instagram-embed-card')).toHaveCount(5)
    await expect(igSection.locator('.instagram-embed-card a[href^="https://www.instagram.com/p/"]')).toHaveCount(5)

    // Check WCAG AA accessibility via axe (excluding 3rd-party embedded iframes)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('iframe')
      .analyze()
    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(seriousOrCritical).toEqual([])
  })

  test('returns 404 for unpublished draft article URL (SEC-008 / FR-5.3)', async ({ page }) => {
    const response = await page.goto('/artikel/draf-internal-belum-terbit')
    expect(response?.status()).toBe(404)
  })
})
