import type { Langs, Quote, UnsplashImage } from './shared'
import type { OpenWeatherMap } from './api'
import type { Unsplash } from './sync'

export type Translations = {
	lang: Langs
	[key: string]: string
}

export type UnsplashCache = {
	[key in Unsplash['lastCollec']]: UnsplashImage[]
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
	approximation?: Pick<OpenWeatherMap.Onecall, 'ccode' | 'city' | 'lat' | 'lon'>
}

export type FontList = {
	family: string
	weights: string[]
	variable: boolean
}[]

export type Local = {
	fonts?: FontList
	fontface?: string
	selectedId: string
	idsList: string[]
	userQuoteSelection: number
	quotesCache: Quote[]
	unsplashCache: UnsplashCache
	translations?: Translations
	lastWeather?: LastWeather
}
