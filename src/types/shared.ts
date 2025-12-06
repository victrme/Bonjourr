import type { langList } from '../scripts/langs.ts'
import type { Local } from './local.ts'
import type { Sync } from './sync.ts'

export type Langs = keyof typeof langList
export type Link = LinkFolder | LinkElem
export type Background = BackgroundImage | BackgroundVideo
export type QuoteUserInput = [string, string][]
export type Widgets = 'time' | 'main' | 'quicklinks' | 'quotes' | 'searchbar'
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
	size?: string
	x?: string
	y?: string
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

// Globals (Chrome extension only)
declare global {
	var pageReady: boolean
	var startupBookmarks: chrome.bookmarks.BookmarkTreeNode[] | undefined
	var startupTopsites: chrome.topSites.MostVisitedURL[] | undefined
	var startupStorage: {
		sync?: Sync
		local?: Local
	}
	var ENV: 'PROD' | 'DEV' | 'TEST'
}
