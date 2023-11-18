import type { Langs, UnsplashImage } from './shared'

export type Clock = {
	ampm: boolean
	analog: boolean
	seconds: boolean
	timezone: string
	size: number
	style: 'round' | 'square' | 'transparent'
	face: 'none' | 'number' | 'roman' | 'marks'
}

export type SearchEngines =
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

export type Searchbar = {
	on: boolean
	opacity: number
	newtab: boolean
	engine: SearchEngines
	request: string
	suggestions: boolean
	placeholder: string
}

export type Quotes = {
	on: boolean
	author: boolean
	last: number
	type: 'classic' | 'kaamelott' | 'inspirobot' | 'user'
	frequency: string
	userlist?: [string, string][]
}

export type Weather = {
	geolocation: 'precise' | 'approximate' | 'off'
	ccode?: string
	city?: string
	unit: 'metric' | 'imperial'
	location?: [number, number]
	forecast: 'auto' | 'always' | 'never'
	temperature: 'actual' | 'feelslike' | 'both'
	moreinfo: 'none' | 'msnw' | 'yhw' | 'windy' | 'custom'
	provider?: string
}

export type Unsplash = {
	time: number
	every: 'tabs' | 'hour' | 'day' | 'period' | 'pause'
	collection: string
	pausedImage: UnsplashImage | null
	lastCollec: 'night' | 'noon' | 'day' | 'evening' | 'user'
}

export type Font = {
	url: string
	family: string
	size: string
	availWeights: string[]
	weight: string
}

export type Notes = {
	on: boolean
	text?: string
	width?: number
	opacity: number
	align: 'left' | 'center' | 'right'
}

export type MoveKeys = 'time' | 'main' | 'notes' | 'searchbar' | 'quicklinks' | 'quotes'

export type MoveItem = {
	box: string
	text: string
}

export type Move = {
	selection: keyof Move['layouts']
	layouts: {
		single: {
			grid: [string][]
			items: { [key in MoveKeys]?: MoveItem }
		}
		double: {
			grid: [string, string][]
			items: { [key in MoveKeys]?: MoveItem }
		}
		triple: {
			grid: [string, string, string][]
			items: { [key in MoveKeys]?: MoveItem }
		}
	}
}

export type HideOld = [[number, number], [number, number, number], [number], [number]]

export type Hide = {
	clock?: boolean
	date?: boolean
	greetings?: boolean
	weatherdesc?: boolean
	weathericon?: boolean
	settingsicon?: boolean
}

export type Sync = {
	usdate: boolean
	showall: boolean
	quicklinks: boolean
	time: boolean
	main: boolean
	pagegap: number
	pagewidth: number
	linksrow: number
	linkstyle: 'large' | 'medium' | 'small' | 'text'
	linknewtab: boolean
	cssHeight: number
	reviewPopup: number
	background_blur: number
	background_bright: number
	css: string
	lang: Langs
	favicon: string
	tabtitle: string
	greeting: string
	notes?: Notes
	hide?: Hide
	dark: 'auto' | 'system' | 'enable' | 'disable'
	background_type: 'local' | 'unsplash'
	clock: Clock
	unsplash: Unsplash
	weather: Weather
	searchbar: Searchbar
	quotes: Quotes
	font: Font
	move: Move
	textShadow: number
	about: { browser: string; version: string }
	[key: string]: Link | unknown
}
