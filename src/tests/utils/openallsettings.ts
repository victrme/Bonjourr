import { Page } from '@playwright/test'

export default async function openAllSettings(page: Page) {
	await page.locator('body #showSettings').click()
	await page.locator('body #i_showall').click()
}
