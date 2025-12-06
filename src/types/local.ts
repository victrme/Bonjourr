import type { Background, Quote } from './shared.ts'
import type { Sync } from './sync.ts'

export type BackgroundUrlState = 'NONE' | 'LOADING' | 'OK' | 'NOT_URL' | 'CANT_REACH' | 'NOT_IMAGE'
export type SyncType = 'browser' | 'off'

export interface Local {
	fonts?: FontListItem[]
	fontface?: string
	userQuoteSelection: number
	quotesCache: Quote[]
	translations?: Translations

	// Sync (Chrome storage)
	syncStorage?: Sync
	syncType?: SyncType

	// Backgrounds
	backgroundCollections: Record<string, Background[]>
	backgroundUrls: Record<string, BackgroundUrl>
	backgroundFiles: Record<string, BackgroundFile>
	backgroundLastChange?: string
	backgroundCompressFiles?: boolean
}

export interface BackgroundUrl {
	lastUsed: string
	state: BackgroundUrlState
}

export interface BackgroundFile {
	lastUsed: string
	selected?: boolean
	position: {
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
