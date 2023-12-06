import langList from './langs'
import type { Local } from './types/local'
import type { Sync } from './types/sync'

export const CURRENT_VERSION = '1.18.4'

export const MAIN_API = 'https://api.bonjourr.lol'

export const FALLBACK_API = [
	'https://bonjourr-apis.victr.me',
	'https://bonjourr-apis.victr.workers.dev',
	'https://bonjourr-apis.victrme.workers.dev',
	'https://api.bonjourr.fr',
	'https://bonjourr-apis.bonjourr.workers.dev',
]

export const SYSTEM_OS = window.navigator.appVersion.includes('Macintosh')
	? 'mac'
	: window.navigator.appVersion.includes('Windows')
	? 'windows'
	: window.navigator.userAgent.toLowerCase().includes('Android')
	? 'android'
	: ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
	  (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	? 'ios'
	: 'unknown'

export const PLATFORM =
	window.location.protocol === 'moz-extension:'
		? 'firefox'
		: window.location.protocol === 'chrome-extension:'
		? 'chrome'
		: window.location.protocol === 'safari-web-extension:'
		? 'safari'
		: 'online'

export const BROWSER =
	window.navigator.userAgent.toLowerCase().indexOf('edg/' || 'edge') > -1
		? 'edge'
		: window.navigator.userAgent.toLowerCase().indexOf('chrome') > -1
		? 'chrome'
		: window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1
		? 'firefox'
		: window.navigator.userAgent.toLowerCase().indexOf('safari') > -1
		? 'safari'
		: 'other'

export const IS_MOBILE = navigator.userAgentData
	? navigator.userAgentData.mobile
	: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

const DEFAULT_LANG = (() => {
	for (const code of Object.keys(langList)) {
		if (navigator.language.replace('-', '_').includes(code)) {
			return code as keyof typeof langList
		}
	}
	return 'en'
})()

export const SYNC_DEFAULT: Sync = {
	about: { browser: PLATFORM, version: CURRENT_VERSION },
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
	usdate: false,
	background_blur: 15,
	background_bright: 0.8,
	background_type: 'unsplash',
	quicklinks: true,
	linkstyle: 'large',
	linknewtab: false,
	linksrow: 6,
	linktab: 0,
	textShadow: 0.2,
	reviewPopup: 0,
	cssHeight: 80,
	css: '',
	hide: {},
	tabs: {
		selected: 0,
		list: [{ title: '', ids: [] }],
	},
	clock: {
		size: 1,
		ampm: false,
		analog: false,
		seconds: false,
		face: 'none',
		style: 'round',
		timezone: 'auto',
	},
	unsplash: {
		every: 'hour',
		collection: '',
		lastCollec: 'day',
		pausedImage: null,
		time: Date.now(),
	},
	weather: {
		ccode: undefined,
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
		text: null,
		opacity: 0.1,
		align: 'left',
	},
	searchbar: {
		on: false,
		opacity: 0.1,
		newtab: false,
		suggestions: true,
		engine: 'google',
		request: '',
		placeholder: '',
	},
	quotes: {
		on: false,
		author: false,
		type: 'classic',
		frequency: 'day',
		last: 1650516688,
		userlist: [],
	},
	font: {
		id: '',
		family: '',
		size: '14',
		weightlist: [],
		weight: SYSTEM_OS === 'windows' ? '400' : '300',
	},

	move: {
		selection: 'single',
		layouts: {
			single: {
				grid: [['time'], ['main'], ['quicklinks']],
				items: {},
			},
			double: {
				grid: [
					['time', '.'],
					['main', '.'],
					['quicklinks', '.'],
				],
				items: {},
			},
			triple: {
				grid: [
					['.', 'time', '.'],
					['.', 'main', '.'],
					['.', 'quicklinks', '.'],
				],
				items: {},
			},
		},
	},
}

export const LOCAL_DEFAULT: Local = {
	userQuoteSelection: 0,
	translations: {},
	selectedId: '',
	idsList: [],
	quotesCache: [],
	unsplashCache: {
		noon: [],
		day: [],
		evening: [],
		night: [],
		user: [],
	},
}
