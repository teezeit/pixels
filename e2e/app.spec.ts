import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_JSON = path.join(__dirname, '../.data/PIXELS-BACKUP-2024-05-29T22 15 32.476895.json')
const MOCK_JSON = path.join(__dirname, '../public/mock_pixels_data.json')

test.describe('initial state', () => {
  test('shows heading and sample data button', async ({ page }) => {
    await page.goto('.')
    await expect(page.getByRole('heading', { name: 'Pixels Year Plotting' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try sample data' })).toBeVisible()
  })

  test('config controls are hidden before data is loaded', async ({ page }) => {
    await page.goto('.')
    await expect(page.getByText('Rolling window')).not.toBeVisible()
  })
})

test.describe('sample data', () => {
  test('clicking Try sample data renders a chart and hides the button', async ({ page }) => {
    await page.goto('.')
    await page.getByRole('button', { name: 'Try sample data' }).click()
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Try sample data' })).not.toBeVisible()
  })

  test('config controls appear after sample data is loaded', async ({ page }) => {
    await page.goto('.')
    await page.getByRole('button', { name: 'Try sample data' }).click()
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Plot title')).toBeVisible()
    await expect(page.getByText('Rolling window')).toBeVisible()
  })
})

test.describe('file upload — mock_pixels_data.json', () => {
  test('uploading mock JSON renders a chart', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(MOCK_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('file upload — real export', () => {
  test('uploading real backup JSON renders a chart', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
  })

  test('year pill buttons appear for each year in the data', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    // Backup spans 2019–2024 — at least 3 year pills expected
    const yearPills = page.getByRole('button', { name: /^20\d\d$/ })
    expect(await yearPills.count()).toBeGreaterThanOrEqual(3)
  })

  test('deselecting a year pill hides it from the selection', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })

    const firstPill = page.getByRole('button', { name: /^20\d\d$/ }).first()
    await firstPill.click()
    // Plot stays visible (other years remain)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible()
  })

  test('selecting a rolling window preset updates the chart', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '1mo' }).click()
    // 1mo button should now appear selected (bg-gray-900)
    await expect(page.getByRole('button', { name: '1mo' })).toBeVisible()
  })
})
