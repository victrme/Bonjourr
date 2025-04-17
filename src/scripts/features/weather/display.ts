import { userDate, minutator, suntime } from '../../shared/time'
import { getLang, tradThis } from '../../utils/translations'
import { getSunsetHour } from './index'

import type { LastWeather } from '../../../types/local'
import type { Weather } from '../../../types/sync'

let weatherFirstStart = true

export function displayWeather(data: Weather, lastWeather: LastWeather) {
	const useSinograms = getLang().includes('zh') || getLang().includes('ja')
	const currentDesc = document.getElementById('current-desc')
	const currentTemp = document.getElementById('current-temp')
	const tempContainer = document.getElementById('tempContainer')
	const weatherdom = document.getElementById('weather')
	const dot = useSinograms ? '。' : '. '
	const date = userDate()

	const handleDescription = () => {
		const feels = Math.floor(lastWeather.feels_like)
		const actual = Math.floor(lastWeather.temp)
		const maintemp = data.temperature === 'feelslike' ? feels : actual
		let tempReport = ''

		if (data.temperature === 'actual') {
			tempReport = tradThis('It is currently <temp1>°')
		}
		if (data.temperature === 'feelslike') {
			tempReport = tradThis('It currently feels like <temp2>°')
		}
		if (data.temperature === 'both') {
			tempReport = tradThis('It is currently <temp1>° and feels like <temp2>°')
		}

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
		const condition = lastWeather.icon_id

		if (!tempContainer) {
			return
		}

		const now = minutator(date)
		const { sunrise, sunset, dusk } = suntime()
		const daytime = now < sunrise || now > sunset + dusk ? 'night' : 'day'

		const icon = document.getElementById('weather-icon') as HTMLImageElement
		icon.dataset.daytime = daytime
		icon.dataset.condition = condition
	}

	const handleForecastData = () => {
		const forecastdom = document.getElementById('forecast')
		const day = date.getHours() > getSunsetHour() ? 'tomorrow' : 'today'
		let string = ''

		if (day === 'today') {
			string = tradThis('with a high of <temp1>° today')
		}
		if (day === 'tomorrow') {
			string = tradThis('with a high of <temp1>° tomorrow')
		}

		string = string.replace('<temp1>', lastWeather.forecasted_high.toString())
		string += dot

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

		const urLs = {
			accu: lastWeather.link ?? 'https://www.accuweather.com/',
			msnw: tradThis('https://www.msn.com/en-xl/weather/forecast/'),
			yhw: 'https://www.yahoo.com/news/weather/',
			windy: 'https://www.windy.com/',
			custom: data.provider ?? '',
		}

		if ((data.moreinfo || '') in urLs) {
			weatherdom?.setAttribute('href', urLs[data.moreinfo as keyof typeof urLs])
		}
	}

	handleForecastDisplay(data.forecast)
	handleWidget()
	handleMoreInfo()
	handleDescription()
	handleForecastData()

	if (weatherFirstStart) {
		weatherFirstStart = false
		weatherdom?.classList.remove('wait')
		setTimeout(() => weatherdom?.classList.remove('init'), 900)
	}
}

export function handleForecastDisplay(forecast: string) {
	const date = userDate()
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
