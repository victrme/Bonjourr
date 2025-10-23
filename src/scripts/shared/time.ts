import { BROWSER } from '../defaults.ts'

interface Suntime {
	sunrise: number
	sunset: number
	dusk: number
}

let sunrise = 420
let sunset = 1320
let dusk = 60

let userSetDate: Date

export function userDate(timezone?: string): Date {
	const hasSetDate = !timezone && userSetDate
	const isAuto = !timezone || timezone === 'auto'
	let date = new Date()

	if (hasSetDate) {
		return userSetDate
	}

	if (isAuto) {
		return date
	}

	/**
	 * AST & CST timezones seems to only work on chrome
	 * Do these timezones switch to daylight savings ?
	 * If yes, this fix below is wrong
	 */
	if (BROWSER === 'firefox') {
		if (timezone === 'CST') {
			timezone = '-06:00'
		}
		if (timezone === 'AST') {
			timezone = '-03:00'
		}
	}

	try {
		const intl = new Intl.DateTimeFormat('en', {
			timeZone: timezone,
			dateStyle: 'medium',
			timeStyle: 'medium',
		})

		date = new Date(intl.format(date))
	} catch (e) {
		console.warn(e)
		console.info('Your timezone is not valid')
	}

	return date
}

export function setUserDate(timezone: string): void {
	userSetDate = userDate(timezone)
}

export function daylightPeriod(time?: number) {
	// noon & evening are + /- 60 min around sunrise/set

	const mins = minutator(time ? new Date(time) : new Date())

	if (mins >= 0 && mins <= sunrise - 60) {
		return 'night'
	}
	if (mins <= sunrise + 60) {
		return 'noon'
	}
	if (mins <= sunset - 60) {
		return 'day'
	}
	if (mins <= sunset + 60) {
		return 'evening'
	}
	if (mins >= sunset + 60) {
		return 'night'
	}

	return 'day'
}

export function suntime(rise?: number, set?: number): Suntime {
	if (rise && set) {
		sunrise = minutator(new Date(rise))
		sunset = minutator(new Date(set))
	}

	// This calculates an approximate time between sunset and dusk
	// 16h sunset -> 40min dusk time
	// 21h sunset -> 1h10min dusk time
	const minutesInADay = 60 * 24
	const maxTimeToDusk = 100
	dusk = maxTimeToDusk - (minutesInADay - sunset) / 8

	return {
		sunrise,
		sunset,
		dusk,
	}
}

export function needsChange(every: string, last: number): boolean {
	const nowDate = userDate()
	const lastDate = last !== undefined ? new Date(last) : nowDate
	const changed = {
		date: nowDate.getDate() !== lastDate.getDate(),
		hour: nowDate.getHours() !== lastDate.getHours(),
	}

	switch (every) {
		case 'day':
			return changed.date

		case 'hour':
			return changed.date || changed.hour

		case 'tabs':
			return true

		case 'pause':
			return last === 0

		case 'period': {
			return last === 0 ? true : daylightPeriod() !== daylightPeriod(+lastDate)
		}

		default:
			return false
	}
}

export function minutator(date: Date) {
	return date.getHours() * 60 + date.getMinutes()
}
