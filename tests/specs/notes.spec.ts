import { test, expect } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
	await page.locator('#i_notes').click()
})

test('Correctly displays', ({ page }) => {
	test.fixme()
})

test('Text alignments', ({ page }) => {
	test.fixme()

	// .. center

	// .. right

	// .. back to left
})

test('Changes width', ({ page }) => {
	test.fixme()
})

test('Changes opacity and color when opaque', ({ page }) => {
	test.fixme()

	// .. change color

	// .. text is black
})
