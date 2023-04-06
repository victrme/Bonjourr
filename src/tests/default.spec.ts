import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('http://127.0.0.1:5500/release/online/index.html')
})

test('Page loads', async ({ page }) => {
	await expect(page).toHaveTitle(/New tab/)
	await page.waitForSelector('#interface')
})

test.describe('Settings', () => {
	test.beforeEach(async ({ page }) => {
		await page.waitForTimeout(100)
		await page.getByRole('button', { name: 'Toggle settings menu' }).click()
		await page.waitForTimeout(5)
		await page.waitForSelector('#settings')
		await page.getByLabel('Show all settings').click()
	})

	test.describe('Language', () => {
		test('Is correctly set to english', async ({ page }) => {
			expect(await page.getByRole('combobox', { name: 'Language' }).inputValue()).toEqual('en')
			expect(await (await page.$('html'))?.getAttribute('lang')).toEqual('en')
		})

		test('Switch to French', async ({ page }) => {
			await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
			await page.getByRole('heading', { name: 'Général' }).isVisible()
			expect(await (await page.$('html'))?.getAttribute('lang')).toEqual('fr')

			// Back to English
			await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')
		})
	})

	test.describe('Dark mode', () => {
		test('Switch between all modes', async ({ page }) => {
			// Dark
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('enable')
			await expect(page.locator('body')).toHaveClass('dark')

			// Light
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('disable')
			await expect(page.locator('body')).toHaveClass('light')

			// System
			await page.getByRole('combobox', { name: 'Dark mode' }).selectOption('system')
			await expect(page.locator('body')).toHaveClass('autodark')

			// Auto
			// ... later, because need to find a way to change browser time
		})
	})

	test.describe('Tab apearance', () => {
		test('Title', async ({ page }) => {
			// Adds text
			await page.getByRole('textbox', { name: 'Tab title' }).fill('Hello World')
			expect(page).toHaveTitle('Hello World')

			// Removes text
			await page.getByRole('textbox', { name: 'Tab title' }).fill('')
			expect(page).toHaveTitle('New tab')
		})

		test('Favicon', async ({ page }) => {
			// Adds favicon
			await page.getByRole('textbox', { name: 'Tab favicon' }).fill('🤱')
			await page.waitForTimeout(10)

			const link = await page.$('link[rel="icon"]')
			expect(await link?.getAttribute('href')).toContain('🤱')

			// Removes
			await page.getByRole('textbox', { name: 'Tab favicon' }).fill('')
			expect(await link?.getAttribute('href')).toContain('/src/assets/favicon.ico')
		})
	})

	test.describe('Quick links', () => {
		test('Adds link & modifies title', async ({ page }) => {
			// Adds
			await page.getByRole('textbox', { name: 'New link title' }).click()
			await page.getByRole('textbox', { name: 'New link title' }).fill('wikipedia')
			await page.getByRole('textbox', { name: 'New link title' }).press('Tab')
			await page.getByPlaceholder('URL').fill('wikipedia.org')
			await page.getByRole('button', { name: 'Add' }).click()

			// Modifies
			await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
			await page.getByPlaceholder('Title').click()
			await page.getByPlaceholder('Title').fill('wiki')
			await page.getByRole('button', { name: 'Apply changes' }).click()
		})
	})
})
