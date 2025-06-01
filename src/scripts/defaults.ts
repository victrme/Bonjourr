import { langList } from './langs.ts'

import type { Navigator } from '../types/shared.ts'
import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

const navigator = globalThis.navigator as Navigator
const iosUA = 'iPad Simulator|iPhone Simulator|iPod Simulator|iPad|iPhone|iPod'.split('|')
const mobileUA = 'Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini'.split('|')

export const CURRENT_VERSION = '21.0.0'

export const API_DOMAIN = 'https://services.bonjourr.fr'

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

const DEFAULT_LANG = (() => {
	for (const code of Object.keys(langList)) {
		if (navigator.language.replace('-', '_').includes(code)) {
			return code as keyof typeof langList
		}
	}
	return 'en'
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
	pagegap: 1,
	pagewidth: 1600,
	time: true,
	main: true,
	dateformat: 'auto',
	background_blur: 15,
	background_bright: 0.8,
	background_type: 'unsplash',
	background_solid: '#222',
	quicklinks: true,
	syncbookmarks: undefined,
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
		frequency: 'hour',
		color: '#185A63',
		urls: '',
		images: 'bonjourr-images-daylight',
		videos: 'bonjourr-videos-daylight',
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
	unsplash: {
		every: 'hour',
		collection: '',
		lastCollec: 'day',
		pausedImage: undefined,
		time: undefined,
	},
	weather: {
		city: undefined,
		unit: 'metric',
		provider: '',
		moreinfo: 'none',
		forecast: 'auto',
		temperature: 'actual',
		geolocation: 'approximate',
	},
	notes: {
		on: false,
		width: 40,
		opacity: 0.1,
		align: 'left',
	},
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
		type: DEFAULT_LANG === 'zh-CN' ? 'hitokoto' : 'classic',
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
	supporters: {
		enabled: true,
		closed: false,
		month: new Date().getMonth() + 1,
	},
	move: {
		selection: 'single',
		layouts: {},
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
	lastWeather: undefined,
}
