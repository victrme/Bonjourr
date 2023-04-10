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

test('Toggle to analog', async () => {
	await page.getByLabel('Analog clock').check()
	expect(await page.locator('#analogClock').isVisible()).toBeTruthy()
})

test('Toggle show seconds', async () => {
	await page.getByLabel('Show Seconds').check()
	expect(await page.locator('#analogSeconds').isVisible()).toBeTruthy()

	// Back to numerical
	await page.locator('#analogClock').click()

	const clockText = (await page.locator('#clock').textContent()) || ''
	expect(clockText.length).toEqual(8)
})

test('12 hour', async () => {
	// ...
})
