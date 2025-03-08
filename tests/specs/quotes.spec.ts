import { test, expect } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
	await page.locator('#i_quotes').click()
})

// test quotes options
test('Quotes option works', async ({ page }) => {
	await page.waitForTimeout(400)
	await page.reload()

	await page.locator('#author').hover()
	await expect(page.locator('#quote')).toBeVisible()
	await expect(page.locator('#author')).toBeVisible()
	expect((await page.locator('#quotes_container').textContent())?.length).toBeGreaterThan(30)
})

test('Always show author', async ({ page }) => {
	await page.locator('#i_qtauthor').click()
	await expect(page.locator('#author')).toBeVisible()

	await page.reload()

	await expect(page.locator('#author')).toBeVisible()
})

test('Can refresh quotes', async ({ page }) => {
	const firstquote = await page.locator('#quote').textContent()
	await page.locator('#i_qtrefresh').click()
	const secondquote = await page.locator('#quote').textContent()

	expect(firstquote?.length).toBeGreaterThan(0)
	expect(firstquote).not.toEqual(secondquote)
})

test.describe('Types', () => {
	test('Inspirobot', async ({ page }) => {
		await page.locator('#i_qttype').selectOption('inspirobot')

		await page.waitForTimeout(1000)

		await expect(page.locator('#quote')).toBeVisible()
		await expect(page.locator('#author')).toHaveText('Inspirobot')
	})

	test('Kaamelott', async ({ page }) => {
		const firstquote = await page.locator('#quote').textContent()

		await page.locator('#i_qttype').selectOption('kaamelott')
		await page.waitForTimeout(1000)

		const secondquote = await page.locator('#quote').textContent()

		expect(firstquote).not.toEqual(secondquote)
	})
})

test.describe('Frequency', () => {
	test('Every tabs', async ({ page }) => {
		await page.locator('#i_qtfreq').selectOption('tabs')

		const firstquote = await page.locator('#quote').textContent()
		await page.waitForTimeout(1000)
		await page.reload()
		const secondquote = await page.locator('#quote').textContent()

		expect(firstquote).not.toEqual(secondquote)
	})

	test.fixme('Every hour', async ({ page }) => {
		// ...
	})

	test.fixme('Every day', async ({ page }) => {
		// ...
	})

	test.fixme('pause', async ({ page }) => {
		// ...
	})
})

test.describe('User quotes', () => {
	test('Adds user quotes', async ({ page }) => {
		await page.locator('#i_qttype').selectOption('user')
		await expect(page.locator('#quotes_container')).toHaveText('')

		await page.locator('#i_qtlist').fill(`Computer, Hello world, this is a test quote`)
		await page.locator('#i_qtlist').blur()

		await expect(page.locator('#quote')).toHaveText('Hello world, this is a test quote')
		await expect(page.locator('#author')).toHaveText('Computer')
	})

	test('Converts old json format to csv', async ({ page }) => {
		await page.locator('#i_qttype').selectOption('user')

		await page.evaluate(() => {
			const json = [['Author 1', 'Quote 1']]
			const storage = JSON.parse(localStorage.getItem('bonjourr') ?? '{}')
			storage.quotes.userlist = json
			localStorage.setItem('bonjourr', JSON.stringify(storage))
		})

		await page.waitForTimeout(400)
		await page.reload()

		await expect(page.locator('#quote')).toHaveText('Quote 1')
		await expect(page.locator('#author')).toHaveText('Author 1')
	})

	test.fixme('Refreshes user quotes', async ({ page }) => {
		await page.locator('#i_qttype').selectOption('user')

		await page.locator('#i_qtlist').fill(`Computer, Hello world\nMe, is second quote, yes :))`)
		await page.locator('#i_qtlist').blur()

		const firstquote = await page.locator('#quote').textContent()
		await page.locator('#i_qtrefresh').click()
		const secondquote = await page.locator('#quote').textContent()

		expect(firstquote).not.toEqual(secondquote)
	})
})
