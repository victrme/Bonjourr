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

	await page.locator('#i_clockface').selectOption('number')
	expect(await page.locator('#analog').textContent()).toContain('12369')

	await page.locator('#i_clockface').selectOption('roman')
	expect(await page.locator('#analog').textContent()).toContain('XIIIIIVIIX')

	await page.locator('#i_clockface').selectOption('marks')
	expect(await page.locator('#analog').textContent()).toContain('│―│―')

	await page.locator('#i_clockface').selectOption('none')
	expect((await page.locator('#analog').textContent())?.trimEnd()).toBe('')
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
	await page.getByLabel('Show Seconds').check()
	expect(((await page.locator('#clock').textContent()) ?? '').length).toEqual(8)
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

test('US date format', async ({ page }) => {
	await page.getByLabel('US Date Format').check()

	const content = (await page.locator('#date').textContent()) ?? ''
	const number = content.split(' ')[2]

	expect(content).toContain(',')
	expect(parseInt(number)).not.toBeNaN()
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
