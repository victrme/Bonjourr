import storage from '../../storage'
import suntime from '../../utils/suntime'
import { weatherFetch } from '../../utils'
import { tradThis, getLang } from '../../utils/translations'

import { getSunsetHour } from './index'
import { handleGeolOption } from './settings'
import { handleForecastDisplay, displayWeather } from './display'

import type { Weather, LastWeather, Coords } from './index'

export async function weatherCacheControl(data: Weather, lastWeather?: LastWeather) {
	handleForecastDisplay(data.forecast)

	if (!lastWeather) {
		firstStartWeather(data)
		return
	}

	const now = new Date().getTime()
	const last = lastWeather?.timestamp ?? 0
	const isAnHourLater = now > last + 3600000

	if (navigator.onLine && isAnHourLater) {
		const newWeather = await requestNewWeather(data, lastWeather)

		if (newWeather) {
			lastWeather = newWeather
			storage.local.set({ lastWeather })
		}
	}

	displayWeather(data, lastWeather)
}

export async function requestNewWeather(data: Weather, lastWeather?: LastWeather): Promise<LastWeather | undefined> {
	if (!navigator.onLine) {
		return lastWeather
	}

	let coords = await getGeolocation(data.geolocation)
	let query = '?provider=auto&data=simple'

	query += '&units=' + (data.unit ?? 'metric')
	query += '&lang=' + getLang()

	if (coords && coords.lat && coords.lon) {
		query += '&lat=' + coords.lat
		query += '&lon=' + coords.lon
	}

	if (data.geolocation === 'off' && !coords) {
		const city = data.city ?? 'Paris'
		const q = encodeURIComponent(city)

		query += '&q=' + q
	}

	const response = await weatherFetch(query)
	const json: Weather.SimpleWeather = await response?.json()

	if (!json) {
		return lastWeather
	}

	let [sunset, sunrise] = [0, 0]
	const { temp, feels } = json.now
	const { description, icon } = json.now

	let forecasted_high = lastWeather?.forecasted_high ?? -273.15
	let forecasted_timestamp = lastWeather?.forecasted_timestamp ?? 0

	if (json.daily) {
		const [today, tomorrow] = json.daily
		const date = new Date()

		if (date.getHours() > getSunsetHour()) {
			forecasted_high = tomorrow.high
			forecasted_timestamp = new Date(tomorrow.time).getTime()
		} else {
			forecasted_high = today.high
			forecasted_timestamp = new Date(today.time).getTime()
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
		timestamp: new Date().getTime(),
		forecasted_timestamp,
		forecasted_high,
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
		await new Promise((resolve) =>
			navigator.geolocation.getCurrentPosition(
				(geo) => {
					location.lat = geo.coords.latitude
					location.lon = geo.coords.longitude
					resolve(true)
				},
				() => {
					resolve(false)
				}
			)
		)
	}

	return location.lat !== 0 && location.lon !== 0 ? location : undefined
}
