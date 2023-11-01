import { LastWeather } from '../types/local'
import { minutator } from '../utils'

let sunset = 0
let sunrise = 0

export default function sunTime(weather?: LastWeather) {
	if (weather && weather) {
		sunrise = weather.sunrise
		sunset = weather.sunset
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
