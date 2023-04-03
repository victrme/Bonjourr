import { sunTime } from '..'
import storage from '../storage'
import { Sync, Weather } from '../types/sync'
import { $, clas, tradThis, stringMaxSize } from '../utils'
import errorMessage from '../utils/errorMessage'

export default function weather(
	init: Sync | null,
	event?: {
		is: 'city' | 'geol' | 'units' | 'forecast' | 'temp' | 'unhide'
		checked?: boolean
		value?: string
		elem?: Element
	}
) {
	const date = new Date()
	const i_city = $('i_city') as HTMLInputElement
	const i_ccode = $('i_ccode') as HTMLInputElement
	const sett_city = $('sett_city') as HTMLInputElement
	const current = $('current')
	const forecast = $('forecast')
	const tempContainer = $('tempContainer')

	async function request(storage: Weather): Promise<Weather> {
		function getRequestURL(isForecast: boolean) {
			const key = ['@@WEATHER_1', '@@WEATHER_2', '@@WEATHER_3', '@@WEATHER_4'][Math.ceil(Math.random() * 4) - 1]
			const units = storage.unit || 'metric'
			const type = isForecast ? 'forecast' : 'weather'
			let lang = document.documentElement.getAttribute('lang')
			let location = ''

			// Openweathermap country code for traditional chinese is tw
			if (lang === 'zh_HK') lang = 'zh_TW'

			storage.location?.length === 2
				? (location = `&lat=${storage.location[0]}&lon=${storage.location[1]}`)
				: (location = `&q=${encodeURI(storage.city)},${storage.ccode}`)

			return `https://api.openweathermap.org/data/2.5/${type}?appid=${key}${location}&units=${units}&lang=${lang}`
		}

		if (!navigator.onLine) {
			return storage
		}

		let currentResponse: any
		let forecastResponse: any
		let currentJSON: any
		let forecastJSON: any

		try {
			currentResponse = await fetch(getRequestURL(false))
			forecastResponse = await fetch(getRequestURL(true))
			currentJSON = await currentResponse.json()
			forecastJSON = await forecastResponse.json()
		} catch (error) {
			console.error(error)
			return storage
		}

		if (!currentResponse.ok || !forecastResponse.ok) {
			return storage // API not ok ? nothing was saved
		}

		//
		// Current API call
		//

		const { temp, feels_like, temp_max } = currentJSON.main
		const { sunrise, sunset } = currentJSON.sys
		const { description, id } = currentJSON.weather[0]

		storage = {
			...storage,
			lastCall: Math.floor(new Date().getTime() / 1000),
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

		const thisdate = new Date()
		const todayHour = thisdate.getHours()
		let forecastDay = thisdate.getDate()
		let maxTempFromList = -273.15

		// Late evening forecast for tomorrow
		if (todayHour > 18) {
			const tomorrow = thisdate.setDate(thisdate.getDate() + 1)
			forecastDay = new Date(tomorrow).getDate()
		}

		// Get the highest temp for the specified day
		forecastJSON.list.forEach((elem: any) => {
			if (new Date(elem.dt * 1000).getDate() === forecastDay)
				maxTempFromList < elem.main.temp_max ? (maxTempFromList = elem.main.temp_max) : ''
		})

		storage.fcHigh = Math.round(maxTempFromList)

		return storage
	}

	async function weatherCacheControl(data: Weather) {
		const now = Math.floor(date.getTime() / 1000)

		if (typeof data.lastCall === 'number') {
			// Current: 30 mins
			if (navigator.onLine && (now > data.lastCall + 1800 || sessionStorage.lang)) {
				sessionStorage.removeItem('lang')
				data = await request(data)
				storage.sync.set({ weather: data })
			}

			displayWeather(data)
		}

		// First startup
		else initWeather(data)
	}

	async function initWeather(data: Weather) {
		// Get IPAPI first to get city and location

		// Get geolocation
		// if geoloc success, replace IPAPI
		// else try with IPAPI city

		// If ipapi city failed, use Paris, France

		// First, tries to get city and country code to add in settings

		async function getInitialPositionFromIpapi() {
			try {
				const ipapi = await fetch('https://ipapi.co/json')

				if (ipapi.ok) {
					const { error, city, country, latitude, longitude } = await ipapi.json()

					if (!error) {
						return {
							city: city,
							ccode: country,
							location: [latitude, longitude],
						}
					}
				}
			} catch (error) {
				return { city: 'Paris', ccode: 'FR' }
			}
		}

		// Then use this as callback in Geolocation request
		async function setWeatherAfterGeolocation(location?: [number, number]) {
			data = {
				...data,
				...(await getInitialPositionFromIpapi()), // get location + city from ipapi
			}

			if (location) {
				data.location = location // replace location if geoloc is available
			}

			// Request API with all infos available
			data = await request(data)

			displayWeather(data)
			storage.sync.set({ weather: data })

			setTimeout(() => {
				// If settings is available, all other inputs are
				if ($('settings')) {
					const i_ccode = $('i_ccode') as HTMLInputElement
					const i_city = $('i_city') as HTMLInputElement
					const i_geol = $('i_geol') as HTMLInputElement
					const sett_city = $('sett_city') as HTMLDivElement

					i_ccode.value = data.ccode
					i_city.setAttribute('placeholder', data.city)

					if (location) {
						clas(sett_city, true, 'hidden')
						i_geol.checked = true
					}
				}
			}, 150)
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => setWeatherAfterGeolocation([pos.coords.latitude, pos.coords.longitude]), // Accepted
			() => setWeatherAfterGeolocation() // Rejected
		)
	}

	function displayWeather(data: Weather) {
		const currentState = data.lastState

		if (!currentState) {
			return
		}

		const handleDescription = () => {
			const desc = currentState.description
			const feels = Math.floor(currentState.feels_like)
			const actual = Math.floor(currentState.temp)
			let tempText = ''

			switch (data.temperature) {
				case 'feelslike': {
					tempText = `${tradThis('It currently feels like')} ${feels}°`
					break
				}

				case 'both': {
					tempText = `${tradThis('It is currently')} ${actual}°, ${tradThis('feels like')} ${feels}°`
					break
				}

				default: {
					tempText = `${tradThis('It is currently')} ${actual}°`
				}
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

			const widgetIcon = tempContainer.querySelector('img')
			const { now, rise, set } = sunTime()
			const timeOfDay = now < rise || now > set ? 'night' : 'day'
			const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

			if (widgetIcon) {
				widgetIcon.setAttribute('src', iconSrc)
				return
			}

			const icon = document.createElement('img')
			icon.src = iconSrc
			icon.setAttribute('alt', '')
			icon.setAttribute('draggable', 'false')
			icon.setAttribute('fetchPriority', 'high')
			tempContainer.prepend(icon)

			// from 1.2s request anim to .4s hide elem anim
			setTimeout(() => (tempContainer.style.transition = 'opacity 0.4s, max-height 0.4s, transform 0.4s'), 400)
		}

		const handleForecast = () => {
			if (forecast) {
				let day = tradThis(date.getHours() > 21 ? 'tomorrow' : 'today')
				day = day !== '' ? ' ' + day : '' // Only day change on translations that support it

				forecast.textContent = `${tradThis('with a high of')} ${data.fcHigh}°${day}.`

				clas(forecast, false, 'wait')
			}
		}

		handleWidget()
		handleDescription()
		handleForecast()

		clas(current, false, 'wait')
		clas(tempContainer, false, 'wait')
	}

	function forecastVisibilityControl(value: string = 'auto') {
		let isTimeForForecast = false

		if (value === 'auto') isTimeForForecast = date.getHours() < 12 || date.getHours() > 21
		else isTimeForForecast = value === 'always'

		clas(forecast, isTimeForForecast, 'shown')
	}

	async function updatesWeather() {
		storage.sync.get(['weather', 'hide'], async (data) => {
			switch (event?.is) {
				case 'units': {
					data.weather.unit = event.checked ? 'imperial' : 'metric'
					data.weather = await request(data.weather)
					break
				}

				case 'city': {
					if (i_city.value.length < 3 || !navigator.onLine) {
						return false
					}

					data.weather.ccode = i_ccode.value
					data.weather.city = stringMaxSize(i_city.value, 64)

					const inputAnim = i_city.animate([{ opacity: 1 }, { opacity: 0.6 }], {
						direction: 'alternate',
						easing: 'linear',
						duration: 800,
						iterations: Infinity,
					})

					data.weather = await request(data.weather)

					i_city.value = ''
					i_city.blur()
					inputAnim.cancel()
					i_city.setAttribute('placeholder', data.weather.city)

					break
				}

				case 'geol': {
					data.weather.location = []

					if (event.checked) {
						navigator.geolocation.getCurrentPosition(
							async (pos) => {
								//update le parametre de location
								clas(sett_city, event.checked || true, 'hidden')
								data.weather.location = [pos.coords.latitude, pos.coords.longitude]

								data.weather = await request(data.weather)
								storage.sync.set({ weather: data.weather })
								displayWeather(data.weather)
							},
							() => {
								// Désactive geolocation if refused
								setTimeout(() => (event.checked = false), 400)
							}
						)
						return
					} else {
						i_city.setAttribute('placeholder', data.weather.city)
						i_ccode.value = data.weather.ccode
						clas(sett_city, event.checked || false, 'hidden')

						data.weather.location = []
						data.weather = await request(data.weather)
					}
					break
				}

				case 'forecast': {
					data.weather.forecast = event.value
					forecastVisibilityControl(event.value)
					break
				}

				case 'temp': {
					data.weather.temperature = event.value
					break
				}

				case 'unhide': {
					const { weatherdesc, weathericon } = data.hide || {}
					if (weatherdesc && weathericon) {
						forecastVisibilityControl(data.weather.forecast)
						weatherCacheControl(data.weather)
					}
					return
				}
			}

			storage.sync.set({ weather: data.weather })
			displayWeather(data.weather)
		})
	}

	// Event & Init
	if (event) {
		updatesWeather()
		return
	}

	if (!init || (init.hide?.weatherdesc && init.hide?.weathericon)) {
		return
	}

	try {
		forecastVisibilityControl(init.weather.forecast)
		weatherCacheControl(init.weather)
	} catch (e) {
		errorMessage(e)
	}
}

setInterval(() => {
	if (navigator.onLine) {
		storage.sync.get(['weather', 'hide'], (data) => {
			weather(data as Sync) // Checks every 5 minutes if weather needs update
		})
	}
}, 300000)
