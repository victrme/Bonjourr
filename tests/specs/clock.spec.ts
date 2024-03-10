import { test, expect } from '@playwright/test'
import openAllSettings from './utils/openallsettings'

test.beforeEach(async ({ page }) => {
	await page.goto('./')
	await openAllSettings(page)
})

test('Analog', async ({ page }) => {
	await page.getByLabel('Analog clock').check()
	expect(await page.locator('#analog').isVisible()).toBe(true)
})

test('Analog face', async ({ page }) => {
	await page.getByLabel('Analog clock').check()

	const testStyle = async (style: string, elements: string[]): Promise<boolean> => {
		await page.locator('#i_clockface').selectOption(style)
		const face = (await page.locator('#analog').textContent()) ?? ''
		return elements.every((el) => face.includes(el))
	}

	expect(await testStyle('number', ['12', '3', '6', '9'])).toBe(true)
	expect(await testStyle('roman', ['XII', 'III', 'VI', 'IX'])).toBe(true)
	expect(await testStyle('marks', ['│', '―', '│', '―'])).toBe(true)
	expect(await testStyle('none', [''])).toBe(true)
})

test('Analog style', async ({ page }) => {
	await page.getByLabel('Analog clock').check()

	await page.getByRole('combobox', { name: 'Clock style' }).selectOption('transparent')
	await expect(page.locator('#analog')).toHaveClass('transparent')

	await page.getByRole('combobox', { name: 'Clock style' }).selectOption('round')
	await expect(page.locator('#analog')).toHaveClass('round')

	await page.getByRole('combobox', { name: 'Clock style' }).selectOption('square')
	await expect(page.locator('#analog')).toHaveClass('square')
})

test('Show seconds', async ({ page }) => {
	await page.getByLabel('Show seconds').check()
	expect(page.locator('#digital-ss')).toBeVisible()
	expect(page.locator('#digital-mm-separator')).toBeVisible()

	await page.getByLabel('Analog clock').check()
	await expect(page.locator('#analog-seconds')).toBeVisible()
})

test('12 hour time', async ({}) => {
	test.fixme()
	// ...
})

test('Timezones', async ({ page }) => {
	test.fixme()

	const getClockHour = async () => parseInt(((await page.locator('#clock').textContent()) ?? '').split(':')[0])

	const currentHour = await getClockHour()
	const select = page.getByRole('combobox', { name: 'Time zone' }) //.selectOption('fr')
	const options = await page.locator('#i_timezone option').all()

	for (const option of options) {
		const val = (await option.getAttribute('value')) ?? ''
		const number = Math.floor(parseFloat(val))

		if (val === 'auto') {
			continue
		}

		await select.selectOption(val)

		console.log(currentHour + number, await getClockHour())
		expect(currentHour + number).toEqual(await getClockHour())
	}
})

test('Date formats', async ({ page }) => {
	const defaultDate = await page.locator('#date').textContent()

	expect(page.locator('#date')).toBeVisible()

	await page.getByRole('combobox', { name: 'Date format' }).selectOption('us')
	expect(await page.locator('#date').textContent()).not.toEqual(defaultDate)

	await page.getByRole('combobox', { name: 'Date format' }).selectOption('cn')
	expect(await page.locator('#date').textContent()).not.toEqual(defaultDate)

	await page.getByRole('combobox', { name: 'Date format' }).selectOption('eu')
	expect(await page.locator('#date').textContent()).toEqual(defaultDate)
})

test('Clock size', async ({ page }) => {
	test.fixme()

	const defaultWidth = (await page.locator('#clock').boundingBox())?.width ?? 0

	const slider = page.getByRole('slider', { name: 'Clock size' })
	const sliderpos = (await slider.boundingBox())?.width ?? 0

	await slider.click({ force: true, position: { x: sliderpos / 3, y: 0 } })
	const newWidth = (await page.locator('#clock').boundingBox())?.width ?? 0

	expect(defaultWidth > newWidth).toBe(true)
})
