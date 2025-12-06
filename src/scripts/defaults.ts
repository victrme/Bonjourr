import { langList } from './langs.ts'

import type { Navigator } from '../types/shared.ts'
import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

const navigator = globalThis.navigator as Navigator
const iosUA = 'iPad Simulator|iPhone Simulator|iPod Simulator|iPad|iPhone|iPod'.split('|')
const mobileUA = 'Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini'.split('|')

export const CURRENT_VERSION = '1.0.0'

// Removed bonjourr API domain - using public APIs instead

export const ENVIRONNEMENT: 'PROD' | 'DEV' | 'TEST' = globalThis.ENV ?? 'TEST'

export const SYSTEM_OS = iosUA.includes(navigator.platform) ||
		(navigator.userAgent?.includes('Mac') && 'ontouchend' in document)
	? 'ios'
	: navigator.appVersion?.includes('Macintosh')
	? 'mac'
	: navigator.appVersion?.includes('Windows')
	? 'windows'
	: navigator.userAgent?.toLowerCase()?.includes('android')
	? 'android'
	: 'unknown'

export const PLATFORM = globalThis.location?.protocol === 'moz-extension:'
	? 'firefox'
	: globalThis.location?.protocol === 'chrome-extension:'
	? 'chrome'
	: globalThis.location?.protocol === 'safari-web-extension:'
	? 'safari'
	: 'online'

export const BROWSER = navigator?.userAgentData?.brands.some((b) => b.brand === 'Microsoft Edge')
	? 'edge'
	: navigator?.userAgentData?.brands.some((b) => b.brand === 'Opera')
	? 'opera'
	: navigator?.userAgentData?.brands.some((b) => b.brand === 'Chromium')
	? 'chrome'
	: navigator.userAgent?.toLowerCase()?.indexOf('firefox') > -1
	? 'firefox'
	: navigator.userAgent?.toLowerCase()?.indexOf('safari') > -1
	? 'safari'
	: 'other'

export const EXTENSION: typeof chrome | typeof browser | undefined = PLATFORM === 'online'
	? undefined
	: PLATFORM === 'firefox'
	? browser
	: chrome

export const IS_MOBILE = navigator.userAgentData
	? navigator.userAgentData.mobile
	: mobileUA.some((ua) => navigator.userAgent.includes(ua))

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
	syncType: PLATFORM === 'online' ? 'off' : 'browser',
	userQuoteSelection: 0,
	translations: undefined,
	quotesCache: [],
	backgroundUrls: {},
	backgroundFiles: {},
	backgroundCollections: {},
	backgroundCompressFiles: true,
	backgroundLastChange: '',
}
