import { test, expect, Page } from '@playwright/test'

test.setTimeout(8000)
test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage()
	await page.goto('http://127.0.0.1:5500/release/online/index.html')

	await page.waitForTimeout(200)
	await page.getByRole('button', { name: 'Toggle settings menu' }).click()
	await page.waitForTimeout(5)
	await page.waitForSelector('#settings')
	await page.getByLabel('Show all settings').click()
	await page.locator('#i_sb').check()
})

test.afterAll(async () => {
	await page.close()
})

// test.afterEach(async () => {
// 	await page.reload()
// })

test.describe('Suggestions', () => {
	test('Suggests results', async () => {
		await page.getByRole('textbox', { name: 'Search bar' }).click()
		await page.getByRole('textbox', { name: 'Search bar' }).fill('minecraft')
		await page.waitForTimeout(600)

		expect(await page.locator('#sb-suggestions li.shown').count()).toBeGreaterThan(0)
	})

	test('Has descriptions on Google', async () => {
		expect(await page.locator('#sb-suggestions li:first-child img').getAttribute('src')).toBeTruthy()
		expect(await page.locator('#sb-suggestions li:first-child .suggest-result').textContent()).toBeTruthy()
		expect(await page.locator('#sb-suggestions li:first-child .suggest-desc').textContent()).toBeTruthy()
	})

	test('Empty search removes results', async () => {
		await page.getByRole('button', { name: 'Empty search' }).click()
		expect(await page.locator('#sb-suggestions li.shown').count()).toBe(0)
	})

	test('Typing URL stops suggesting', async () => {
		await page.getByRole('textbox', { name: 'Search bar' }).fill('bonjourr.fr')
		await page.waitForTimeout(600)

		expect(await page.locator('#sb-suggestions li.shown').count()).toBe(0)
	})

	test('Losing focus hides suggestions', async () => {
		await page.getByRole('textbox', { name: 'Search bar' }).fill('bonjourr')
		await page.waitForTimeout(600)

		expect(await page.locator('#sb-suggestions.shown').count()).toBe(1)

		await page.getByRole('button', { name: 'Toggle settings menu' }).click()

		expect(await page.locator('#sb-suggestions.shown').count()).toBe(0)
	})

	test('Focusing shown suggestions, if any', async () => {
		await page.getByRole('textbox', { name: 'Search bar' }).fill('b')
		await page.waitForTimeout(600)

		expect(await page.locator('#sb-suggestions.shown').count()).toBe(1)

		await page.keyboard.press('Backspace')
		await page.getByRole('button', { name: 'Toggle settings menu' }).click()
		await page.getByRole('textbox', { name: 'Search bar' }).click()

		expect(await page.locator('#sb-suggestions.shown').count()).toBe(0)
	})

	test('Navigating adds result to input', async () => {
		await page.getByRole('textbox', { name: 'Search bar' }).fill('par')
		await page.waitForTimeout(800)
		await page.keyboard.press('ArrowDown')

		const input = await page.locator('#searchbar').inputValue()
		const result = await page.locator('#sb-suggestions li:first-child .suggest-result').textContent()

		expect(input).toBe(result)
	})
})
