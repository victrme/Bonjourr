import { dict, langList } from './lang'
import { Hide, HideOld, Sync } from './types/sync'
import { Local } from './types/local'

import storage from './storage'

type LangList = keyof typeof langList

export const $ = (name: string) => document.getElementById(name)

export const has = (dom: Element | null, val: string) => {
	if (!dom) return false
	else return dom.classList.length > 0 ? dom.classList.contains(val) : false
}

export const clas = (dom: Element | null, add: boolean, str: string) => {
	if (dom === null) return
	else add ? dom.classList.add(str) : dom.classList.remove(str)
}

export const mobilecheck = () =>
	navigator.userAgentData
		? navigator.userAgentData.mobile
		: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export const stringMaxSize = (str: string, size: number) => (str.length > size ? str.slice(0, size) : str)
export const minutator = (date: Date) => date.getHours() * 60 + date.getMinutes()

export const extractDomain = (url: string) => {
	url.replace(/(^\w+:|^)\/\//, '')
	url.split('?')[0]
	return url
}

export const extractHostname = (url: string) => {
	const a = document.createElement('a')
	let res = ''
	a.href = url
	res = a.hostname

	a.remove()

	return res
}

export const randomString = (len: number) => {
	const chars = 'abcdefghijklmnopqr'
	return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function detectPlatform() {
	const p = window.location.protocol
	return p === 'moz-extension:'
		? 'firefox'
		: p === 'chrome-extension:'
		? 'chrome'
		: p === 'safari-web-extension:'
		? 'safari'
		: 'online'
}

export const getBrowser = (agent = window.navigator.userAgent.toLowerCase()) => {
	return agent.indexOf('edg/' || 'edge') > -1
		? 'edge'
		: agent.indexOf('chrome') > -1
		? 'chrome'
		: agent.indexOf('firefox') > -1
		? 'firefox'
		: agent.indexOf('safari') > -1
		? 'safari'
		: 'other'
}

export const getFavicon = () => {
	return getBrowser() === 'edge' ? 'monochrome.png' : 'favicon-128x128.png'
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

export function localDataMigration(local: any) {
	if (!local.custom) return local

	let idsList: string[]
	Object.values(local.custom).forEach((val, i) => {
		const _id = randomString(6)
		idsList.push(_id)

		local = {
			...local,
			idsList,
			selectedId: _id,
			['custom_' + _id]: val,
			['customThumb_' + _id]: local.customThumbnails[i],
		}
	})

	delete local.custom
	delete local.customIndex
	delete local.customThumbnails

	return local
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

	clas(domedit, true, 'hiding')
	document.querySelectorAll('#linkblocks img').forEach((img) => clas(img, false, 'selected'))
	setTimeout(() => {
		domedit ? domedit.setAttribute('class', '') : ''
	}, 200)
}

export const getBrowserStorage = () => {
	storage.local.get(null, (local) => {
		storage.sync.get(null, (sync) => console.log('local: ', local, 'sync: ', sync))
	})
}

export function deleteBrowserStorage() {
	if (detectPlatform() !== 'online') {
		storage.sync.clear()
		storage.local.clear()
	}

	localStorage.clear()

	setTimeout(() => {
		location.reload()
	}, 400)
}

export function errorMessage(comment: string, error?: unknown) {
	const dominterface = $('interface')

	function displayMessage(dataStr: string) {
		const warning = document.createElement('div')
		const title = document.createElement('h1')
		const subtitle = document.createElement('p')
		const errorcode = document.createElement('textarea')
		const explain = document.createElement('p')
		const resetButton = document.createElement('button')
		const closeError = document.createElement('button')
		const buttonWrap = document.createElement('div')

		title.textContent = comment + ' 😖'
		subtitle.textContent = `Copy your settings below and contact us !`
		explain.textContent =
			'Sharing your settings with us helps a lot in debugging. You can also reset Bonjourr, or close this window for now if you think it is a false alert.'

		explain.className = 'error-explain'

		errorcode.textContent = dataStr
		errorcode.setAttribute('spellcheck', 'false')

		resetButton.textContent = 'Reset Bonjourr'
		resetButton.addEventListener('click', () => {
			warning.style.opacity = '0'
			deleteBrowserStorage()
		})

		closeError.className = 'error-buttons-close'
		closeError.textContent = 'Close this window'
		closeError.addEventListener('click', () => {
			sessionStorage.errorMessage = 'removed'
			warning.style.opacity = '0'
			setTimeout(() => (warning.style.display = 'none'), 400)
		})

		buttonWrap.className = 'error-buttons'
		buttonWrap.appendChild(resetButton)
		buttonWrap.appendChild(closeError)

		warning.appendChild(title)
		warning.appendChild(subtitle)
		warning.appendChild(errorcode)
		warning.appendChild(explain)
		warning.appendChild(buttonWrap)

		warning.id = 'error'
		document.body.prepend(warning)

		dominterface ? (dominterface.style.opacity = '1') : ''

		setTimeout(() => (warning.style.opacity = '1'), 20)
	}

	console.error(error)

	if (sessionStorage.errorMessage === 'removed' && dominterface) {
		dominterface.style.opacity = '1'
		return false
	} else {
		storage.sync.get(null, (data) => {
			try {
				displayMessage(JSON.stringify(data, null, 4))
			} catch (e) {
				displayMessage('')
			}
		})
	}
}

export const testOS = {
	mac: window.navigator.appVersion.includes('Macintosh'),
	windows: window.navigator.appVersion.includes('Windows'),
	android: window.navigator.userAgent.includes('Android'),
	ios:
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
		(navigator.userAgent.includes('Mac') && 'ontouchend' in document),
}

export const safeFontList = {
	fallback: { placeholder: 'Arial', weights: ['500', '600', '800'] },
	windows: { placeholder: 'Segoe UI', weights: ['300', '400', '600', '700', '800'] },
	android: { placeholder: 'Roboto', weights: ['100', '300', '400', '500', '700', '900'] },
	linux: { placeholder: 'Fira Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
	apple: { placeholder: 'SF Pro Display', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
}

let defaultLang: LangList = 'en'
const navLang = navigator.language.replace('-', '_')

// check if exact or similar languages are available
for (const [code] of Object.entries(langList)) {
	if (navLang === code || navLang.startsWith(code.substring(0, 2))) {
		defaultLang = code as LangList
	}
}

export function tradThis(str: string, lang?: string): string {
	type DictKey = keyof typeof dict
	type DictField = keyof typeof dict.April

	if (!lang) {
		lang = document.documentElement.getAttribute('lang') || 'en'
	}

	if (!Object.keys(dict.April).includes(lang)) {
		return str // English or not a dict field key ? no trn
	}

	if (Object.keys(dict).includes(str)) {
		return dict[str as DictKey][lang as DictField] // String is a key of dict & lang is a key of dict[...]
	}

	return str // String was not a key of dict
}

export const syncDefaults: Sync = {
	about: { browser: detectPlatform(), version: '1.16.0' },
	usdate: false,
	showall: false,
	quicklinks: true,
	time: true,
	main: true,
	linksrow: 6,
	linknewtab: false,
	linkstyle: 'large',
	cssHeight: 80,
	reviewPopup: 0,
	background_blur: 15,
	background_bright: 0.8,
	textShadow: 0.2,
	hide: {},
	css: '',
	lang: defaultLang,
	favicon: '',
	tabtitle: '',
	greeting: '',
	dark: 'system',
	custom_time: 1650516688,
	custom_every: 'pause',
	background_type: 'dynamic',
	clock: {
		ampm: false,
		analog: false,
		seconds: false,
		face: 'none',
		timezone: 'auto',
	},
	dynamic: {
		every: 'hour',
		collection: '',
		lastCollec: 'day',
		time: Date.now(),
	},
	weather: {
		ccode: 'FR',
		city: 'Paris',
		unit: 'metric',
		location: [],
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
		weight: testOS.windows ? '400' : '300',
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
	waitingForPreload: false,
	userQuoteSelection: 0,
	selectedId: '',
	idsList: [],
	quotesCache: [],
	dynamicCache: {
		noon: [],
		day: [],
		evening: [],
		night: [],
		user: [],
	},
}
