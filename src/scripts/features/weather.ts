import { stringMaxSize, apiFetch, minutator } from '../utils'
import { tradThis, getLang } from '../utils/translations'
import onSettingsLoad from '../utils/onsettingsload'
import networkForm from '../utils/networkform'
import suntime from '../utils/suntime'
import storage from '../storage'

type Weather = Weather.Sync

type LastWeather = Weather.Local

type Coords = { lat: number; lon: number }

type WeatherInit = {
	sync: Sync.Storage
	lastWeather?: Weather.Local
}

type WeatherUpdate = {
	forecast?: string
	moreinfo?: string
	provider?: string
	units?: string
	geol?: string
	city?: true
	temp?: string
	unhide?: true
}

let pollingInterval = 0
const locationForm = networkForm('f_location')
const unitForm = networkForm('f_units')
const geolForm = networkForm('f_geol')

export default function weather(init?: WeatherInit, update?: WeatherUpdate) {
	if (update) {
		updatesWeather(update)
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

async function updatesWeather(update: WeatherUpdate) {
	const { weather, hide } = await storage.sync.get(['weather', 'hide'])
	let lastWeather = (await storage.local.get('lastWeather')).lastWeather

	if (!weather || !hide) {
		return
	}

	if (isUnits(update.units)) {
		unitForm.load()
		weather.unit = update.units
		lastWeather = (await request(weather, lastWeather)) ?? lastWeather
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

	if (update.city) {
		const i_city = document.getElementById('i_city') as HTMLInputElement
		const i_ccode = document.getElementById('i_ccode') as HTMLInputElement
		const ccode = i_ccode.value
		let city = i_city.value

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
		const currentWeather = { ...weather, ccode, city }
		const newWeather = await request(currentWeather, lastWeather)
		const newCity = newWeather?.approximation?.city
		const foundCityIsDifferent = newCity !== '' && newCity !== city

		if (!newWeather) {
			locationForm.warn(tradThis('Cannot reach weather service'))
			return
		}

		if (foundCityIsDifferent) {
			locationForm.warn(tradThis('Cannot find correct city'))
			return
		}

		if (newWeather) {
			lastWeather = newWeather
			weather.ccode = (lastWeather.approximation?.ccode || i_ccode.value) ?? 'FR'
			weather.city = (lastWeather.approximation?.city || city) ?? 'Paris'

			locationForm.accept('i_city', weather.city ?? tradThis('City'))
			i_city.dispatchEvent(new KeyboardEvent('input'))
		}
	}

	if (update.geol) {
		geolForm.load()

		// Don't update if precise geolocation fails
		if (update.geol === 'precise') {
			if (!(await getGeolocation('precise'))) {
				geolForm.warn('Cannot get precise location')
				return
			}
		}

		if (isGeolocation(update.geol)) {
			weather.geolocation = update.geol
		}

		lastWeather = (await request(weather, lastWeather)) ?? lastWeather

		geolForm.accept()
	}

	storage.sync.set({ weather })
	onSettingsLoad(() => handleGeolOption(weather))

	if (lastWeather) {
		storage.local.set({ lastWeather })
		displayWeather(weather, lastWeather)
	}
}

async function weatherCacheControl(data: Weather, lastWeather?: LastWeather) {
	handleForecastDisplay(data.forecast)

	if (!lastWeather) {
		initWeather(data)
		return
	}

	const date = new Date()
	const now = date.getTime()

	const isAnHourLater = Math.floor(now / 1000) > (lastWeather?.timestamp ?? 0) + 3600

	if (navigator.onLine && isAnHourLater) {
		const newWeather = await request(data, lastWeather)

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
	const i_city = document.querySelector<HTMLInputElement>('#i_city')
	const i_geol = document.querySelector<HTMLInputElement>('#i_geol')
	const i_ccode = document.querySelector<HTMLInputElement>('#i_ccode')

	if (i_ccode && i_city && i_geol) {
		i_geol.value = data?.geolocation ?? false
		i_ccode.value = data.ccode ?? 'FR'
		i_city.setAttribute('placeholder', data.city ?? 'Paris')
		document.getElementById('location_options')?.classList.toggle('shown', data.geolocation === 'off')
	}
}

async function request(data: Weather, lastWeather?: LastWeather): Promise<LastWeather | undefined> {
	if (!navigator.onLine) return lastWeather

	const isKeepingCity = data.geolocation === 'off' && lastWeather?.approximation?.city === data.city
	let coords = await getGeolocation(data.geolocation)
	let queries = '?provider=accuweather'
	const lang = getLang()

	queries += '&units=' + (data.unit ?? 'metric')
	queries += '&lang=' + lang

	if (data.geolocation === 'off' && isKeepingCity && lastWeather?.approximation) {
		coords = { lat: lastWeather.approximation.lat, lon: lastWeather.approximation.lon }
	}

	if (coords) {
		queries += '&lat=' + coords.lat
		queries += '&lon=' + coords.lon
	}

	if (data.geolocation === 'off' && !coords) {
		queries += '&q=' + encodeURI(data.city ?? 'Paris')
		queries += ',' + (data.ccode ?? 'FR')
	}

	const response = await apiFetch('/weather/' + queries)
	const onecall: Weather.Onecall | undefined = await response?.json()
	const isRateLimited = response?.status === 429

	if (isRateLimited && lastWeather) {
		lastWeather.timestamp = Date.now() - 3000000 // 45min
		return lastWeather
	}

	if (!onecall) {
		return lastWeather
	}

	const { temp, feels_like, sunrise, sunset } = onecall.current
	const { description, id } = onecall.current.weather[0]
	let forecasted_high = lastWeather?.forecasted_high ?? -273.15
	let forecasted_timestamp = lastWeather?.forecasted_timestamp ?? 0

	if (onecall.hourly) {
		const date = new Date()
		const alltemps: number[] = []

		if (date.getHours() > getSunsetHour()) {
			date.setDate(date.getDate() + 1)
		}

		for (const item of onecall.hourly) {
			if (new Date(item.dt * 1000).getDate() === date.getDate()) {
				alltemps.push(item.temp)
			}
		}

		date.setHours(0, 0, 0, 0)
		forecasted_timestamp = Math.floor(date.getTime() / 1000)
		forecasted_high = Math.round(Math.max(...alltemps))
	}

	suntime(sunrise, sunset)

	return {
		timestamp: Math.floor(new Date().getTime() / 1000),
		forecasted_timestamp,
		forecasted_high,
		description,
		feels_like,
		icon_id: id,
		sunrise,
		sunset,
		temp,
		link: onecall.link ?? '',
		approximation: {
			ccode: isKeepingCity ? lastWeather?.approximation?.ccode : onecall?.ccode,
			city: isKeepingCity ? lastWeather?.approximation?.city : onecall?.city,
			lat: onecall.lat,
			lon: onecall.lon,
		},
	}
}

function displayWeather(data: Weather, lastWeather: LastWeather) {
	const useSinograms = getLang().includes('zh') || getLang().includes('ja')
	const currentDesc = document.getElementById('current-desc')
	const currentTemp = document.getElementById('current-temp')
	const tempContainer = document.getElementById('tempContainer')
	const weatherdom = document.getElementById('weather')
	const dot = useSinograms ? '。' : '. '
	const date = new Date()

	const handleDescription = () => {
		const feels = Math.floor(lastWeather.feels_like)
		const actual = Math.floor(lastWeather.temp)
		const maintemp = data.temperature === 'feelslike' ? feels : actual
		let tempReport = ''

		if (data.temperature === 'actual') tempReport = tradThis('It is currently <temp1>°')
		if (data.temperature === 'feelslike') tempReport = tradThis('It currently feels like <temp2>°')
		if (data.temperature === 'both') tempReport = tradThis('It is currently <temp1>° and feels like <temp2>°')

		const iconText = tempContainer?.querySelector('p')
		const weatherReport = lastWeather.description[0].toUpperCase() + lastWeather.description.slice(1)

		tempReport = tempReport.replace('<temp1>', actual.toString())
		tempReport = tempReport.replace('<temp2>', feels.toString())

		if (currentDesc && currentTemp && iconText) {
			currentDesc.textContent = weatherReport + dot
			currentTemp.textContent = tempReport
			iconText.textContent = `${maintemp}°`
		}
	}

	const handleWidget = () => {
		let condition = 'fewclouds'

		for (const [name, codes] of Object.entries(accuweatherConditions)) {
			if (codes.includes(lastWeather.icon_id)) {
				condition = name
			}
		}

		if (!tempContainer) {
			return
		}

		const now = minutator(new Date())
		const { sunrise, sunset } = suntime()
		const daytime = now < sunrise || now > sunset ? 'night' : 'day'

		const icon = document.getElementById('weather-icon') as HTMLImageElement
		icon.dataset.daytime = daytime
		icon.dataset.condition = condition
	}

	const handleForecastData = () => {
		const forecastdom = document.getElementById('forecast')
		const day = date.getHours() > getSunsetHour() ? 'tomorrow' : 'today'
		let string = ''

		if (day === 'today') string = tradThis('with a high of <temp1>° today')
		if (day === 'tomorrow') string = tradThis('with a high of <temp1>° tomorrow')

		string = string.replace('<temp1>', lastWeather.forecasted_high.toString())
		string = string + dot

		if (forecastdom) {
			forecastdom.textContent = string
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
			accu: lastWeather.link ?? 'https://www.accuweather.com/',
			msnw: tradThis('https://www.msn.com/en-xl/weather/forecast/'),
			yhw: 'https://www.yahoo.com/news/weather/',
			windy: 'https://www.windy.com/',
			custom: data.provider ?? '',
		}

		if ((data.moreinfo || '') in URLs) {
			weatherdom?.setAttribute('href', URLs[data.moreinfo as keyof typeof URLs])
		}
	}

	handleForecastDisplay(data.forecast)
	handleWidget()
	handleMoreInfo()
	handleDescription()
	handleForecastData()

	weatherdom?.classList.remove('wait')
}

function handleForecastDisplay(forecast: string) {
	const date = new Date()
	const morningOrLateDay = date.getHours() < 12 || date.getHours() > getSunsetHour()
	const isTimeForForecast = forecast === 'auto' ? morningOrLateDay : forecast === 'always'

	if (isTimeForForecast && !document.getElementById('forecast')) {
		const p = document.createElement('p')
		p.id = 'forecast'
		document.getElementById('description')?.appendChild(p)
	}

	if (!isTimeForForecast) {
		document.querySelector('#forecast')?.remove()
	}
}

// Helpers

function getSunsetHour(): number {
	const d = new Date()
	d.setHours(Math.round(suntime().sunset / 60))
	return d.getHours()
}

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

// const openWeatherMapConditions: Record<Weather.Conditions, number[]> = {
// 	clearsky: [800],
// 	fewclouds: [801],
// 	brokenclouds: [802],
// 	overcastclouds: [803, 804],
// 	sunnyrain: [500, 501, 502, 503],
// 	lightrain: [300, 301, 302, 310],
// 	rain: [312, 313, 314, 321, 504, 520, 521, 522],
// 	thunderstorm: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232],
// 	snow: [511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622],
// 	mist: [701, 711, 721, 731, 741, 751, 761, 762, 771, 781],
// }

const accuweatherConditions: Record<Weather.Conditions, number[]> = {
	clearsky: [1, 2, 33, 34],
	fewclouds: [3, 4, 5, 35, 36, 37],
	brokenclouds: [6, 7, 38],
	overcastclouds: [8],
	sunnyrain: [14, 17],
	lightrain: [12, 13, 39],
	rain: [18, 19, 29, 40],
	thunderstorm: [15, 16, 41, 42],
	snow: [20, 21, 22, 23, 24, 25, 26, 43, 44],
	mist: [11],
}
