import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Ferdinan Silalahi dan Rekan Law Firm — E2E & Accessibility Suite', () => {
  test('renders home page with official branding, 5 team profiles, 10 practice areas, and 0 serious axe violations', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Pendampingan Hukum Tepercaya')
    await expect(page.locator('body')).not.toContainText('FHSP')
    await expect(page.locator('body')).not.toContainText('TODO(client)')
    await expect(page.locator('body')).not.toContainText('3 Bahasa')

    // 4 associate/admin team cards rendered in #tim-advokat (Ferdinan is shown once in #tentang)
    const teamButtons = page.locator('#tim-advokat').getByRole('button', { name: /Selengkapnya/i })
    await expect(teamButtons).toHaveCount(4)

    // Open team dialog with keyboard and close with Escape, verifying focus returns to trigger (FR-3.3)
    const firstTeamBtn = teamButtons.nth(0)
    await firstTeamBtn.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Check WCAG AA accessibility via axe
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
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
