//
//
// Vals
//
//

const id = (name) => document.getElementById(name)
const cl = (name) => document.getElementsByClassName(name)
const has = (dom, val) => {
	if (dom && dom.classList) if (dom.classList.length > 0) return dom.classList.contains(val)
	return false
}

const clas = (dom, add, str) => {
	if (add) dom.classList.add(str)
	else dom.classList.remove(str)
}

let lazyClockInterval = setTimeout(() => {}, 0),
	errorMessageInterval = setTimeout(() => {}, 0),
	BonjourrBrowser = 'unknown',
	stillActive = false,
	rangeActive = false,
	firstpaint = false,
	sunset = 0,
	sunrise = 0

const domshowsettings = id('showSettings'),
	domlinkblocks = id('linkblocks_inner'),
	domoverlay = id('background_overlay'),
	dominterface = id('interface'),
	domsearchbar = id('searchbar'),
	domimg = id('background'),
	domthumbnail = cl('thumbnail'),
	domclock = id('clock'),
	domcredit = id('credit')

let mobilecheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
if (navigator.userAgentData) mobilecheck = navigator.userAgentData.mobile

const isExtension = window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
	loadtimeStart = performance.now(),
	BonjourrAnimTime = 400,
	BonjourrVersion = '1.10.1',
	funcsOk = {
		clock: false,
		links: false,
	}

switch (window.location.protocol) {
	case 'http:':
	case 'https:':
	case 'file:':
		BonjourrBrowser = 'online'
		break

	case 'moz-extension:':
		BonjourrBrowser = 'firefox'
		break

	case 'chrome-extension:':
		BonjourrBrowser = 'chrome'
		break

	default:
		BonjourrBrowser = 'chrome'
}

//
//
// Functions
//
//

const stringMaxSize = (string, size) => (string.length > size ? string.slice(0, size) : string)
const minutator = (date) => date.getHours() * 60 + date.getMinutes()

const saveIconAsAlias = (iconstr) => {
	const alias = 'alias:' + Math.random().toString(26).substring(2)
	const tosave = {}
	tosave[alias] = iconstr
	chrome.storage.local.set(tosave)
	return alias
}

// lsOnlineStorage works exactly like chrome.storage
// Just need to replace every chrome.storage

const lsOnlineStorage = {
	get: (local, unused, callback) => {
		const key = local ? 'bonjourrBackgrounds' : 'bonjourr'
		const data = localStorage[key] ? JSON.parse(localStorage[key]) : {}
		callback(data)
	},
	set: (prop, callback) => {
		lsOnlineStorage.get(null, null, (data) => {
			if (typeof prop === 'object') {
				const [key, val] = Object.entries(prop)[0]

				if (key === 'import') data = val
				else data[key] = val

				localStorage.bonjourr = JSON.stringify(data)
				if (callback) callback
			}
		})
	},

	setLocal: (prop, callback) => {
		lsOnlineStorage.get(true, null, (data) => {
			if (typeof prop === 'object') {
				data = {
					...data,
					...prop,
				}
				localStorage.bonjourrBackgrounds = JSON.stringify(data)
			}

			if (callback) callback
		})
	},
	remove: (isLocal, key) => {
		lsOnlineStorage.get(isLocal, null, (data) => {
			delete data[key]
			if (isLocal) localStorage.bonjourrBackgrounds = JSON.stringify(data)
			else localStorage.bonjourr = JSON.stringify(data)
		})
	},
	log: (isLocal) => lsOnlineStorage.get(isLocal, null, (data) => console.log(data)),
	del: () => localStorage.clear(),
}

const logsync = (flat) => chrome.storage.sync.get(null, (data) => consolr(flat, data))
const loglocal = (flat) => chrome.storage.local.get(null, (data) => consolr(flat, data))

function deleteBrowserStorage() {
	if (isExtension) {
		chrome.storage.sync.clear()
		chrome.storage.local.clear()
	}
	localStorage.clear()

	setTimeout(() => {
		location.reload()
	}, 400)
}

function consolr(flat, data) {
	if (flat) console.log(data)
	else Object.entries(data).forEach((elem) => console.log(elem[0], elem[1]))
}

function errorMessage(data, error) {
	const warning = document.createElement('div')
	const title = document.createElement('h1')
	const subtitle = document.createElement('p')
	const contactlink = document.createElement('a')
	const errorcode = document.createElement('pre')
	const resetButton = document.createElement('button')

	title.textContent = 'Bonjourr messed up 😖😖'

	subtitle.textContent = data ? 'Copy your settings ' : 'Copy this error '
	contactlink.textContent = 'and contact us!'
	contactlink.href = `mailto:${atob(atob('WW05dWFtOTFjbkl1WVhCd1FIQnRMbTFs'))}`

	subtitle.appendChild(contactlink)

	errorcode.textContent = data ? data : error.stack
	resetButton.textContent = 'Reset Bonjourr'
	resetButton.addEventListener('click', () => {
		warning.style.opacity = 0
		deleteBrowserStorage()
	})

	warning.appendChild(title)
	warning.appendChild(subtitle)
	warning.appendChild(errorcode)
	warning.appendChild(resetButton)

	warning.id = 'bonjourrError'
	document.body.prepend(warning)

	setTimeout(() => (warning.style.opacity = 1), 20)
}

const testOS = {
	mac: () => window.navigator.appVersion.includes('Macintosh'),
	windows: () => window.navigator.appVersion.includes('Windows'),
	android: () => window.navigator.userAgent.includes('Android'),
	ios: () =>
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
		(navigator.userAgent.includes('Mac') && 'ontouchend' in document),
}

const safeFontList = {
	fallback: { placeholder: 'Arial', weights: [500, 600, 800] },
	windows: { placeholder: 'Segoe UI', weights: [300, 400, 600, 700, 800] },
	android: { placeholder: 'Roboto', weights: [100, 300, 400, 500, 700, 900] },
	linux: { placeholder: 'Fira Sans', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
	apple: { placeholder: 'SF Pro Display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
}

function bonjourrDefaults(which) {
	switch (which) {
		case 'sync':
			return {
				usdate: false,
				showall: false,
				linksrow: 6,
				cssHeight: 80,
				reviewPopup: 0,
				background_blur: 15,
				background_bright: 0.8,
				css: '',
				lang: 'en',
				greeting: '',
				background_type: 'dynamic',
				links: [],
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
					lastCollec: '',
					time: Date.now(),
				},
				weather: {
					ccode: 'FR',
					city: 'Paris',
					unit: 'metric',
					location: [],
					forecast: 'mornings',
				},
				searchbar: {
					on: false,
					opacity: 0.1,
					newtab: false,
					engine: 'google',
					request: '',
				},
				font: {
					url: '',
					family: '',
					availWeights: [],
					size: mobilecheck ? '11' : '14',
					weight: testOS.windows() ? '400' : '300',
				},
				hide: [[0, 0], [0, 0, 0], [0], [0]],
				about: { browser: BonjourrBrowser, version: BonjourrVersion },
			}

		case 'local':
			return {
				custom: [],
				customThumbnails: [],
				dynamicCache: {
					noon: [],
					day: [],
					evening: [],
					night: [],
					user: [],
				},
			}
	}
}
