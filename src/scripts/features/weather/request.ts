import { handleForecastDisplay, displayWeather } from './display.ts'
import { tradThis, getLang } from '../../utils/translations.ts'
import { handleGeolOption } from './settings.ts'
import { getSunsetHour } from './index.ts'
import { suntime } from '../../shared/time.ts'
import { storage } from '../../storage.ts'

import type { SimpleWeather } from '../../../types/shared.ts'
import type { LastWeather } from '../../../types/local.ts'
import type { Weather } from '../../../types/sync.ts'
import type { Coords } from './index.ts'

export async function weatherCacheControl(data: Weather, lastWeather?: LastWeather) {
	handleForecastDisplay(data.forecast)

	if (!lastWeather) {
		firstStartWeather(data)
		return
	}

	const now = Date.now()
	const last = lastWeather?.timestamp ?? 0
	const isAnHourLater = now > last + 3600000

	if (navigator.onLine && isAnHourLater) {
		const newWeather = await requestNewWeather(data, lastWeather)

		if (newWeather) {
			storage.local.set({ lastWeather: newWeather })
			displayWeather(data, newWeather)
			return
		}
	}

	displayWeather(data, lastWeather)
}

export async function requestNewWeather(data: Weather, lastWeather?: LastWeather): Promise<LastWeather | undefined> {
	if (!navigator.onLine) {
		return lastWeather
	}

	const coords = await getGeolocation(data.geolocation)
	const url = new URL('https://weather.bonjourr.fr/')

	url.searchParams.set('provider', 'auto')
	url.searchParams.set('data', 'simple')
	url.searchParams.set('lang', getLang())
	url.searchParams.set('unit', data.unit === 'metric' ? 'C' : 'F')

	if (coords?.lat && coords?.lon) {
		url.searchParams.set('lat', coords.lat.toString())
		url.searchParams.set('lon', coords.lon.toString())
	}

	if (data.geolocation === 'off' && !coords) {
		const city = data.city ?? 'Paris'
		const q = encodeURIComponent(city)
		url.searchParams.set('query', q)
	}

	const response = await fetch(url)

	if (response.status !== 200) {
		throw new Error('Cannot get weather')
	}

	const json: SimpleWeather = await response?.json()

	let [sunset, sunrise] = [0, 0]
	const { temp, feels } = json.now
	const { description, icon } = json.now

	let forecastedHigh = lastWeather?.forecasted_high ?? -273.15
	let forecastedTimestamp = lastWeather?.forecasted_timestamp ?? 0

	if (json.daily) {
		const [today, tomorrow] = json.daily
		const date = new Date()

		if (date.getHours() > getSunsetHour()) {
			forecastedHigh = tomorrow.high
			forecastedTimestamp = new Date(tomorrow.time).getTime()
		} else {
			forecastedHigh = today.high
			forecastedTimestamp = new Date(today.time).getTime()
		}
	}

	if (json.sun) {
		const [rh, rm] = json.sun.rise
		const [sh, sm] = json.sun.set
		const date = new Date()

		date.setHours(rh, rm, 0, 0)
		sunrise = date.getTime()

		date.setHours(sh, sm, 0, 0)
		sunset = date.getTime()

		suntime(sunrise, sunset)
	}

	return {
		timestamp: Date.now(),
		forecasted_timestamp: forecastedTimestamp,
		forecasted_high: forecastedHigh,
		description,
		feels_like: feels,
		icon_id: icon,
		sunrise,
		sunset,
		temp,
		link: json.meta.url ?? '',
		approximation: {
			ccode: json?.geo?.country,
			city: json?.geo?.city,
			lat: json?.geo?.lat,
			lon: json?.geo?.lon,
		},
	}
}

async function firstStartWeather(data: Weather) {
	const currentWeather = await requestNewWeather(data)

	if (currentWeather) {
		data.city = currentWeather.approximation?.city ?? tradThis('City')

		storage.sync.set({ weather: data })
		storage.local.set({ lastWeather: currentWeather })

		displayWeather(data, currentWeather)
		setTimeout(() => handleGeolOption(data), 400)
	}
}

export async function getGeolocation(type: Weather['geolocation']): Promise<Coords | undefined> {
	//
	const location = { lat: 0, lon: 0 }

	if (type === 'precise') {
		await new Promise(resolve =>
			navigator.geolocation.getCurrentPosition(
				geo => {
					location.lat = geo.coords.latitude
					location.lon = geo.coords.longitude
					resolve(true)
				},
				() => {
					resolve(false)
				},
			),
		)
	}

	return location.lat !== 0 && location.lon !== 0 ? location : undefined
}
