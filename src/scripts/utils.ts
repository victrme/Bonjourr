import { Hide, HideOld, Sync, Weather } from './types/sync'
import { Local } from './types/local'
import langList from './langs'

type LangList = keyof typeof langList

//
// CONSTS
//

const protocol = window.location.protocol
const userAgent = window.navigator.userAgent.toLowerCase()
const appVersion = window.navigator.appVersion

export const SYSTEM_OS = appVersion.includes('Macintosh')
	? 'mac'
	: appVersion.includes('Windows')
	? 'windows'
	: userAgent.includes('Android')
	? 'android'
	: ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
	  (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	? 'ios'
	: 'unknown'

export const PLATFORM =
	protocol === 'moz-extension:'
		? 'firefox'
		: protocol === 'chrome-extension:'
		? 'chrome'
		: protocol === 'safari-web-extension:'
		? 'safari'
		: 'online'

export const BROWSER =
	userAgent.indexOf('edg/' || 'edge') > -1
		? 'edge'
		: userAgent.indexOf('chrome') > -1
		? 'chrome'
		: userAgent.indexOf('firefox') > -1
		? 'firefox'
		: userAgent.indexOf('safari') > -1
		? 'safari'
		: 'other'

export const IS_MOBILE = navigator.userAgentData
	? navigator.userAgentData.mobile
	: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

//
// FUNCS
//

export function stringMaxSize(str: string = '', size: number) {
	return str.length > size ? str.slice(0, size) : str
}

export function minutator(date: Date) {
	return date.getHours() * 60 + date.getMinutes()
}

export function randomString(len: number) {
	const chars = 'abcdefghijklmnopqr'
	return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function periodOfDay(sunTime: { rise: number; set: number; now: number }, time?: number) {
	// Transition day and night with noon & evening collections
	// if clock is + /- 60 min around sunrise/set
	const { rise, set, now } = sunTime

	if (!time) time = now // no time specified ? get current from sunTime
	else time = minutator(new Date(time)) // everything is in minutes here

	if (time >= 0 && time <= rise - 60) return 'night'
	if (time <= rise + 60) return 'noon'
	if (time <= set - 60) return 'day'
	if (time <= set + 60) return 'evening'
	if (time >= set + 60) return 'night'

	return 'day'
}

export function convertHideStorage(old: Hide | HideOld) {
	if (!Array.isArray(old)) return old
	let hide: Hide = {}

	if (old[0][0]) hide.clock = true
	if (old[0][1]) hide.date = true
	if (old[1][0]) hide.greetings = true
	if (old[1][1]) hide.weatherdesc = true
	if (old[1][2]) hide.weathericon = true
	if (old[3][0]) hide.settingsicon = true

	return hide
}

export function bundleLinks(data: Sync): Link[] {
	// 1.13.0: Returns an array of found links in storage
	let res: Link[] = []
	Object.entries(data).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) res.push(val as Link)
	})

	res.sort((a: Link, b: Link) => a.order - b.order)
	return res
}

export const inputThrottle = (elem: HTMLInputElement, time = 800) => {
	let isThrottled = true

	setTimeout(() => {
		isThrottled = false
		elem.removeAttribute('disabled')
	}, time)

	if (isThrottled) elem.setAttribute('disabled', '')
}

export function turnRefreshButton(button: HTMLSpanElement, canTurn: boolean) {
	const animationOptions = { duration: 600, easing: 'ease-out' }
	button.animate(
		canTurn
			? [{ transform: 'rotate(360deg)' }]
			: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }, { transform: 'rotate(0deg)' }],
		animationOptions
	)
}

export function closeEditLink() {
	const domedit = document.querySelector('#editlink')
	if (!domedit) return

	domedit?.classList.add('hiding')
	document.querySelectorAll('#linkblocks img').forEach((img) => img?.classList.remove('selected'))
	setTimeout(() => {
		domedit ? domedit.setAttribute('class', '') : ''
	}, 200)
}

//
// DEFAULTS
//

let defaultLang: LangList = 'en'
const navLang = navigator.language.replace('-', '_')

// check if exact or similar languages are available
for (const [code] of Object.entries(langList)) {
	if (navLang === code || navLang.startsWith(code.substring(0, 2))) {
		defaultLang = code as LangList
	}
}

export const syncDefaults: Sync = {
	about: { browser: PLATFORM, version: '1.18.0' },
	showall: false,
	lang: defaultLang,
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
	textShadow: 0.2,
	reviewPopup: 0,
	cssHeight: 80,
	css: '',
	hide: {},
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
		ccode: 'FR',
		city: 'Paris',
		unit: 'metric',
		location: [],
		provider: '',
		moreinfo: 'none',
		forecast: 'auto',
		temperature: 'actual',
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
		url: '',
		family: '',
		size: '14',
		availWeights: [],
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

export const localDefaults: Local = {
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
