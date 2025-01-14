import langList from './langs'

export const CURRENT_VERSION = '20.4.2'

export const API_DOMAIN = 'https://services.bonjourr.fr'

//@ts-expect-error: "ENV" is defined by esbuild during build step
export const ENVIRONNEMENT: 'PROD' | 'DEV' | 'TEST' = ENV

export const SYSTEM_OS =
	['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
	(navigator.userAgent.includes('Mac') && 'ontouchend' in document)
		? 'ios'
		: window.navigator.appVersion.includes('Macintosh')
		? 'mac'
		: window.navigator.appVersion.includes('Windows')
		? 'windows'
		: window.navigator.userAgent.toLowerCase().includes('Android')
		? 'android'
		: 'unknown'

export const PLATFORM =
	window.location.protocol === 'moz-extension:'
		? 'firefox'
		: window.location.protocol === 'chrome-extension:'
		? 'chrome'
		: window.location.protocol === 'safari-web-extension:'
		? 'safari'
		: 'online'

export const BROWSER = window.navigator?.userAgentData?.brands.some((b) => b.brand === 'Microsoft Edge')
	? 'edge'
	: window.navigator?.userAgentData?.brands.some((b) => b.brand === 'Opera')
	? 'opera'
	: window.navigator?.userAgentData?.brands.some((b) => b.brand === 'Chromium')
	? 'chrome'
	: window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1
	? 'firefox'
	: window.navigator.userAgent.toLowerCase().indexOf('safari') > -1
	? 'safari'
	: 'other'

export const EXTENSION: typeof chrome | typeof browser | undefined =
	PLATFORM === 'online' ? undefined : PLATFORM === 'firefox' ? browser : chrome

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

export const SEARCHBAR_ENGINES = <const>[
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
]

export const SYNC_DEFAULT: Sync.Storage = {
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

export const LOCAL_DEFAULT: Local.Storage = {
	userQuoteSelection: 0,
	translations: undefined,
	selectedId: '',
	idsList: [],
	quotesCache: [],
	unsplashCache: { noon: [], day: [], evening: [], night: [], user: [] },
	syncType: PLATFORM === 'online' ? 'off' : 'browser',
}
