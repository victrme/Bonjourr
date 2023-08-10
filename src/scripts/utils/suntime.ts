import { minutator } from '../utils'
import { Weather } from '../types/sync'

let sunset = 0
let sunrise = 0

export default function sunTime(weather?: Weather) {
	if (weather && weather.lastState) {
		sunrise = weather.lastState.sunrise
		sunset = weather.lastState.sunset
	}

	if (sunset === 0) {
		return {
			now: minutator(new Date()),
			rise: 420,
			set: 1320,
		}
	}

	return {
		now: minutator(new Date()),
		rise: minutator(new Date(sunrise * 1000)),
		set: minutator(new Date(sunset * 1000)),
	}
}
