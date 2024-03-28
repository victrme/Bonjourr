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
	let { weather, hide } = await storage.sync.get(['weather', 'hide'])
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
		let ccode = i_ccode.value
		let city = i_city.value

		if (!navigator.onLine) {
			locationForm.warn('No internet connection')
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
			locationForm.warn('Cannot reach weather service')
			return
		}

		if (foundCityIsDifferent) {
			locationForm.warn('Cannot find correct city')
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

	// forecast is day old or we're above sunset time
	// [ xxxxxxxxxxx | ------ sunset xxxx | ----------- ]
	const forecast = new Date((lastWeather?.forecasted_timestamp ?? 0) * 1000)
	const forecastFromPreviousDay = forecast.getDate() !== date.getDate() && forecast.getTime() < now
	const forecastFromToday = forecast.getDate() === date.getDate()
	const aboveSunset = date.getHours() > getSunsetHour()
	const isForecastOld = forecastFromPreviousDay || (forecastFromToday && aboveSunset)

	const isCurrentOnly = isForecastOld === false
	const isAnHourLater = Math.floor(now / 1000) > (lastWeather?.timestamp ?? 0) + 3600

	if (navigator.onLine && (isAnHourLater || isForecastOld)) {
		const newWeather = await request(data, lastWeather, isCurrentOnly)

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

async function request(data: Weather, lastWeather?: LastWeather, currentOnly?: boolean): Promise<LastWeather | undefined> {
	if (!navigator.onLine) return lastWeather

	//
	// Create queries

	const isKeepingCity = data.geolocation === 'off' && lastWeather?.approximation?.city === data.city
	let coords = await getGeolocation(data.geolocation)
	let lang = getLang()
	let queries = ''

	// Openweathermap country code for traditional chinese is tw, greek is el
	if (lang === 'zh_HK') lang = 'zh_TW'
	if (lang === 'pt_PT') lang = 'pt'
	if (lang === 'es_ES') lang = 'es'
	if (lang === 'gr') lang = 'el'
	if (lang === 'jp') lang = 'ja'

	queries += '?units=' + (data.unit ?? 'metric')
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

	//
	// Fetch data

	let response: Response | undefined
	let onecall: Weather.API.Onecall | undefined
	let current: Weather.API.Current | undefined

	if (queries.includes('&lat') && lang === 'en') {
		try {
			const masterurl = `https://openweathermap.org/data/2.5/onecall${queries}&appid=439d4b804bc8187953eb36d2a8c26a02`
			response = await fetch(masterurl, { signal: AbortSignal.timeout(2000) })

			if (response.status === 200) {
				onecall = await response.json()
			}
		} catch (_) {
			console.log('Default key not available right now')
		}
	}

	if (!onecall) {
		const endpoint = currentOnly ? '/weather/current/' : '/weather/'
		const response = await apiFetch(endpoint + queries)

		try {
			if (response?.status === 200) {
				if (!!currentOnly) current = (await response?.json()) as Weather.API.Current
				if (!currentOnly) onecall = (await response?.json()) as Weather.API.Onecall
			}
		} catch (error) {
			console.log(error)
		}
	}

	// 429 is rate limited
	if (response?.status === 429 && lastWeather) {
		lastWeather.timestamp = Date.now() - 1800000 // -30min
		return lastWeather
	}

	if (!onecall && current) {
		onecall = {
			lat: current.coord.lat,
			lon: current.coord.lon,
			current: {
				dt: Math.floor(new Date().getTime() / 1000),
				feels_like: current.main.feels_like,
				sunrise: current.sys.sunrise,
				sunset: current.sys.sunset,
				temp: current.main.temp,
				weather: current.weather,
			},
		}
	}

	if (!onecall) {
		return lastWeather
	}

	//
	// Parse result

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
		approximation: {
			ccode: isKeepingCity ? lastWeather?.approximation?.ccode : onecall?.ccode,
			city: isKeepingCity ? lastWeather?.approximation?.city : onecall?.city,
			lat: onecall.lat,
			lon: onecall.lon,
		},
	}
}

function displayWeather(data: Weather, lastWeather: LastWeather) {
	const useSinograms = getLang().includes('zh') || getLang().includes('jp')
	const current = document.getElementById('current')
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

		if (current && iconText) {
			current.textContent = weatherReport + dot + tempReport
			iconText.textContent = `${maintemp}°`
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

		const now = minutator(new Date())
		const { sunrise, sunset } = suntime()
		const daytime = now < sunrise || now > sunset ? 'night' : 'day'
		const iconSrc = `src/assets/weather/${daytime}/${filename}.svg`

		icon.src = iconSrc
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
			msnw: 'https://www.msn.com/en-us/weather/forecast/',
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
	const moreinfos: Weather.MoreInfo[] = ['none', 'msnw', 'yhw', 'windy', 'custom']
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
