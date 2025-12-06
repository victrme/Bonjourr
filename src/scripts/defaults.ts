import { langList } from './langs.ts'

import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

export const CURRENT_VERSION = '1.0.0'

export const ENVIRONNEMENT: 'PROD' | 'DEV' | 'TEST' = globalThis.ENV ?? 'TEST'

// Simplified: Chrome desktop only
export const SYSTEM_OS = navigator.appVersion?.includes('Windows')
	? 'windows'
	: navigator.appVersion?.includes('Macintosh')
	? 'mac'
	: 'linux'

export const PLATFORM = 'chrome' as const
export const BROWSER = 'chrome' as const
export const EXTENSION = chrome

// Simplified to only support Chinese and English
const DEFAULT_LANG = (() => {
	const lang = navigator.language.toLowerCase()
	if (lang.includes('zh')) {
		return 'zh_CN' as keyof typeof langList
	}
	return 'en' as keyof typeof langList
})()

export const SEARCHBAR_ENGINES = [
	'default',
	'google',
	'ddg',
	'startpage',
	'qwant',
	'yahoo',
	'bing',
	'brave',
	'ecosia',
	'lilo',
	'baidu',
	'custom',
] as const

export const SYNC_DEFAULT: Sync = {
	about: {
		browser: PLATFORM,
		version: CURRENT_VERSION,
	},
	showall: false,
	lang: DEFAULT_LANG,
	dark: 'system',
	favicon: '',
	tabtitle: '',
	greeting: '',
	greetingsize: '3',
	pagegap: 1,
	pagewidth: 1600,
	time: true,
	main: true,
	dateformat: 'auto',
	quicklinks: true,
	textShadow: 0.2,
	announcements: 'major',
	review: 0,
	css: '',
	hide: {},
	linkstyle: 'medium',
	linktitles: true,
	linkbackgrounds: true,
	linknewtab: false,
	linksrow: 6,
	linkgroups: {
		on: false,
		selected: 'default',
		groups: ['default'],
		pinned: [],
		synced: [],
	},
	backgrounds: {
		type: 'images',
		fadein: 600,
		blur: 15,
		bright: 0.8,
		frequency: 'day',
		color: '#185A63',
		urls: '',
		images: 'bing',
		videos: '',
		queries: {},
		texture: {
			type: 'none',
		},
	},
	clock: {
		size: 1,
		ampm: false,
		analog: false,
		seconds: false,
		ampmlabel: false,
		worldclocks: false,
		timezone: 'auto',
	},
	analogstyle: {
		face: 'none',
		hands: 'modern',
		shape: 'round',
		border: '#ffff',
		background: '#fff2',
	},
	worldclocks: [],
	searchbar: {
		on: false,
		opacity: 0.1,
		newtab: false,
		suggestions: true,
		engine: 'default',
		request: '',
		placeholder: '',
	},
	quotes: {
		on: false,
		author: false,
		type: 'hitokoto',
		frequency: 'day',
		last: undefined,
	},
	font: {
		family: '',
		size: '14',
		system: true,
		weightlist: [],
		weight: SYSTEM_OS === 'windows' ? '400' : '300',
	},
	move: {
		selection: 'single',
		layouts: {},
	},
	dragPosition: {
		editing: false,
		positions: {
			time: { x: 50, y: 30, enabled: false },
			main: { x: 50, y: 45, enabled: false },
			quicklinks: { x: 50, y: 85, enabled: false },
			quotes: { x: 50, y: 90, enabled: false },
			searchbar: { x: 50, y: 60, enabled: false },
		},
	},
}

export const LOCAL_DEFAULT: Local = {
	syncType: 'browser',
	userQuoteSelection: 0,
	translations: undefined,
	quotesCache: [],
	backgroundUrls: {},
	backgroundFiles: {},
	backgroundCollections: {},
	backgroundCompressFiles: true,
	backgroundLastChange: '',
}
