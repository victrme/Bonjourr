import onSettingsLoad from '../../utils/onsettingsload'
import suntime from '../../utils/suntime'
import storage from '../../storage'

import { weatherCacheControl } from './request'
import { handleGeolOption } from './settings'
import { weatherUpdate } from './settings'

export type Weather = Weather.Sync
export type LastWeather = Weather.Local
export type Coords = { lat: number; lon: number }
export type MeteoGeo = { name: string; detail: string }[]

export type WeatherInit = {
	sync: Sync.Storage
	lastWeather?: Weather.Local
}

export type WeatherUpdate = {
	forecast?: string
	moreinfo?: string
	provider?: string
	units?: string
	geol?: string
	city?: true
	temp?: string
	unhide?: true
	suggestions?: Event
}

let pollingInterval = 0

export default function weather(init?: WeatherInit, update?: WeatherUpdate) {
	if (update) {
		weatherUpdate(update)
		return
	}

	if (init && !(init.sync?.weatherdesc && init.sync?.weathericon)) {
		weatherCacheControl(init.sync.weather, init.lastWeather)
	}

	if (init) {
		onSettingsLoad(() => {
			handleGeolOption(init.sync.weather)
		})

		queueMicrotask(() => {
			clearInterval(pollingInterval)

			pollingInterval = setInterval(async () => {
				const sync = await storage.sync.get(['weather', 'hide'])
				const local = await storage.local.get('lastWeather')
				weatherCacheControl(sync.weather, local.lastWeather)
			}, 1200000) // 20min
		})
	}
}

export function getSunsetHour(): number {
	const d = new Date()
	d.setHours(Math.round(suntime().sunset / 60))
	return d.getHours()
}
