import type { langList } from '../scripts/langs.ts'
import type { Local } from './local.ts'
import type { Sync } from './sync.ts'

export type Langs = keyof typeof langList
export type Link = LinkFolder | LinkElem
export type Background = BackgroundImage | BackgroundVideo
export type QuoteUserInput = [string, string][]
export type Widgets = 'time' | 'main' | 'quicklinks' | 'notes' | 'quotes' | 'searchbar'
export type Frequency = 'tabs' | 'hour' | 'day' | 'period' | 'pause'
export type SearchEngines =
	| 'default'
	| 'google'
	| 'ddg'
	| 'startpage'
	| 'qwant'
	| 'yahoo'
	| 'bing'
	| 'brave'
	| 'ecosia'
	| 'lilo'
	| 'baidu'
	| 'custom'
export type WeatherConditions =
	| 'clearsky'
	| 'fewclouds'
	| 'brokenclouds'
	| 'overcastclouds'
	| 'sunnyrain'
	| 'lightrain'
	| 'rain'
	| 'thunderstorm'
	| 'snow'
	| 'mist'

export interface BackgroundImage {
	format: 'image'
	urls: {
		full: string
		medium: string
		small: string
	}
	page?: string
	username?: string
	color?: string
	name?: string
	city?: string
	country?: string
	download?: string
	exif?: {
		make: string
		model: string
		exposure_time: string
		aperture: string
		focal_length: string
		iso: number
	}
	size?: string
	x?: string
	y?: string
}

export interface BackgroundVideo {
	format: 'video'
	duration: number
	page?: string
	username?: string
	thumbnail?: string
	urls: {
		full: string
		medium: string
		small: string
	}
}

export interface LinkElem {
	_id: string
	parent?: string | number
	folder?: false
	order: number
	title: string
	url: string
	icon?: string
}

export interface LinkFolder {
	_id: string
	parent?: string
	folder: true
	order: number
	title: string
}

export interface Quote {
	author: string
	content: string
}

export interface SimpleWeather {
	meta: {
		url: string
		lang: string
		provider: 'accuweather' | 'foreca'
	}
	geo: {
		lat: number
		lon: number
		city: string
		country: string
	}
	now: {
		icon: string
		temp: number
		feels: number
		description: string
	}
	sun: {
		rise: [number, number]
		set: [number, number]
	}
	daily: {
		time: string
		high: number
		low: number
	}[]
}

// Old

export type UnsplashCollections = 'night' | 'noon' | 'day' | 'evening' | 'user'

export interface OldSync {
	background_blur: number
	background_bright: number
	background_type: string
	weather: {
		location: [number, number]
	}
	unsplash: {
		time?: number
		every: Frequency
		pausedImage?: UnsplashImage
		collection: string
		lastCollec: UnsplashCollections
	}
	linktabs: {
		active: boolean
		selected: number
		titles: string[]
		pinned: number[]
	}
	hide: [[number, number], [number, number, number], [number], [number]]
}

export interface OldLocal {
	unsplashCache: Record<UnsplashCollections, UnsplashImage[]>
	selected?: boolean
	idsList: string[]
}

export interface UnsplashImage {
	url: string
	link: string
	download_link: string
	username: string
	name: string
	city: string | null
	country: string | null
	color: string
	exif?: {
		make: string
		model: string
		exposure_time: string
		aperture: string
		focal_length: string
		iso: number
	}
}

// Globals

declare global {
	var pageReady: boolean
	var startupBookmarks: undefined
	var startupTopsites: undefined
	var startupStorage: {
		sync?: Sync
		local?: Local
	}
}
