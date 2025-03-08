import { Page } from '@playwright/test'

export default async function openAllSettings(page: Page) {
	await page.waitForSelector('#settings')
	await page.locator('body #showSettings').click()
	await page.locator('body #i_showall').click()

	await page.waitForTimeout(200)
}
