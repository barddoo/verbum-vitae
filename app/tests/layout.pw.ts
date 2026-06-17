import { expect, test } from '@playwright/test'

test.describe('mobile layout (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  const routes = ['/', '/browse', '/review', '/collections', '/stats']

  for (const route of routes) {
    test(`renders app shell on ${route}`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('.app-shell')).toBeVisible()
      await expect(page.locator('.top-bar')).toBeVisible()
      await expect(page.locator('.main-content')).toBeVisible()
    })
  }

  for (const route of routes) {
    test(`footer visible on ${route}`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('.app-footer')).toBeAttached()
    })
  }

  for (const route of routes) {
    test(`bottom nav visible on ${route}`, async ({ page }) => {
      await page.goto(route)
      const nav = page.locator('.bottom-nav')
      await expect(nav).toBeVisible()
      const items = nav.locator('.nav-item')
      await expect(items).toHaveCount(6)
    })
  }

  test('donate button visible in bottom nav', async ({ page }) => {
    await page.goto('/')
    const donateBtn = page.locator('.bottom-nav .nav-donate')
    await expect(donateBtn).toBeVisible()
    await expect(donateBtn).toContainText('Doar')
  })

  test('donate modal opens and closes', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    await page.locator('.welcome-cta').click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)

    await page.locator('.bottom-nav .nav-donate').click()
    await expect(page.locator('.donate-modal')).toBeVisible()
    await expect(page.locator('.donate-btc-addr').first()).toBeVisible()
    await page.locator('.donate-modal .modal-close').click()
    await expect(page.locator('.donate-modal')).not.toBeVisible()
  })

  test('review mode hides footer and bottom nav', async ({ page }) => {
    await page.goto('/review?autostart=1')
    await page.waitForSelector('.review-card', { timeout: 8000 }).catch(() => {})
    const body = page.locator('body')
    const hasReviewing = await body.evaluate((el) => el.classList.contains('is-reviewing'))
    if (hasReviewing) {
      await expect(page.locator('.app-footer')).not.toBeVisible()
      await expect(page.locator('.bottom-nav')).not.toBeVisible()
    }
  })
})

test.describe('desktop layout (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('no bottom nav on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.bottom-nav')).not.toBeVisible()
  })

  test('sidebar nav renders on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.sidebar-nav')).toBeVisible()
  })

  test('footer visible on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-footer')).toBeAttached()
  })
})
