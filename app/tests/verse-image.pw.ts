import { expect, test, type Page } from '@playwright/test'

test.describe('verse image modal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  async function navigateToChapter(page: Page) {
    await page.goto('/browse')
    await page.locator('.welcome-cta').click({ force: true }).catch(() => {})
    await expect(page.locator('.book-list')).toBeVisible({ timeout: 5000 })

    await page.locator('.book-item', { hasText: /^Gênesis$/ }).click()
    await expect(page.locator('.chapter-grid')).toBeVisible({ timeout: 5000 })

    await page.locator('.chapter-item', { hasText: /^1$/ }).click()

    // wait for loading spinner to disappear (IndexedDB seeding can be slow)
    await page.locator('.loading').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})

    // wait for verse rows to appear
    await expect(page.locator('.verse-row').first()).toBeVisible({ timeout: 30000 })
  }

  test('shows "Imagem" button when verses are selected', async ({ page }) => {
    await navigateToChapter(page)
    await page.locator('.verse-row').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.selection-bar')).toBeVisible()
    await expect(page.locator('.selection-bar button', { hasText: 'Imagem' })).toBeVisible()
  })

  test('opens verse image modal', async ({ page }) => {
    await navigateToChapter(page)
    await page.locator('.verse-row').first().click()
    await page.waitForTimeout(500)
    await page.locator('.selection-bar button', { hasText: 'Imagem' }).click()
    await expect(page.locator('.verse-image-modal')).toBeVisible({ timeout: 5000 })
  })

  test('modal contains a canvas element', async ({ page }) => {
    await navigateToChapter(page)
    await page.locator('.verse-row').first().click()
    await page.waitForTimeout(500)
    await page.locator('.selection-bar button', { hasText: 'Imagem' }).click()
    await expect(page.locator('.verse-image-modal')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.verse-image-modal canvas')).toBeAttached()
  })

  test('modal closes on close button', async ({ page }) => {
    await navigateToChapter(page)
    await page.locator('.verse-row').first().click()
    await page.waitForTimeout(500)
    await page.locator('.selection-bar button', { hasText: 'Imagem' }).click()
    await expect(page.locator('.verse-image-modal')).toBeVisible({ timeout: 5000 })
    await page.locator('.verse-image-modal .modal-close').click()
    await expect(page.locator('.verse-image-modal')).not.toBeVisible()
  })
})
