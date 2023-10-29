import { stringMaxSize } from '../utils'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errormessage'
import superinput from '../utils/superinput'
import sunTime from '../utils/suntime'
import storage from '../storage'

import { Sync, Weather } from '../types/sync'
import { OWMOnecall } from '../types/openweathermap'
import onSettingsLoad from '../utils/onsettingsload'
import parse from '../utils/parse'

type Coords = {
	lat: number
	lon: number
}

type CityGeo = {
	city: string
	lat: number
	lon: number
}

type WeatherUpdate = {
	forecast?: string
	moreinfo?: string
	provider?: string
	units?: boolean
	geol?: string
	city?: string
	temp?: string
	unhide?: true
}

const cityInput = superinput('i_city')

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

	if (init) {
		onSettingsLoad(() => {
			handleGeolOption(init.weather)
			setInterval(async () => {
				if (!navigator.onLine) {
					weather(await storage.sync.get(['weather', 'hide']))
				}
			}, 300000)
		})
	}
}

async function updatesWeather(update: WeatherUpdate) {
	let { weather, hide } = (await storage.sync.get(['weather', 'hide'])) as Sync

	if (!weather || !hide) {
		return
	}

	if (update.units !== undefined) {
		weather.unit = update.units ? 'imperial' : 'metric'
		weather = (await request(weather)) ?? weather
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
		if (!navigator.onLine) {
			cityInput.warn('No internet connection')
			return false
		}

		if (update.city === weather.city) {
			return
		}

		const i_city = document.getElementById('i_city') as HTMLInputElement
		const i_ccode = document.getElementById('i_ccode') as HTMLInputElement

		update.city = stringMaxSize(update.city, 64)
		cityInput.load()

		const response = await request({
			...weather,
			ccode: i_ccode.value,
			city: update.city,
		})

		if (response) {
			weather = response
			i_city.setAttribute('placeholder', weather.city ?? tradThis('City'))
			cityInput.toggle(false)
		} else {
			cityInput.warn('Cannot find city')
		}
	}

	if (update.geol) {
		weather.geolocation = update.geol as Weather['geolocation']
		const newdata = await request(weather)
		weather = newdata ?? weather
	}

	storage.sync.set({ weather })
	handleGeolOption(weather)
	displayWeather(weather)
}

async function getGeolocation(type: Weather['geolocation']): Promise<Coords | undefined> {
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

function handleGeolOption(data: Weather) {
	const i_city = document.getElementById('i_city') as HTMLInputElement
	const i_geol = document.getElementById('i_geol') as HTMLInputElement
	const i_ccode = document.getElementById('i_ccode') as HTMLInputElement
	const sett_city = document.getElementById('sett_city') as HTMLDivElement

	i_geol.value = data.geolocation
	i_ccode.value = data.ccode ?? 'FR'
	i_city.setAttribute('placeholder', data.city ?? tradThis('City'))
	sett_city.classList.toggle('shown', data.geolocation === 'off')
}

function createRequestQueries(data: Weather, coords?: Coords) {
	let lang = document.documentElement.getAttribute('lang')
	let queries = ''

	// Openweathermap country code for traditional chinese is tw, greek is el
	if (lang === 'zh_HK') lang = 'zh_TW'
	if (lang === 'gr') lang = 'el'

	queries += '?units=' + (data.unit ?? 'metric')
	queries += '&lang=' + lang

	if (coords) {
		queries += '&lat=' + coords.lat
		queries += '&lon=' + coords.lon
	}

	if (!coords && data.geolocation === 'off') {
		queries += '&q=' + encodeURI(data.city ?? 'Paris')
		queries += ',' + data.ccode ?? 'fr'
	}

	return queries
}

async function request(data: Weather): Promise<Weather | null> {
	if (!navigator.onLine) {
		return data
	}

	let onecall: OWMOnecall
	const coords = await getGeolocation(data.geolocation)
	const queries = createRequestQueries(data, coords)
	const response = await fetch('https://api.bonjourr.lol/weather/' + queries)

	if (response.status === 200) {
		try {
			onecall = await response.json()
		} catch (error) {
			console.log(error)
			return data
		}
	} else {
		return data
	}

	const { temp, feels_like, sunrise, sunset } = onecall.current
	const { description, id } = onecall.current.weather[0]

	const lastCall = Math.floor(new Date().getTime() / 1000)

	if (data.geolocation === 'approximate' && !data.ccode && !data.city) {
		data.city = onecall.city
		data.ccode = onecall.ccode
	}

	data = {
		...data,
		lastCall,
		lastState: {
			temp,
			feels_like,
			sunrise,
			sunset,
			description,
			icon_id: id,
		},
	}

	let date = new Date()

	// Late evening forecast for tomorrow
	if (date.getHours() > 21) {
		date.setDate(date.getDate() + 1)
	}

	// Get the highest temp for the specified day
	let maxTempFromList = -273.15
	for (const elem of onecall.hourly) {
		if (new Date(elem.dt * 1000).getDate() === date.getDate() && maxTempFromList < elem.temp) {
			maxTempFromList = elem.temp
		}
	}

	date.setHours(21)
	date.setMinutes(0)
	date.setSeconds(0)

	data.fcLast = Math.floor(date.getTime() / 1000)
	data.fcHigh = Math.round(maxTempFromList)

	return data
}

async function initWeather(data: Weather) {
	const newdata = await request(data)

	if (newdata) {
		displayWeather(newdata)
		storage.sync.set({ weather: newdata })
		setTimeout(() => handleGeolOption(newdata), 400)
	}
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

	const now = new Date()
	const currentTime = Math.floor(now.getTime() / 1000)
	const isAnHourLater = currentTime > data.lastCall + 3600

	if (navigator.onLine && isAnHourLater) {
		const newdata = await request(data)

		if (newdata) {
			data = newdata
			storage.sync.set({ weather: newdata })
		}
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
