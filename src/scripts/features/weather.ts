import { stringMaxSize, apiFetch } from '../utils'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errormessage'
import superinput from '../utils/superinput'
import sunTime from '../utils/suntime'
import storage from '../storage'

import { Sync, Weather } from '../types/sync'
import { LastWeather } from '../types/local'
import { OWMOnecall } from '../types/openweathermap'

type Coords = {
	lat: number
	lon: number
}

type WeatherInit = {
	sync: Sync
	lastWeather?: LastWeather
} | null

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

export default function weather(init: WeatherInit, update?: WeatherUpdate) {
	if (update) {
		updatesWeather(update)
		return
	}

	if (init && (!init.sync?.weatherdesc || !init.sync?.weathericon)) {
		try {
			weatherCacheControl(init.sync.weather, init.lastWeather)
		} catch (e) {
			errorMessage(e)
		}
	}

	if (init) {
		onSettingsLoad(() => {
			handleGeolOption(init.sync.weather)
			setInterval(async () => {
				if (!navigator.onLine) {
					weather({
						sync: await storage.sync.get(['weather', 'hide']),
						lastWeather: (await storage.local.get('lastWeather')).lastWeather,
					})
				}
			}, 300000)
		})
	}
}

async function updatesWeather(update: WeatherUpdate) {
	let { weather, hide } = (await storage.sync.get(['weather', 'hide'])) as Sync
	let lastWeather = (await storage.local.get('lastWeather')).lastWeather

	if (!weather || !hide) {
		return
	}

	if (update.units !== undefined) {
		weather.unit = update.units ? 'imperial' : 'metric'
		lastWeather = (await request(weather)) ?? lastWeather
	}

	if (update.forecast) {
		weather.forecast = update.forecast
	}

	if (update.temp) {
		weather.temperature = update.temp
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
			lastWeather = response
			i_city.setAttribute('placeholder', weather.city ?? tradThis('City'))
			cityInput.toggle(false)
		} else {
			cityInput.warn('Cannot find city')
		}
	}

	if (update.geol) {
		// Don't update if precise geolocation fails
		if (update.geol === 'precise') {
			if (!(await getGeolocation('precise'))) {
				return handleGeolOption(weather)
			}
		}

		weather.geolocation = update.geol as Weather['geolocation']
		lastWeather = (await request(weather)) ?? lastWeather
	}

	storage.sync.set({ weather })
	handleGeolOption(weather)

	if (lastWeather) {
		storage.local.set({ lastWeather })
		displayWeather(weather, lastWeather)
	}
}

async function weatherCacheControl(data: Weather, lastWeather?: LastWeather) {
	if (!lastWeather) {
		initWeather(data)
		return
	}

	const now = new Date()
	const currentTime = Math.floor(now.getTime() / 1000)
	const isAnHourLater = currentTime > lastWeather?.timestamp + 3600

	if (navigator.onLine && isAnHourLater) {
		const newWeather = await request(data)

		if (newWeather) {
			lastWeather = newWeather
			storage.local.set({ lastWeather })
		}
	}

	displayWeather(data, lastWeather)
}

async function initWeather(data: Weather) {
	const currentWeather = await request(data)

	if (currentWeather) {
		data.ccode = currentWeather.approximation?.ccode ?? 'FR'
		data.city = currentWeather.approximation?.city ?? tradThis('City')

		storage.sync.set({ weather: data })
		storage.local.set({ lastWeather: currentWeather })

		displayWeather(data, currentWeather)
		setTimeout(() => handleGeolOption(data), 400)
	}
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

async function request(data: Weather): Promise<LastWeather | undefined> {
	if (!navigator.onLine) {
		return
	}

	let onecall: OWMOnecall
	const coords = await getGeolocation(data.geolocation)
	const queries = createRequestQueries(data, coords)
	const response = await apiFetch('/weather/' + queries)

	if (response?.status === 200) {
		try {
			onecall = await response.json()
		} catch (error) {
			console.log(error)
			return
		}
	} else {
		return
	}

	const { temp, feels_like, sunrise, sunset } = onecall.current
	const { description, id } = onecall.current.weather[0]

	// Late evening forecast for tomorrow
	let date = new Date()
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

	return {
		timestamp: Math.floor(new Date().getTime() / 1000),
		forecasted_high: Math.round(maxTempFromList),
		description,
		feels_like,
		icon_id: id,
		sunrise,
		sunset,
		temp,
		approximation: {
			ccode: onecall?.ccode,
			city: onecall?.city,
			lat: onecall.lat,
			lon: onecall.lon,
		},
	}
}

function displayWeather(data: Weather, lastWeather: LastWeather) {
	const current = document.getElementById('current')
	const tempContainer = document.getElementById('tempContainer')
	const weatherdom = document.getElementById('weather')
	const date = new Date()

	const handleDescription = () => {
		const desc = lastWeather.description
		const feels = Math.floor(lastWeather.feels_like)
		const actual = Math.floor(lastWeather.temp)

		let tempText = `${tradThis('It is currently')} ${actual}°`

		if (data.temperature === 'feelslike') {
			tempText = `${tradThis('It currently feels like')} ${feels}°`
		}

		// Todo: wtf ?
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
			if (category[0].includes(lastWeather.icon_id as never)) {
				filename = category[1]
			}
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
		let day = tradThis(date.getHours() > 21 ? 'tomorrow' : 'today')
		day = day !== '' ? ' ' + day : '' // Only day change on translations that support it

		const forecast = document.createElement('p')
		forecast.textContent = `${tradThis('with a high of')} ${lastWeather.forecasted_high}°${day}.`
		forecast.id = 'forecast'

		const isLateDay = date.getHours() < 12 || date.getHours() > 21
		const isTimeForForecast = data.forecast === 'auto' ? isLateDay : data.forecast === 'always'

		document.querySelector('#forecast')?.remove()

		if (isTimeForForecast) {
			document.getElementById('description')?.appendChild(forecast)
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

	weatherdom?.classList.remove('wait')
}
