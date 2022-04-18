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

const isExtension =
		window.location.protocol === 'chrome-extension:' ||
		window.location.protocol === 'moz-extension:' ||
		window.location.protocol === 'safari-web-extension:',
	isOnlineOrSafari = window.location.protocol === 'safari-web-extension:' || window.location.protocol.match(/https?:/gim),
	loadtimeStart = performance.now(),
	BonjourrBrowser = detectPlatform(),
	BonjourrVersion = '1.13.0',
	BonjourrAnimTime = 400,
	funcsOk = {
		clock: false,
		links: false,
	}

//
//
// Functions
//
//

const stringMaxSize = (string, size) => (string.length > size ? string.slice(0, size) : string)
const minutator = (date) => date.getHours() * 60 + date.getMinutes()

const randomString = (len) => {
	const chars = 'abcdefghijklmnopqr'
	return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function detectPlatform() {
	const p = window.location.protocol
	return p === 'moz-extension:'
		? 'firefox'
		: p === 'chrome-extension:'
		? 'chrome'
		: p === 'safari-web-extension:'
		? 'safari'
		: 'online'
}

function validateHideElem(hide) {
	let res = true

	Array.isArray(hide) && hide.length > 0
		? hide.forEach((parent) => {
				Array.isArray(parent)
					? parent.forEach((child) => {
							typeof child === 'number' ? '' : (res = false)
					  })
					: (res = false)
		  })
		: (res = false)

	return res
}

function bundleLinks(storage) {
	// 1.13.0: Returns an array of found links in storage
	let res = []
	Object.entries(storage).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) res.push(val)
	})

	res.sort((a, b) => a.order - b.order)
	return res
}

function slowRange(tosave, time = 400) {
	clearTimeout(rangeActive)
	rangeActive = setTimeout(function () {
		chrome.storage.sync.set(tosave)
	}, time)
}

function slow(that, time = 400) {
	that.setAttribute('disabled', '')
	stillActive = setTimeout(() => {
		that.removeAttribute('disabled')
		clearTimeout(stillActive)
		stillActive = false
	}, time)
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

				try {
					localStorage.bonjourr = JSON.stringify(data)
					if (callback) callback
				} catch (error) {
					console.warn(error)
					console.warn("Bonjourr couldn't save this setting 😅\nMemory might be full")
				}

				window.dispatchEvent(new Event('storage'))
			}
		})
	},
	clear: () => {
		localStorage.removeItem('bonjourr')
	},
	setLocal: (prop, callback) => {
		lsOnlineStorage.get(true, null, (data) => {
			if (typeof prop === 'object') {
				data = { ...data, ...prop }

				try {
					localStorage.bonjourrBackgrounds = JSON.stringify(data)
					if (callback) callback
				} catch (error) {
					console.log(error)
					console.log(console.warn("Bonjourr couldn't save this setting 😅\nMemory might be full"))
				}
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

const getBrowserStorage = () => {
	chrome.storage.local.get(null, (local) => {
		chrome.storage.sync.get(null, (sync) => console.log('local: ', local, 'sync: ', sync))
	})
}

const logsync = () =>
	chrome.storage.sync.get(null, (data) => Object.entries(data).forEach((elem) => console.log(elem[0], elem[1])))
const loglocal = () =>
	chrome.storage.local.get(null, (data) => Object.entries(data).forEach((elem) => console.log(elem[0], elem[1])))

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

function errorMessage(comment, error) {
	function displayMessage(dataStr) {
		const warning = document.createElement('div')
		const title = document.createElement('h1')
		const subtitle = document.createElement('p')
		const errorcode = document.createElement('pre')
		const explain = document.createElement('p')
		const resetButton = document.createElement('button')
		const closeError = document.createElement('button')
		const buttonWrap = document.createElement('div')

		title.textContent = 'Bonjourr has a problem 😖'
		subtitle.textContent = `Copy this message below and contact us !`
		explain.textContent =
			'Sharing this message with us helps a lot in debugging. You can also reset Bonjourr, or close this window for now if you think it is a false alert.'

		explain.className = 'error-explain'

		errorcode.textContent = comment + ': ' + dataStr
		resetButton.textContent = 'Reset Bonjourr'
		resetButton.addEventListener('click', () => {
			warning.style.opacity = 0
			deleteBrowserStorage()
		})

		closeError.className = 'error-buttons-close'
		closeError.textContent = 'Close this window'
		closeError.addEventListener('click', () => {
			sessionStorage.errorMessage = 'removed'
			warning.style.opacity = 0
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

		dominterface.style.opacity = '1'

		setTimeout(() => (warning.style.opacity = 1), 20)
	}

	console.log(error)

	if (sessionStorage.errorMessage === 'removed') {
		dominterface.style.opacity = '1'
		return false
	} else {
		chrome.storage.sync.get(null, (data) => {
			try {
				displayMessage(JSON.stringify(data))
			} catch (e) {
				displayMessage('', 'Could not load settings')
			}
		})
	}
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
				favicon: '',
				greeting: '',
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
					lastCollec: '',
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
				searchbar: {
					on: false,
					opacity: 0.1,
					newtab: false,
					engine: 'google',
					request: '',
				},
				quotes: {
					on: false,
					type: 'classic',
					author: false,
					frequency: 'day',
					last: '',
				},
				font: {
					url: '',
					family: '',
					size: '14',
					availWeights: [],
					weight: testOS.windows() || testOS.ios() ? '400' : '300',
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
