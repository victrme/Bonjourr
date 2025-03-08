import { test, expect } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
})

test('Page loads', async ({ page }) => {
	await expect(page).toHaveTitle(/New tab/)
	await page.waitForSelector('#interface')
})

test('All widgets work', async ({ page }) => {
	await page.waitForSelector('#settings')
	await page.locator('body #showSettings').click()

	await page.locator('#i_sb').click()
	await page.locator('#i_notes').click()
	await page.locator('#i_quotes').click()

	await page.waitForSelector('#quote')

	expect(page.locator('#time')).toBeVisible()
	expect(page.locator('#main')).toBeVisible()
	expect(page.locator('#pocket-editor')).toBeVisible()
	expect(page.locator('#searchbar')).toBeVisible()
	expect(page.locator('#linkblocks')).toBeVisible()
	expect(page.locator('#quote')).toBeVisible()
})

test.describe('Settings', () => {
	test.beforeEach(async ({ page }) => await openAllSettings(page))

	test.describe('Language', () => {
		test('Is correctly set to english', async ({ page }) => {
			expect(await page.getByRole('combobox', { name: 'Language' }).inputValue()).toEqual('en')
			expect(await page.locator('html')?.getAttribute('lang')).toEqual('en')
		})

		test('Switch to French', async ({ page }) => {
			await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
			await page.getByRole('heading', { name: 'Général' }).isVisible()
			expect(await page.locator('html')?.getAttribute('lang')).toEqual('fr')

			// Back to English
			await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')
		})
	})

	test.describe('Dark mode', () => {
		test('Enabled', async ({ page }) => {
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('enable')
			expect(await page.locator(':root').getAttribute('data-theme')).toBe('dark')
		})

		test('Disabled', async ({ page }) => {
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('disable')
			expect(await page.locator(':root').getAttribute('data-theme')).toBe('light')
		})

		test('System', async ({ page }) => {
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('system')
			expect(await page.locator(':root').getAttribute('data-theme')).toBe('')
		})

		// Auto
		// ... later, because need to find a way to change browser time
	})

	test.describe('Tab apearance', () => {
		test.describe('Title', () => {
			test('Adds text', async ({ page }) => {
				// Adds text
				await page.getByRole('textbox', { name: 'Tab title' }).fill('Hello World')
				await expect(page).toHaveTitle('Hello World')
			})

			test('Removes text back to default', async ({ page }) => {
				await page.getByRole('textbox', { name: 'Tab title' }).fill('Hello World')
				await page.getByRole('textbox', { name: 'Tab title' }).fill('')

				await expect(page).toHaveTitle('New tab')
			})
		})

		test('Favicon', async ({ page }) => {
			// Adds favicon
			await page.getByRole('textbox', { name: 'Tab favicon' }).fill('🤱')
			await page.waitForTimeout(10)

			const link = page.locator('#favicon')
			expect(await link?.getAttribute('href')).toContain('🤱')

			// Removes
			await page.getByRole('textbox', { name: 'Tab favicon' }).fill('')
			expect(await link?.getAttribute('href')).toContain('/src/assets/favicon.ico')
		})
	})
})
