import { Page } from '@playwright/test'

export default async function openAllSettings(page: Page) {
	await page.waitForTimeout(200)
	await page.getByRole('button', { name: 'Toggle settings menu' }).click()
	await page.waitForTimeout(5)
	await page.waitForSelector('#settings')
	await page.getByLabel('Show all settings').click()
}
