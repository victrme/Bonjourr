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
	googleFontList = {},
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

const mobilecheck =
	navigator.userAgentData !== undefined
		? navigator.userAgentData.mobile
		: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

const isExtension = window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
	loadtimeStart = performance.now(),
	BonjourrAnimTime = 400,
	funcsOk = {
		clock: false,
		links: false,
	}

const stringMaxSize = (string, size) => (string.length > size ? string.slice(0, size) : string)
const minutator = (date) => date.getHours() * 60 + date.getMinutes()

// lsOnlineStorage works exactly like chrome.storage
// Just need to replace every chrome.storage
// And maybe change import option

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

	setLocal: (prop) => {
		lsOnlineStorage.get(true, null, (data) => {
			if (typeof prop === 'object') {
				data = {
					...data,
					...prop,
				}
				localStorage.bonjourrBackgrounds = JSON.stringify(data)
			}
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
}

function consolr(flat, data) {
	if (flat) console.log(data)
	else Object.entries(data).forEach((elem) => console.log(elem[0], elem[1]))
}

const testOS = {
	mac: () => window.navigator.appVersion.includes('Macintosh'),
	windows: () => window.navigator.appVersion.includes('Windows'),
	android: () => window.navigator.userAgent.includes('Android'),
	ios: () =>
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
		(navigator.userAgent.includes('Mac') && 'ontouchend' in document),
}

function bonjourrDefaults(which) {
	switch (which) {
		case 'sync':
			return {
				usdate: false,
				showall: false,
				searchbar: false,
				searchbar_newtab: false,
				linksrow: 6,
				cssHeight: 80,
				reviewPopup: 0,
				background_blur: 15,
				background_bright: 0.8,
				css: '',
				lang: 'en',
				greeting: '',
				background_type: 'dynamic',
				searchbar_engine: 'google',
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
				},
				font: {
					url: '',
					family: '',
					weight: '400',
					availWeights: [],
				},
				hide: [[0, 0], [0, 0, 0], [0], [0]],
				about: { browser: 'chrome', version: '1.10.0' },
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

// function defaultImages(collection) {
// 	const size = screen.width * window.devicePixelRatio
// 	const domain = 'https://images.unsplash.com/'

// 	switch (collection) {
// 		case 'day':
// 			return {
// 				city: 'Santander',
// 				color: '#0c4059',
// 				country: 'Spain',
// 				username: 'willianjusten',
// 				name: 'Willian Justen de Vasconcellos',
// 				link: 'https://unsplash.com/photos/8sHZE1CXG4w',
// 				url: domain + 'photo-1519314885287-6040aee8e4ea?&w=' + size,
// 			}

// 		case 'night':
// 			return {
// 				city: null,
// 				color: '#262626',
// 				country: null,
// 				name: 'eberhard 🖐 grossgasteiger',
// 				link: 'https://unsplash.com/photos/OaXn4QRu-QQ',
// 				url: domain + 'photo-1621173865296-baaf7dc3afcc?&w=' + size,
// 			}

// 		case 'noon':
// 			return {
// 				city: null,
// 				color: '#26260c',
// 				country: null,
// 				username: 'tanelah',
// 				name: 'Taneli Lahtinen',
// 				link: 'https://unsplash.com/photos/suSwPNTaQ5Q',
// 				url: domain + 'photo-1565772838491-cbeb32fac6ca?&w=' + size,
// 			}

// 		case 'evening':
// 			return {
// 				city: null,
// 				color: '#0c2626',
// 				country: null,
// 				link: 'https://unsplash.com/photos/M0fZzkiioI0',
// 				name: 'Patrick Jansen',
// 				url: domain + 'photo-1618972078577-80ad6b66fd72?&w=' + size,
// 				username: 'patrickjjansen',
// 			}

// 		default:
// 			break
// 	}
// }
