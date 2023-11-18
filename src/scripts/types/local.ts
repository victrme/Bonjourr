import type { OWMOnecall } from './apis/openweathermap'
import type { Langs, Quote, UnsplashImage } from './shared'

export type Translations =
	| {
			lang: Langs
			[key: string]: string
	  }
	| undefined

export type UnsplashCache = {
	noon: UnsplashImage[]
	day: UnsplashImage[]
	evening: UnsplashImage[]
	night: UnsplashImage[]
	user: UnsplashImage[]
}

export type LastWeather = {
	temp: number
	forecasted_timestamp: number
	forecasted_high: number
	feels_like: number
	sunrise: number
	sunset: number
	icon_id: number
	description: string
	timestamp: number
	approximation?: Pick<OWMOnecall, 'ccode' | 'city' | 'lat' | 'lon'>
}

export type Local = {
	fonts?: { family: string; weights: string[]; variable: boolean }[]
	fontface?: string
	selectedId: string
	idsList: string[]
	userQuoteSelection: number
	quotesCache: Quote[]
	unsplashCache: UnsplashCache
	translations?: Translations
	lastWeather?: LastWeather
}
