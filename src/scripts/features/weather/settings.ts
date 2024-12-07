import storage from '../../storage'
import debounce from '../../utils/debounce'
import networkForm from '../../utils/networkform'
import { tradThis } from '../../utils/translations'
import onSettingsLoad from '../../utils/onsettingsload'
import { stringMaxSize } from '../../utils'

import { weatherCacheControl, requestNewWeather, getGeolocation } from './request'
import type { Weather, WeatherUpdate, MeteoGeo, LastWeather } from './index'
import { displayWeather } from './display'

const locationForm = networkForm('f_location')
const unitForm = networkForm('f_units')
const geolForm = networkForm('f_geol')
const suggestionsDebounce = debounce(fillLocationSuggestions, 600)

export async function weatherUpdate(update: WeatherUpdate) {
	const { weather, hide } = await storage.sync.get(['weather', 'hide'])
	let lastWeather = (await storage.local.get('lastWeather')).lastWeather

	if (!weather || !hide) {
		return
	}

	if (isUnits(update.units)) {
		unitForm.load()
		weather.unit = update.units
		lastWeather = (await requestNewWeather(weather, lastWeather)) ?? lastWeather
		unitForm.accept()
	}

	if (isForecast(update.forecast)) {
		weather.forecast = update.forecast
	}

	if (isTemperature(update.temp)) {
		weather.temperature = update.temp
	}

	if (isMoreinfo(update.moreinfo)) {
		const providerdom = document.getElementById('weather_provider')
		providerdom?.classList.toggle('shown', update.moreinfo === 'custom')
		weather.moreinfo = update.moreinfo
	}

	if (update.provider) {
		weather.provider = update.provider
	}

	if (update.unhide) {
		const { weatherdesc, weathericon } = hide || {}
		if (weatherdesc && weathericon) {
			weatherCacheControl(weather)
		}
	}

	if (update.suggestions) {
		updateSuggestions(update.suggestions)
		return
	}

	if (update.city) {
		updateManualLocation(weather, lastWeather)
		return
	}

	if (update.geol) {
		updateGeolocation(update.geol, weather, lastWeather)
		return
	}

	storage.sync.set({ weather })
	onSettingsLoad(() => handleGeolOption(weather))

	if (lastWeather) {
		storage.local.set({ lastWeather })
		displayWeather(weather, lastWeather)
	}
}

async function updateManualLocation(weather: Weather, lastWeather?: LastWeather) {
	const i_city = document.getElementById('i_city') as HTMLInputElement
	let city = i_city.value

	removeLocationSuggestions()

	if (!navigator.onLine) {
		locationForm.warn(tradThis('No internet connection'))
		return false
	}

	if (city === weather.city) {
		return
	}

	city = stringMaxSize(city, 64)
	locationForm.load()

	// don't mutate weather data before confirming that the city exists
	const currentWeather = { ...weather, city }
	const newWeather = await requestNewWeather(currentWeather, lastWeather)
	const newCity = newWeather?.approximation?.city

	const sanitizeName = (str = '') => str?.toLowerCase().replaceAll('-', ' ')
	const foundCityIsSame = newCity === '' || sanitizeName(city).includes(sanitizeName(newCity))

	if (!newWeather) {
		locationForm.warn(tradThis('Cannot reach weather service'))
		return
	}

	if (!foundCityIsSame) {
		locationForm.warn(tradThis('Cannot find correct city'))
		return
	}

	if (newWeather) {
		lastWeather = newWeather
		weather.city = city ?? 'Paris'
		locationForm.accept('i_city', weather.city)
	}

	storage.sync.set({ weather })
	storage.local.set({ lastWeather })

	if (lastWeather) {
		displayWeather(weather, lastWeather)
	}
}

async function updateGeolocation(geol: string, weather: Weather, lastWeather?: LastWeather) {
	geolForm.load()

	// Don't update if precise geolocation fails
	if (geol === 'precise') {
		if (!(await getGeolocation('precise'))) {
			geolForm.warn('Cannot get precise location')
			return
		}
	}

	if (isGeolocation(geol)) {
		weather.geolocation = geol
	}

	lastWeather = (await requestNewWeather(weather, lastWeather)) ?? lastWeather

	geolForm.accept()
	handleGeolOption(weather)

	storage.sync.set({ weather })

	if (lastWeather) {
		storage.local.set({ lastWeather })
		displayWeather(weather, lastWeather)
	}
}

export function handleGeolOption(data: Weather) {
	const i_city = document.querySelector<HTMLInputElement>('#i_city')
	const i_geol = document.querySelector<HTMLInputElement>('#i_geol')

	if (i_city && i_geol) {
		i_geol.value = data?.geolocation ?? false
		i_city.setAttribute('placeholder', data.city ?? 'Paris')
		document.getElementById('location_options')?.classList.toggle('shown', data.geolocation === 'off')
	}
}

// Location suggestions

function updateSuggestions(updateEvent: Event) {
	const f_location = document.querySelector<HTMLFormElement>('#f_location')
	const i_city = document.querySelector<HTMLInputElement>('#i_city')
	const event = updateEvent as InputEvent

	if (!f_location || !i_city) {
		return
	}

	if (event.data !== undefined) {
		f_location?.classList.toggle('valid', i_city.value.length > 2)
		removeLocationSuggestions()
		suggestionsDebounce()
	}
}

function removeLocationSuggestions() {
	const dl_cityfound = document.querySelector<HTMLDataListElement>('#dl_cityfound')
	dl_cityfound?.childNodes.forEach((node) => node.remove())
}

async function fillLocationSuggestions() {
	const dl_cityfound = document.querySelector<HTMLDataListElement>('#dl_cityfound')
	const i_city = document.getElementById('i_city') as HTMLInputElement
	const city = i_city.value

	if (city === '') {
		removeLocationSuggestions()
		return
	}

	const url = new URL('https://weather.bonjourr.fr/')
	url.searchParams.set('provider', 'accuweather')
	url.searchParams.set('data', 'simple')
	url.searchParams.set('geo', 'true')
	url.searchParams.set('query', encodeURIComponent(city))

	const resp = await fetch(url)

	removeLocationSuggestions()

	if (resp.status === 200) {
		const json = (await resp.json()) as MeteoGeo

		for (const { detail } of json) {
			const option = document.createElement('option')
			option.value = detail
			option.textContent = detail
			dl_cityfound?.appendChild(option)
		}
	}
}

// Type check

function isUnits(str = ''): str is Weather.Unit {
	const units: Weather.Unit[] = ['metric', 'imperial']
	return units.includes(str as Weather.Unit)
}

function isForecast(str = ''): str is Weather.Forecast {
	const forecasts: Weather.Forecast[] = ['auto', 'always', 'never']
	return forecasts.includes(str as Weather.Forecast)
}

function isMoreinfo(str = ''): str is Weather.MoreInfo {
	const moreinfos: Weather.MoreInfo[] = ['none', 'msnw', 'yhw', 'windy', 'accu', 'custom']
	return moreinfos.includes(str as Weather.MoreInfo)
}

function isTemperature(str = ''): str is Weather.Temperature {
	const temps: Weather.Temperature[] = ['actual', 'feelslike', 'both']
	return temps.includes(str as Weather.Temperature)
}

function isGeolocation(str = ''): str is Weather.Geolocation {
	const geol: Weather.Geolocation[] = ['precise', 'approximate', 'off']
	return geol.includes(str as Weather.Geolocation)
}
