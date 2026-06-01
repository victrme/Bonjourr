import { minutator, suntime, userDate } from '../../shared/time.ts'
import { getLang, tradThis } from '../../utils/translations.ts'
import { getSunsetHour } from './index.ts'

import type { LastWeather } from '../../../types/local.ts'
import type { Weather } from '../../../types/sync.ts'

let weatherFirstStart = true

export function displayWeather(data: Weather, lastWeather: LastWeather): void {
    const useSinograms = getLang().includes('zh') || getLang().includes('ja')
    const currentDesc = document.getElementById('current-desc')
    const currentTemp = document.getElementById('current-temp')
    const tempContainer = document.getElementById('tempContainer')
    const dotContainer = document.getElementById('dotContainer')
    const weatherdom = document.getElementById('weather')
    const unit = data.unit
    const dot = useSinograms ? '。' : '. '
    const date = userDate()

    const handleDescription = () => {
        const feels = Math.floor(lastWeather.feels_like)
        const actual = Math.floor(lastWeather.temp)
        const maintemp = data.temperature === 'feelslike' ? feels : actual
        let tempReport = ''

        if (data.temperature === 'actual') {
            tempReport = tradThis('It is currently <temp1>')
        }
        if (data.temperature === 'feelslike') {
            tempReport = tradThis('It currently feels like <temp2>')
        }
        if (data.temperature === 'both') {
            tempReport = tradThis('It is currently <temp1> and feels like <temp2>')
        }

        const weatherReport = lastWeather.description[0].toUpperCase() + lastWeather.description.slice(1)

        const splitString = tempReport.split(/<temp\d+>/).filter(Boolean)

        if (currentDesc && currentTemp && dotContainer && tempContainer) {
            currentDesc.innerText = weatherReport + dot

            currentTemp.querySelector<HTMLElement>('#current-a')?.replaceChildren(splitString[0])
            currentTemp.querySelector<HTMLElement>('#current-temp-a .temp-value')?.replaceChildren(
                actual.toString() + '°',
            )
            currentTemp.querySelector<HTMLElement>('#current-temp-a .temp-unit')?.replaceChildren(getUnitSymbol(unit))

            // feels like
            currentTemp.querySelector<HTMLElement>('#current-b')?.replaceChildren(
                data.temperature === 'both' ? splitString[1] : '',
            )
            currentTemp.querySelector<HTMLElement>('#current-temp-b .temp-value')?.replaceChildren(
                data.temperature === 'both' ? feels.toString() + '°' : '',
            )
            currentTemp.querySelector<HTMLElement>('#current-temp-b .temp-unit')?.replaceChildren(
                data.temperature === 'both' ? getUnitSymbol(unit) : '',
            )

            dotContainer.innerText = dot

            // for icon temp
            tempContainer.querySelector<HTMLElement>('.temp-value')?.replaceChildren(maintemp.toString() + '°')
            tempContainer.querySelector<HTMLElement>('.temp-unit')?.replaceChildren(getUnitSymbol(unit))
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
            string += tradThis('with a high of <temp1> today')
        }
        if (day === 'tomorrow') {
            string += tradThis('with a high of <temp1> tomorrow')
        }

        const splitString = string.split('<temp1>')

        if (forecastdom) {
            forecastdom.querySelector<HTMLElement>('#forecast-a')?.replaceChildren(splitString[0])
            forecastdom.querySelector<HTMLElement>('.temp-value')?.replaceChildren(
                lastWeather.forecasted_high.toString() + '°',
            )
            forecastdom.querySelector<HTMLElement>('.temp-unit')?.replaceChildren(getUnitSymbol(unit))
            forecastdom.querySelector<HTMLElement>('#forecast-b')?.replaceChildren(splitString[1])
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
    handleShowUnit(data.show_unit)

    if (weatherFirstStart) {
        weatherFirstStart = false
        weatherdom?.classList.remove('wait')
        setTimeout(() => weatherdom?.classList.remove('init'), 900)
    }
}

// potential flaw: forecast timing is based on computer date instead of userDate()
export function handleForecastDisplay(forecast: string): void {
    // // forces forecast for debugging
    // return

    const date = userDate()
    const morningOrLateDay = date.getHours() < 12 || date.getHours() > getSunsetHour()
    const isTimeForForecast = forecast === 'auto' ? morningOrLateDay : forecast === 'always'

    document.querySelector('#forecast')?.classList.toggle('shown', isTimeForForecast)
}

export function handleShowUnit(show_unit = false): void {
    document.querySelector('#weather')?.setAttribute('data-show-unit', String(show_unit))
}

function getUnitSymbol(unit: string): string {
    return unit === 'imperial' ? 'F' : 'C'
}
