import { minutator } from '../utils'

interface Suntime {
	sunrise: number
	sunset: number
	dusk: number
}

let sunrise = 420
let sunset = 1320
let dusk = 60

export default function suntime(rise?: number, set?: number): Suntime {
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
