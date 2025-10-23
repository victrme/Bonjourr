import type { langList } from '../scripts/langs.ts'
import type { BackgroundFile, Local } from './local.ts'
import type { Sync } from './sync.ts'

export type Langs = keyof typeof langList
export type Link = LinkFolder | LinkElem
export type Background = BackgroundImage | BackgroundVideo
export type QuoteUserInput = [string, string][]
export type Widgets = 'time' | 'main' | 'quicklinks' | 'notes' | 'quotes' | 'searchbar'
export type Frequency = 'tabs' | 'hour' | 'day' | 'period' | 'pause'
export type LinkIconType = 'auto' | 'library' | 'file' | 'url'
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
	mimetype?: string
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
	file?: BackgroundFile
}

export interface BackgroundVideo {
	format: 'video'
	mimetype?: string
	duration: number
	page?: string
	username?: string
	thumbnail?: string
	urls: {
		full: string
		medium: string
		small: string
	}
	file?: BackgroundFile
}

export interface LinkElem {
	_id: string
	parent?: string
	folder?: false
	order: number
	title: string
	url: string
	icon?: LinkIcon
}

export interface LinkIcon {
	type: LinkIconType
	value?: string
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
	usdate: boolean
	searchbar: boolean
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
	var startupBookmarks: browser.bookmarks.BookmarkTreeNode[] | undefined
	var startupTopsites: browser.topSites.MostVisitedURL[] | undefined
	var startupStorage: {
		sync?: Sync
		local?: Local
	}
	var ENV: 'PROD' | 'DEV' | 'TEST'
}

// https://github.com/lukewarlow/user-agent-data-types
// WICG Spec: https://wicg.github.io/ua-client-hints

export interface Navigator extends globalThis.Navigator {
	readonly userAgentData?: NavigatorUAData
}

// https://wicg.github.io/ua-client-hints/#dictdef-navigatoruabrandversion
interface NavigatorUABrandVersion {
	readonly brand: string
	readonly version: string
}

// https://wicg.github.io/ua-client-hints/#dictdef-uadatavalues
interface UADataValues {
	readonly brands?: NavigatorUABrandVersion[]
	readonly mobile?: boolean
	readonly platform?: string
	readonly architecture?: string
	readonly bitness?: string
	readonly formFactor?: string[]
	readonly model?: string
	readonly platformVersion?: string
	/** @deprecated in favour of fullVersionList */
	readonly uaFullVersion?: string
	readonly fullVersionList?: NavigatorUABrandVersion[]
	readonly wow64?: boolean
}

// https://wicg.github.io/ua-client-hints/#dictdef-ualowentropyjson
interface UALowEntropyJSON {
	readonly brands: NavigatorUABrandVersion[]
	readonly mobile: boolean
	readonly platform: string
}

// https://wicg.github.io/ua-client-hints/#navigatoruadata
interface NavigatorUAData extends UALowEntropyJSON {
	getHighEntropyValues(hints: string[]): Promise<UADataValues>
	toJSON(): UALowEntropyJSON
}
