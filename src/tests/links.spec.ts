import { test, expect, Page } from '@playwright/test'

test.setTimeout(8000)
test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage()
	await page.goto('http://127.0.0.1:5500/release/online/index.html')
})

test.afterAll(async () => {
	await page.close()
})

test.beforeEach(async () => {
	await page.waitForTimeout(200)
	await page.getByRole('button', { name: 'Toggle settings menu' }).click()
	await page.waitForTimeout(5)
	await page.waitForSelector('#settings')

	const classes = (await page.locator('#settings')?.getAttribute('class')) || ''

	if (!classes.includes('all')) {
		await page.getByLabel('Show all settings').click()
	}
})

test.afterEach(async () => {
	await page.reload()
})

async function addLink(url = '', title = '') {
	await page.getByRole('textbox', { name: 'New link title' }).click()
	await page.getByRole('textbox', { name: 'New link title' }).fill(title)
	await page.getByRole('textbox', { name: 'New link title' }).press('Tab')
	await page.getByPlaceholder('URL').fill(url)
	await page.getByRole('button', { name: 'Add' }).click()
}

test('Adds single link', async () => {
	await page.getByRole('textbox', { name: 'New link title' }).click()
	await page.getByRole('textbox', { name: 'New link title' }).fill('')
	await page.getByRole('textbox', { name: 'New link title' }).press('Tab')
	await page.getByPlaceholder('URL').fill('bonjourr.fr')
	await page.getByRole('button', { name: 'Add' }).click()

	const a = await page.$('li.block a')
	const href = await a?.getAttribute('href')
	expect(href).toEqual('https://bonjourr.fr')
})

test('Modifies title, link & icon', async () => {
	await addLink('wikipedia.org', 'wikipedia')

	const title = 'wiki'
	const url = 'https://fr.wikipedia.org'
	const icon = 'https://fr.wikipedia.org/favicon.ico'

	await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
	await page.getByPlaceholder('Title').click()
	await page.getByPlaceholder('Title').fill(title)
	await page.getByPlaceholder('Link').click()
	await page.getByPlaceholder('Link').fill(url)
	await page.getByPlaceholder('Icon').click()
	await page.getByPlaceholder('Icon').fill(icon)
	await page.getByRole('button', { name: 'Apply changes' }).click()

	const span = page.locator('#linkblocks li:last-child span')
	const img = page.locator('#linkblocks li:last-child img')
	const a = page.locator('#linkblocks li:last-child a')

	expect(await span?.textContent()).toEqual(title)
	expect(await a?.getAttribute('href')).toEqual(url)
	expect(await img?.getAttribute('src')).toEqual(icon)
})

test('Changes styles', async () => {
	const linkblocks = await page.$('#linkblocks')

	// Medium
	await page.getByRole('combobox', { name: 'Style', exact: true }).selectOption('medium')
	expect(await linkblocks?.getAttribute('class')).toContain('medium')

	// Small
	await page.getByRole('combobox', { name: 'Style', exact: true }).selectOption('small')
	expect(await linkblocks?.getAttribute('class')).toContain('small')

	// Text
	await page.getByRole('combobox', { name: 'Style', exact: true }).selectOption('text')
	expect(await linkblocks?.getAttribute('class')).toContain('text')
	expect(await linkblocks?.$('#linkblocks a img')).toBeFalsy()

	// Large
	await page.getByRole('combobox', { name: 'Style', exact: true }).selectOption('large')
	expect(await linkblocks?.getAttribute('class')).toContain('large')
})

test('Reduces links row', async () => {
	test.slow()
	await addLink('bonjourr.fr', '')
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

test('Opens in new tab', async () => {
	await page.locator('#i_linknewtab').click()

	const a = page.locator('#linkblocks li:last-child a')
	const target = await a.getAttribute('target')

	expect(target).toEqual('_blank')
})
