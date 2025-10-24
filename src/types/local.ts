import type { Background, Quote, SimpleWeather } from './shared.ts'
import type { Sync } from './sync.ts'

export type BackgroundUrlState = 'NONE' | 'LOADING' | 'OK' | 'NOT_URL' | 'CANT_REACH' | 'NOT_MEDIA'
export type SyncType = 'browser' | 'gist' | 'url' | 'off'

export interface Local {
	fonts?: FontListItem[]
	fontface?: string
	userQuoteSelection: number
	quotesCache: Quote[]
	translations?: Translations
	lastWeather?: LastWeather
	operaExplained?: true

	// Sync
	gistId?: string
	gistToken?: string
	distantUrl?: string
	pastebinToken?: string
	syncStorage?: Sync
	syncType?: SyncType

	// Backgrounds
	backgroundCollections: Record<string, Background[]>
	backgroundUrls: Record<string, BackgroundUrl>
	backgroundFiles: Record<string, BackgroundFile>
	backgroundLastChange?: string
	backgroundCompressFiles?: boolean

	// Links
	[key: `x-icon-${string}`]: string
}

export interface LastWeather {
	temp: number
	forecasted_timestamp: number
	forecasted_high: number
	feels_like: number
	sunrise: number
	sunset: number
	icon_id: string
	description: string
	timestamp: number
	link: string
	approximation?: {
		ccode?: SimpleWeather['geo']['country']
		city?: SimpleWeather['geo']['city']
		lat: SimpleWeather['geo']['lat']
		lon: SimpleWeather['geo']['lon']
	}
}

export interface BackgroundUrl {
	lastUsed: string
	state: BackgroundUrlState
}

/**
 * Bad planning in version 21: interface structure is image only.
 *
 * Video options "zoom, fade, playbackRate" have been added separately
 * "position" remains image only...
 */
export interface BackgroundFile {
	format: 'image' | 'video'
	lastUsed: string
	selected?: boolean
	video?: {
		playbackRate: number
		fade: number
		zoom: number
	}
	position?: {
		size: string
		x: string
		y: string
	}
}

export interface FontListItem {
	family: string
	weights: string[]
	variable: boolean
}

export type Translations = {
	lang: string
	[key: string]: string
}
