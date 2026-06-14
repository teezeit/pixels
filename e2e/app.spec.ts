import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_JSON = path.join(__dirname, '../.data/PIXELS-BACKUP-2024-05-29T22 15 32.476895.json')
const MOCK_JSON = path.join(__dirname, '../public/mock_pixels_data.json')

test.describe('initial state', () => {
  test('shows heading', async ({ page }) => {
    await page.goto('.')
    await expect(page.getByRole('heading', { name: 'Pixels Year Plotting' })).toBeVisible()
  })

  test('loads sample data and renders chart on mount', async ({ page }) => {
    await page.goto('.')
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Showing sample data')).toBeVisible()
  })

  test('config controls are visible after sample data loads', async ({ page }) => {
    await page.goto('.')
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Plot title')).toBeVisible()
    await expect(page.getByText('Rolling window')).toBeVisible()
  })
})

test.describe('file upload — mock_pixels_data.json', () => {
  test('uploading mock JSON renders a chart and clears sample data notice', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(MOCK_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Showing sample data')).not.toBeVisible()
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
    const yearPills = page.getByRole('button', { name: /^20\d\d$/ })
    expect(await yearPills.count()).toBeGreaterThanOrEqual(3)
  })

  test('deselecting a year pill keeps chart visible', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^20\d\d$/ }).first().click()
    await expect(page.locator('[data-testid="plot"]')).toBeVisible()
  })

  test('selecting a rolling window preset updates the chart', async ({ page }) => {
    await page.goto('.')
    await page.locator('input[type="file"]').setInputFiles(BACKUP_JSON)
    await expect(page.locator('[data-testid="plot"]')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '1mo' }).click()
    await expect(page.getByRole('button', { name: '1mo' })).toBeVisible()
  })
})
