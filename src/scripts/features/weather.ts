import { stringMaxSize, handleGeolOption } from '../utils'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errorMessage'
import sunTime from '../utils/suntime'
import storage from '../storage'

import { Sync, Weather } from '../types/sync'
import { OWMCurrent, OWMForecast } from '../types/openweathermap'

type GeolAPI = {
	city: string
	latitude: string
	longitude: string
	country: { code: string }
}

type WeatherUpdate = {
	forecast?: string
	moreinfo?: string
	provider?: string
	units?: boolean
	geol?: boolean
	city?: string
	temp?: string
	unhide?: true
}

// Checks every 5 minutes if weather needs update
setInterval(async () => {
	if (navigator.onLine) {
		const data = await storage.get(['weather', 'hide'])
		if (data) weather(data as Sync)
	}
}, 300000)

export default function weather(init: Sync | null, update?: WeatherUpdate) {
	if (update) {
		updatesWeather(update)
		return
	}

	if (init && (!init.hide?.weatherdesc || !init.hide?.weathericon)) {
		try {
			forecastVisibilityControl(init.weather.forecast)
			weatherCacheControl(init.weather)
		} catch (e) {
			errorMessage(e)
		}
	}
}

async function updatesWeather(update: WeatherUpdate) {
	let { weather, hide } = (await storage.get(['weather', 'hide'])) as Sync

	if (!weather || !hide) {
		return
	}

	if (update.units !== undefined) {
		weather.unit = update.units ? 'imperial' : 'metric'
		weather = await request(weather)
	}

	if (update.forecast) {
		weather.forecast = update.forecast
		forecastVisibilityControl(update.forecast)
	}

	if (update.temp) {
		weather.temperature = update.temp ?? 'actual'
	}

	if (update.provider) {
		weather.provider = update.provider
	}

	if (update.moreinfo) {
		const providerdom = document.getElementById('weather_provider')
		providerdom?.classList.toggle('shown', update.moreinfo === 'custom')
		weather.moreinfo = update.moreinfo
	}

	if (update.unhide) {
		const { weatherdesc, weathericon } = hide || {}
		if (weatherdesc && weathericon) {
			forecastVisibilityControl(weather.forecast)
			weatherCacheControl(weather)
		}
	}

	if (update.city) {
		const i_city = document.getElementById('i_city') as HTMLInputElement
		const i_ccode = document.getElementById('i_ccode') as HTMLInputElement

		if (update.city.length < 3 || !navigator.onLine) {
			return false
		}

		i_city.classList.add('loads')
		weather.ccode = i_ccode.value
		weather.city = stringMaxSize(update.city, 64)

		weather = await request(weather)

		i_city.value = ''
		i_city.blur()
		i_city.classList.remove('loads')
		i_city.setAttribute('placeholder', weather.city)
	}

	if (update.geol !== undefined) {
		const i_geol = document.getElementById('i_geol') as HTMLInputElement

		if (!update.geol || !i_geol) {
			weather.location = []
			weather = await request(weather)
			handleGeolOption(weather)
		} else {
			const location = await getGeolocation()

			if (location) {
				weather.location = location
				weather = await request(weather)
				handleGeolOption(weather)
			} else {
				i_geol.checked = true
				setTimeout(() => handleGeolOption(weather), 300)
			}
		}
	}

	storage.set({ weather })
	displayWeather(weather)
}

async function getGeolocation(): Promise<[number, number] | undefined> {
	const location: [number, number] | undefined = await new Promise((resolve) =>
		navigator.geolocation.getCurrentPosition(
			(geo) => resolve([geo.coords.latitude, geo.coords.longitude]),
			() => resolve(undefined)
		)
	)

	return location
}

function createRequestQueries(data: Weather) {
	const apis = ['@@WEATHER_1', '@@WEATHER_2', '@@WEATHER_3', '@@WEATHER_4']
	const key = apis[Math.ceil(Math.random() * 4) - 1]
	const isGeolocated = data.location?.length === 2
	let lang = document.documentElement.getAttribute('lang')
	let queries = ''

	// Openweathermap country code for traditional chinese is tw, greek is el
	if (lang === 'zh_HK') lang = 'zh_TW'
	if (lang === 'gr') lang = 'el'

	queries += '?units=' + (data.unit ?? 'metric')
	queries += '&lang=' + lang

	if (isGeolocated) {
		queries += '&lat=' + data.location[0]
		queries += '&lon=' + data.location[1]
	} else {
		queries += '&q=' + encodeURI(data.city ?? 'Paris')
		queries += ',' + data.ccode ?? 'fr'
	}

	queries += '&appid=' + atob(key)

	return queries
}

async function request(data: Weather): Promise<Weather> {
	if (!navigator.onLine) {
		return data
	}

	let current: OWMCurrent
	let forecast: OWMForecast
	const queries = createRequestQueries(data)

	current = await (await fetch(`https://api.openweathermap.org/data/2.5/weather/${queries}`)).json()
	if (current?.cod !== 200) return data

	forecast = await (await fetch(`https://api.openweathermap.org/data/2.5/forecast/${queries}`)).json()
	if (forecast?.cod !== '200') return data

	//
	// Current API call
	//

	const { temp, feels_like, temp_max } = current.main
	const { sunrise, sunset } = current.sys
	const { description, id } = current.weather[0]
	const lastCall = Math.floor(new Date().getTime() / 1000)

	data = {
		...data,
		lastCall,
		lastState: {
			temp,
			feels_like,
			temp_max,
			sunrise,
			sunset,
			description,
			icon_id: id,
		},
	}

	//
	// Forecast API call
	//

	const date = new Date()
	const todayHour = date.getHours()
	let forecastDay = date.getDate()
	let maxTempFromList = -273.15

	// Late evening forecast for tomorrow
	if (todayHour > 18) {
		const tomorrow = date.setDate(date.getDate() + 1)
		forecastDay = new Date(tomorrow).getDate()
	}

	// Get the highest temp for the specified day
	forecast.list.forEach((elem: any) => {
		if (new Date(elem.dt * 1000).getDate() === forecastDay)
			maxTempFromList < elem.main.temp_max ? (maxTempFromList = elem.main.temp_max) : ''
	})

	data.fcHigh = Math.round(maxTempFromList)

	return data
}

