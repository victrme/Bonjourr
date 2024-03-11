import { test, expect } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
})

test('Frequency', ({ page }) => {
	test.fixme()
	// no idea how to test that
})

test('Unsplash collection works', ({ page }) => {
	test.fixme()
	// test with 236
})

test('Changes background on refresh button', ({ page }) => {
	test.fixme()
	// ..
})

test('Filters are off when at 0', ({ page }) => {
	test.fixme()

	// .. Blur

	// .. Brightness
})
