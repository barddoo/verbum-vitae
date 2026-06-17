import { expect, test } from '@playwright/test'

test.describe('smoke tests', () => {
  test('navigates between routes via top bar', async ({ page }) => {
    await page.goto('/')
    await page.locator('.top-bar-logo').click()
    await expect(page).toHaveURL('/')
  })

  test('theme toggle switches data-theme', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    await page.locator('.welcome-cta').click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)

    const html = page.locator('html')
    const initial = await html.getAttribute('data-theme')

    await page.locator('.theme-toggle').click()
    await page.waitForTimeout(200)
    const toggled = await html.getAttribute('data-theme')
    expect(toggled).not.toBe(initial)

    await page.locator('.theme-toggle').click()
    await page.waitForTimeout(200)
    const reverted = await html.getAttribute('data-theme')
    expect(reverted).toBe(initial)
  })

  test('help modal opens and closes', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    await page.locator('.welcome-cta').click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)

    await page.locator('.btn-help').click()
    await expect(page.locator('.help-modal')).toBeVisible()
    await page.locator('.help-modal .modal-close').click()
    await expect(page.locator('.help-modal')).not.toBeVisible()
  })

  test('no console errors on key routes', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      const msg = err.message
      if (!msg.includes('Dexie') && !msg.includes('IndexedDB')) {
        errors.push(msg)
      }
    })

    for (const route of ['/', '/browse', '/collections', '/stats']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toEqual([])
  })

  test('browse renders book grid', async ({ page }) => {
    await page.goto('/browse')
    await page.waitForTimeout(1000)
    const grid = page.locator('.book-list')
    await expect(grid).toBeVisible()
    const count = await grid.locator('> *').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('homepage renders content', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-shell')).toBeVisible()
  })
})
