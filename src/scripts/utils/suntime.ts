import { minutator } from '../utils'

interface Suntime {
	sunrise: number
	sunset: number
}

let sunrise = 420
let sunset = 1320

export default function suntime(rise?: number, set?: number): Suntime {
	if (rise && set) {
		sunrise = minutator(new Date(rise))
		sunset = minutator(new Date(set))
	}

	return {
		sunrise,
		sunset,
	}
}
