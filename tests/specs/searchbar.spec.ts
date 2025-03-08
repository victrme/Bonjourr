import { test, expect, Page } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
	await page.locator('#i_sb').check()
})

test.describe('Suggestions', () => {
	test('Suggests results', async ({ page }) => {
		await writeInSearchBar(page, 'minecraft')
		expect(await page.locator('#sb-suggestions li.shown').count()).toBeGreaterThan(0)
	})

	test('Has descriptions on Google', async ({ page }) => {
		await writeInSearchBar(page, 'minecraft')
		expect(await page.locator('#sb-suggestions li:first-child img').getAttribute('src')).toBeTruthy()
		expect(await page.locator('#sb-suggestions li:first-child .suggest-result').textContent()).toBeTruthy()
		expect(await page.locator('#sb-suggestions li:first-child .suggest-desc').textContent()).toBeTruthy()
	})

	test('Empty search removes results', async ({ page }) => {
		await writeInSearchBar(page, 'hello world')
		await page.getByRole('button', { name: 'Empty search' }).click()
		expect(await page.locator('#sb-suggestions li.shown').count()).toBe(0)
	})

	test('Typing URL stops suggesting', async ({ page }) => {
		await writeInSearchBar(page, 'example.com', true)
		await page.waitForTimeout(500)
		expect(page.locator('#sb-suggestions li:first-child')).not.toBeVisible()
	})

	test('Focus/blur shows/hides suggestions', async ({ page }) => {
		await writeInSearchBar(page, 'bonjourr')
		expect(page.locator('#sb-suggestions li:first-child')).toBeVisible()

		await page.getByRole('button', { name: 'Toggle settings menu' }).click()
		expect(page.locator('#sb-suggestions li:first-child')).not.toBeVisible()

		await page.getByRole('textbox', { name: 'Search bar' }).click()
		expect(page.locator('#sb-suggestions li:first-child')).toBeVisible()
	})

	test('Navigating adds result to input', async ({ page }) => {
		await writeInSearchBar(page, 'paris')
		await page.keyboard.down('ArrowDown')

		const input = await page.locator('#searchbar').inputValue()
		const result = await page.locator('.suggest-result').first().textContent()

		expect(input).toEqual(result)
	})
})

//
//
//

async function writeInSearchBar(page: Page, query: string, skip?: true) {
	await page.getByRole('textbox', { name: 'Search bar' }).pressSequentially(query, { delay: 150 })
	if (skip) return
	await page.waitForSelector('#sb-suggestions')
}
