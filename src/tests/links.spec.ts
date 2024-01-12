import { test, expect, Page } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	// await openAllSettings(page)
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

	test('Add multiples', async ({ page }) => {
		await addLink(page, 'victr.me', '')
		await addLink(page, 'tahoe.be', '')

		const links = await page.locator('#linkblocks li').all()

		expect(await links[1].locator('span').textContent()).toEqual('')
		expect(await links[1].locator('a').getAttribute('href')).toEqual('https://tahoe.be')
		expect(links.length).toEqual(2)
	})
})

test.describe('Edit link', () => {
	test.describe('Inputs and buttons', () => {
		test.describe('In tab', () => {
			test('Add new', async ({ page }) => {
				await page.locator('#linkblocks').click({ button: 'right' })
				await expect(page.getByPlaceholder('Example', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com', { exact: true })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible()
			})

			test('Update', async ({ page }) => {
				await addLink(page, 'bonjourr.fr', 'bonjourr.fr')
				await page.locator('#linkblocks li').click({ button: 'right' })
				await expect(page.getByPlaceholder('Example', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com/favicon.')).toBeVisible()
				await expect(page.getByRole('button', { name: 'Delete selected' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Apply changes' })).toBeVisible()
			})

			test('Select multiples', async ({ page }) => {
				test.slow()

				await addLink(page, 'bonjourr.fr', 'bonjourr')
				await addLink(page, 'victr.me', 'victr')
				await addLink(page, 'tahoe.be', 'tahoe')

				const links = await page.locator('#linkblocks li').all()

				await links[0].hover()
				await page.mouse.down()
				await page.waitForTimeout(600)
				await page.mouse.up()

				await links[1].click()
				await links[2].click()
				await links[2].click({ button: 'right' })

				await expect(page.getByText('Create new folder')).toBeVisible()
				await expect(page.getByText('Delete selected')).toBeVisible()
			})
		})

		test.describe('In folder', () => {
			test.beforeEach(async ({ page }) => {
				await createFolder(page, ['victr.me', 'tahoe.be'])

				await page.locator('#linkblocks li').click()
				await page.waitForTimeout(200)
				await page.locator('#linkblocks').click({ button: 'right' })
			})

			test('Add new', async ({ page }) => {
				test.slow()
				await expect(page.getByPlaceholder('Example', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com', { exact: true })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible()
			})

			test('Update', async ({ page }) => {
				test.slow()
				await page.locator('#linkblocks li').first().click({ button: 'right' })
				await expect(page.getByPlaceholder('Example', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com', { exact: true })).toBeVisible()
				await expect(page.getByPlaceholder('https://example.com/favicon.')).toBeVisible()
				await expect(page.getByRole('button', { name: 'Remove from folder' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Delete selected' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Apply changes' })).toBeVisible()
			})

			test('Select multiples', async ({ page }) => {
				test.slow()

				const links = await page.locator('#linkblocks li').all()
				await links[0].hover()
				await page.mouse.down()
				await page.waitForTimeout(600)
				await page.mouse.up()

				await links[1].click()
				await links[1].click({ button: 'right' })

				await expect(page.getByRole('button', { name: 'Remove from folder' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Delete selected' })).toBeVisible()
			})
		})
	})

	test.describe('Updates', () => {
		test('Link', async ({ page }) => {
			await addLink(page, 'wikipedia.org', 'wikipedia')

			const title = 'bonjourr'
			const url = 'https://bonjourr.fr'
			const icon = 'https://bonjourr.fr/apple-touch-icon.png'

			// Title
			await page.getByRole('link', { name: 'wikipedia' }).click({ button: 'right' })
			await page.locator('#e_title').click()
			await page.locator('#e_title').fill(title)
			await page.getByRole('button', { name: 'Apply changes' }).click()

			const span = page.locator('#linkblocks li span')
			expect(await span?.textContent()).toEqual(title)

			// Link
			await page.waitForTimeout(200)
			await page.getByRole('link', { name: title }).click({ button: 'right' })
			await page.locator('#e_url').click()
			await page.locator('#e_url').fill(url)
			await page.getByRole('button', { name: 'Apply changes' }).click()

			const a = page.locator('#linkblocks li a')
			expect(await a?.getAttribute('href')).toEqual(url)

			// Icon
			await page.waitForTimeout(200)
			await page.getByRole('link', { name: title }).click({ button: 'right' })
			await page.locator('#e_iconurl').click()
			await page.locator('#e_iconurl').fill(icon)
			await page.getByRole('button', { name: 'Apply changes' }).click()

			const img = page.locator('#linkblocks li img')
			expect(await img?.getAttribute('src')).toEqual(icon)
		})

		test('Folder', async ({ page }) => {
			test.slow()
			await createFolder(page, ['victr.me', 'tahoe.be'])
			await page.locator('#linkblocks li').first().click({ button: 'right' })

			await page.locator('#e_title').click()
			await page.locator('#e_title').fill('dossier 1')
			await page.getByRole('button', { name: 'Apply changes' }).click()

			expect(await page.locator('#linkblocks li span')?.textContent()).toEqual('dossier 1')
		})
	})
})

test.describe('Folders', () => {
	test('Creates folder', async ({ page }) => {
		await createFolder(page, ['victr.me', 'tahoe.be'])
		const folder = page.locator('#linkblocks li').first()
		expect(await folder.getAttribute('class')).toContain('folder')
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
	await page.locator('#linkblocks').click({ button: 'right', position: { x: 0, y: 0 } })
	await page.locator('#e_title').click()
	await page.locator('#e_title').fill(title)
	await page.keyboard.press('Tab')
	await page.keyboard.type(url)
	await page.locator('#e_add-link').click()
	await page.waitForTimeout(200)
}

async function createFolder(page: Page, urls: string[] = []) {
	for (const url of urls) {
		await addLink(page, url, '')
	}

	const links = await page.locator('#linkblocks li').all()

	await links[0].hover()
	await page.mouse.down()
	await page.waitForTimeout(600)
	await page.mouse.up()

	for (let i = 1; i < links.length; i++) {
		await links[i].click()
	}

	await links[links.length - 1].click({ button: 'right' })
	await page.getByText('Create new folder').click()
}
