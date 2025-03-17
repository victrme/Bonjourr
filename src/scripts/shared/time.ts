interface Suntime {
	sunrise: number
	sunset: number
	dusk: number
}

let sunrise = 420
let sunset = 1320
let dusk = 60

let userSetDate: Date

export function userDate(timezone = 'auto'): Date {
	const isUTC = (timezone.includes('+') || timezone.includes('-')) && timezone.length < 6
	const date = new Date()

	if (timezone === 'auto' && userSetDate) {
		return userSetDate
	}

	if (timezone === 'auto') {
		return date
	}

	if (isUTC) {
		const offset = date.getTimezoneOffset() / 60 // hour
		let utcHour = date.getHours() + offset
		const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
		let minutes: number

		if (timezone.split('.')[1]) {
			minutes = utcMinutes + Number.parseInt(timezone.split('.')[1])

			if (minutes > -30) {
				utcHour++
			}
		} else {
			minutes = date.getMinutes()
		}

		date.setHours(utcHour + Number.parseInt(timezone), minutes)

		return date
	}

	const intl = new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'medium' })

	userSetDate = new Date(intl.format(date))

	return userSetDate
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