async function initWeather(data: Weather) {
	try {
		const geol = (await (await fetch('https://geol.netlify.app/')).json()) as GeolAPI
		data.city = geol.city
		data.ccode = geol.country.code
		data.location = [parseFloat(geol.latitude), parseFloat(geol.longitude)]
	} catch (_) {
		console.warn('Cannot get geol')
		data.city = 'Paris'
		data.ccode = 'FR'
	}

	data.location = (await getGeolocation()) ?? []
	data = await request(data)

	displayWeather(data)
	storage.set({ weather: data })
	setTimeout(() => handleGeolOption(data), 400)
}

function displayWeather(data: Weather) {
	const currentState = data.lastState
	const current = document.getElementById('current')
	const forecast = document.getElementById('forecast')
	const tempContainer = document.getElementById('tempContainer')
	const weatherdom = document.getElementById('weather')
	const date = new Date()

	if (!currentState) {
		return
	}

	const handleDescription = () => {
		const desc = currentState.description
		const feels = Math.floor(currentState.feels_like)
		const actual = Math.floor(currentState.temp)

		let tempText = `${tradThis('It is currently')} ${actual}°`

		if (data.temperature === 'feelslike') {
			tempText = `${tradThis('It currently feels like')} ${feels}°`
		}

		if (data.temperature === 'both') {
			tempText = `${tradThis('It currently feels like')} ${feels}°`
		}

		const iconText = tempContainer?.querySelector('p')

		if (current && iconText) {
			current.textContent = `${desc[0].toUpperCase() + desc.slice(1)}. ${tempText}`
			iconText.textContent = actual + '°'
		}
	}

	const handleWidget = () => {
		let filename = 'lightrain'
		const categorieIds: [number[], string][] = [
			[[200, 201, 202, 210, 211, 212, 221, 230, 231, 232], 'thunderstorm'],
			[[300, 301, 302, 310], 'lightdrizzle'],
			[[312, 313, 314, 321], 'showerdrizzle'],
			[[500, 501, 502, 503], 'lightrain'],
			[[504, 520, 521, 522], 'showerrain'],
			[[511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], 'snow'],
			[[701, 711, 721, 731, 741, 751, 761, 762, 771, 781], 'mist'],
			[[800], 'clearsky'],
			[[801], 'fewclouds'],
			[[802], 'brokenclouds'],
			[[803, 804], 'overcastclouds'],
		]

		categorieIds.forEach((category) => {
			if (category[0].includes(currentState.icon_id as never)) filename = category[1]
		})

		if (!tempContainer) {
			return
		}

		const icon = document.getElementById('weather-icon') as HTMLImageElement
		const { now, rise, set } = sunTime()
		const timeOfDay = now < rise || now > set ? 'night' : 'day'
		const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

		icon.src = iconSrc
	}

	const handleForecast = () => {
		if (forecast) {
			let day = tradThis(date.getHours() > 21 ? 'tomorrow' : 'today')
			day = day !== '' ? ' ' + day : '' // Only day change on translations that support it

			forecast.textContent = `${tradThis('with a high of')} ${data.fcHigh}°${day}.`
			forecast.classList.remove('wait')
		}
	}

	const handleMoreInfo = () => {
		const noDetails = !data.moreinfo || data.moreinfo === 'none'
		const emptyCustom = data.moreinfo === 'custom' && !data.provider

		if (noDetails || emptyCustom) {
			weatherdom?.removeAttribute('href')
			return
		}

		const URLs = {
			msnw: 'https://www.msn.com/en-us/weather/forecast/',
			yhw: 'https://www.yahoo.com/news/weather/',
			windy: 'https://www.windy.com/',
			custom: data.provider ?? '',
		}

		if ((data.moreinfo || '') in URLs) {
			weatherdom?.setAttribute('href', URLs[data.moreinfo as keyof typeof URLs])
		}
	}

	handleWidget()
	handleDescription()
	handleForecast()
	handleMoreInfo()

	current?.classList.remove('wait')
	tempContainer?.classList.remove('wait')
}

async function weatherCacheControl(data: Weather) {
	if (typeof data.lastCall !== 'number') {
		initWeather(data)
		return
	}

	const now = Math.floor(new Date().getTime() / 1000)
	const isThirtyMinutesLater = now > data.lastCall + 1800
	const hasGeol = data.location.length > 2

	if (navigator.onLine && isThirtyMinutesLater) {
		if (hasGeol) {
			data.location = (await getGeolocation()) ?? data.location
		}

		data = await request(data)
		storage.set({ weather: data })
	}

	displayWeather(data)
}

function forecastVisibilityControl(value: string = 'auto') {
	const forcastdom = document.getElementById('forecast')
	const date = new Date()
	let isTimeForForecast = false

	if (value === 'auto') isTimeForForecast = date.getHours() < 12 || date.getHours() > 21
	else isTimeForForecast = value === 'always'

	forcastdom?.classList.toggle('shown', isTimeForForecast)
}
