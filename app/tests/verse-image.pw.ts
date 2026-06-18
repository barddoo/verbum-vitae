import { expect, test, type Page } from '@playwright/test'

test.describe('verse image modal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  async function navigateToChapter(page: Page, bookName = 'Gênesis', chapterNum = '1') {
    await page.goto('/browse')
    // if welcome modal appears, dismiss it
    await page.locator('.welcome-cta').click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)

    // click the book
    await page.locator('.book-item', { hasText: bookName }).click()
    await page.waitForTimeout(500)

    // click the chapter
    await page.locator('.chapter-item', { hasText: chapterNum }).click()

    // wait for verses to load
    await page.waitForSelector('.verse-row', { timeout: 15000 })
    await page.waitForTimeout(300)
  }

  test('shows "Imagem" button when verses are selected', async ({ page }) => {
    await navigateToChapter(page)
    await page.locator('.verse-row').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.selection-bar')).toBeVisible()
    await expect(page.locator('.selection-bar button', { hasText: 'Imagem' })).toBeVisible()
  })

  test('opens verse image modal when "Imagem" is clicked', async ({ page }) => {
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
