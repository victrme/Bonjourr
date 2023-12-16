import { test, expect, Page } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
})

test.describe('Link submission', () => {
	test('Adds link with title', async ({ page }) => {
		await addLink(page, 'bonjourr.fr', 'bonjourr')

		const span = page.locator('#linkblocks li span')
		const a = page.locator('#linkblocks li a')

		expect(await span?.textContent()).toEqual('bonjourr')
		expect(await a?.getAttribute('href')).toEqual('https://bonjourr.fr')
	})

	test('Adds link without title', async ({ page }) => {
		await addLink(page, 'bonjourr.fr', '')

		const span = page.locator('#linkblocks li span')
		const a = page.locator('#linkblocks li a')

		expect(await span?.textContent()).toEqual('')
		expect(await a?.getAttribute('href')).toEqual('https://bonjourr.fr')
	})
})

test.describe('Edit link', () => {
	test.beforeEach(async ({ page }) => await addLink(page, 'wikipedia.org', 'wikipedia'))

	test('Modifies title', async ({ page }) => {
		const title = 'wiki'

		await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
		await page.getByPlaceholder('Title').click()
		await page.getByPlaceholder('Title').fill(title)
		await page.getByRole('button', { name: 'Apply changes' }).click()

		const span = page.locator('#linkblocks li span')

		expect(await span?.textContent()).toEqual(title)
	})

	test('Modifies link', async ({ page }) => {
		const url = 'https://wikipedia.org'

		await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
		await page.getByPlaceholder('Link').click()
		await page.getByPlaceholder('Link').fill(url)
		await page.getByRole('button', { name: 'Apply changes' }).click()

		const a = page.locator('#linkblocks li a')

		expect(await a?.getAttribute('href')).toEqual(url)
	})

	test('Modifies icon', async ({ page }) => {
		const icon = 'https://wikipedia.org/favicon.ico'

		await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
		await page.getByPlaceholder('Icon').click()
		await page.getByPlaceholder('Icon').fill(icon)
		await page.getByRole('button', { name: 'Apply changes' }).click()

		const img = page.locator('#linkblocks li img')

		expect(await img?.getAttribute('src')).toEqual(icon)
	})
})

test.describe('Select multiple', () => {
	test('Long clicks selects', async ({ page }) => {
		await addLink(page, 'bonjourr.fr', 'bonjourr')

		await page.locator('#linkblocks li:first-child').hover()
		await page.mouse.down()
		await page.waitForTimeout(1000)
		await page.mouse.up()

		expect(await page.locator('#linkblocks li:first-child').getAttribute('class')).toContain('selected')
	})
})

test.describe('Link styles', () => {
	test('Updates styles', async ({ page }) => {
		const linkblocks = await page.$('#linkblocks')
		const select = page.locator('#i_linkstyle')

		// Medium
		await select.selectOption('medium')
		expect(await linkblocks?.getAttribute('class')).toContain('medium')

		// Small
		await select.selectOption('small')
		expect(await linkblocks?.getAttribute('class')).toContain('small')

		// Text
		await select.selectOption('text')
		expect(await linkblocks?.getAttribute('class')).toContain('text')
		expect(await linkblocks?.$('#linkblocks a img')).toBeFalsy()

		// Large
		await select.selectOption('large')
		expect(!!(await linkblocks?.getAttribute('class'))?.match('/small|medium|text/')).toBe(false)
	})
})

test('Reduces links row', async ({ page }) => {
	await addLink(page, 'bonjourr.fr', '')

	await page.getByLabel('Links per row').fill('1')
	await page.waitForTimeout(200)

	const links = await page.locator('#linkblocks li').all()
	let areInColumn = true
	let lastHeight = 0

	links.forEach(async (link) => {
		const box = await link.boundingBox()

		if (lastHeight === box?.y) {
			areInColumn = false
		}

		lastHeight = box?.y || 0
	})

	expect(areInColumn).toEqual(true)
})

test('Opens in new tab', async ({ page }) => {
	await page.locator('#i_linknewtab').click()

	const a = page.locator('#linkblocks li:last-child a')
	const target = await a.getAttribute('target')

	expect(target).toEqual('_blank')
})

//

async function addLink(page: Page, url = '', title = '') {
	await page.getByRole('textbox', { name: 'New link title' }).click()
	await page.getByRole('textbox', { name: 'New link title' }).fill(title)
	await page.getByRole('textbox', { name: 'New link title' }).press('Tab')
	await page.getByPlaceholder('URL').fill(url)
	await page.locator('#submitlink').click()
}
