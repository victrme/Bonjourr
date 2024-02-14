import notes from './features/notes'
import clock from './features/clock'
import weather from './features/weather'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import moveElements from './features/move'
import hideElements from './features/hide'
import interfacePopup from './features/popup'
import initBackground from './features/backgrounds'
import { settingsInit } from './settings'
import { syncNewBookmarks } from './features/links/bookmarks'
import quotes, { oldJSONToCSV } from './features/quotes'
import storage, { getSyncDefaults } from './storage'

import { SYSTEM_OS, BROWSER, PLATFORM, IS_MOBILE, SYNC_DEFAULT, CURRENT_VERSION, ENVIRONNEMENT } from './defaults'
import { traduction, tradThis, setTranslationCache } from './utils/translations'
import { stringMaxSize, freqControl, linksDataMigration } from './utils'
import { eventDebounce } from './utils/debounce'
import onSettingsLoad from './utils/onsettingsload'
import errorMessage from './utils/errormessage'
import suntime from './utils/suntime'

type FeaturesToWait = 'clock' | 'links' | 'fonts' | 'quotes'

const dominterface = document.getElementById('interface') as HTMLDivElement
const features: FeaturesToWait[] = ['clock', 'links']
let loadtime = performance.now()

//
//	Startup
//

try {
	startup()
	serviceWorker()
	onlineAndMobile()
} catch (error) {
	errorMessage(error)
}

async function startup() {
	let { sync, local } = await storage.init()

	// -------- TEMPORAIRE
	// To remove for next version, or it could show 19.0 popup twice !!
	const isNotNewUser = sync.reviewPopup === 'removed' || parseInt(sync?.reviewPopup + '') > 30
	const aboutNotSaved = sync?.about?.version === undefined

	if (isNotNewUser && aboutNotSaved) {
		sync.about = {
			browser: SYNC_DEFAULT.about.browser,
			version: '1.18.4',
		}
	}
	// -------- TEMPORAIRE END

	const OLD_VERSION = sync?.about?.version
	const versionChanged = OLD_VERSION !== CURRENT_VERSION
	const firstStart = OLD_VERSION === undefined && Object.keys(sync).length === 0

	if (versionChanged) {
		if (firstStart) {
			console.log(`First install: ${CURRENT_VERSION}`)
			sync = await getSyncDefaults()
		} else {
			console.log(`Version change: ${OLD_VERSION} => ${CURRENT_VERSION}`)
			sync = upgradeSyncStorage(sync)
		}

		storage.sync.set(sync)
	}

	await setTranslationCache(sync.lang, local, versionChanged)

	displayInterface(undefined, sync)
	traduction(null, sync.lang)
	suntime(local.lastWeather?.sunrise, local.lastWeather?.sunset)
	weather({ sync: sync, lastWeather: local.lastWeather })
	customFont(sync.font)
	textShadow(sync.textShadow)
	favicon(sync.favicon)
	tabTitle(sync.tabtitle)
	clock(sync)
	darkmode(sync.dark)
	searchbar(sync.searchbar)
	quotes({ sync: sync, local })
	notes(sync.notes)
	moveElements(sync.move)
	customCss(sync.css)
	hideElements(sync.hide)
	initBackground(sync, local)
	quickLinks(sync)
	syncNewBookmarks(sync.syncbookmarks)
	pageControl({ width: sync.pagewidth, gap: sync.pagegap })

	document.getElementById('time')?.classList.toggle('hidden', !sync.time)
	document.getElementById('main')?.classList.toggle('hidden', !sync.main)

	onSettingsLoad(() => {
		setPotatoComputerMode()
		interfacePopup({
			old: OLD_VERSION,
			new: CURRENT_VERSION,
			review: sync.review ?? 0,
			announce: sync.announcements,
		})
	})
}

function upgradeSyncStorage(data: Sync.Storage): Sync.Storage {
	// 19.0.0

	if (data.reviewPopup) {
		data.review = data.reviewPopup === 'removed' ? -1 : +data.reviewPopup
	}

	if (Array.isArray(data?.quotes?.userlist)) {
		const newuserlist = oldJSONToCSV(data?.quotes?.userlist as unknown as Quotes.UserInput)
		data.quotes.userlist = newuserlist
	}

	if (!data.dateformat) {
		data.dateformat = data.usdate ? 'us' : 'eu'
	}

	if (!data.linktabs) {
		data.linktabs = { ...SYNC_DEFAULT.linktabs }
	}

	if (data?.css) {
		data.css = data.css
			.replaceAll('#clock', '#digital')
			.replaceAll('#analogClock', '#analog')
			.replaceAll('#center', '#analog-center')
			.replaceAll('#hours', '#analog-hours')
			.replaceAll('#minutes', '#analog-minutes')
			.replaceAll('#analogSeconds', '#analog-seconds')
	}

	storage.sync.remove('reviewPopup')
	storage.sync.remove('usdate')
	delete data.reviewPopup
	delete data.usdate

	data = linksDataMigration(data)
	data.about = SYNC_DEFAULT.about

	return data
}

function onlineAndMobile() {
	const onlineFirefoxMobile = PLATFORM === 'online' && BROWSER === 'firefox' && IS_MOBILE
	const onlineSafariIOS = PLATFORM === 'online' && BROWSER === 'safari' && SYSTEM_OS === 'ios'
	let visibilityHasChanged = false
	let firefoxRAFTimeout: number

	if (IS_MOBILE) {
		document.addEventListener('visibilitychange', updateOnVisibilityChange)
	}

	if (onlineFirefoxMobile) {
		// Firefox cannot -moz-fill-available with height
		// On desktop, uses fallback 100vh
		// On mobile, sets height dynamically because vh is bad on mobile

		updateAppHeight()

		// Fix for opening tabs Firefox iOS
		if (SYSTEM_OS === 'ios') {
			window.requestAnimationFrame(triggerAnimationFrame)
			setTimeout(() => cancelAnimationFrame(firefoxRAFTimeout), 500)
		}
	}

	if (onlineSafariIOS) {
		onSettingsLoad(() => {
			const inputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea')

			for (const input of inputs) {
				input.addEventListener('focus', disableTouchAction)
				input.addEventListener('blur', enableTouchAction)
			}
		})
	}

	async function updateOnVisibilityChange() {
		if (visibilityHasChanged === false) {
			visibilityHasChanged = true
			return
		}

		visibilityHasChanged = false

		const data = await storage.sync.get()
		const local = await storage.local.get(['unsplashCache', 'lastWeather'])

		if (!data?.clock || !data?.weather) {
			return
		}

		const frequency = freqControl.get(data.unsplash.every, data.unsplash.time ?? Date.now())
		const needNewImage = data.background_type === 'unsplash' && frequency

		if (needNewImage && data.unsplash) {
			initBackground(data, local)
		}

		clock(data)
		weather({ sync: data, lastWeather: local.lastWeather })
	}

	function triggerAnimationFrame() {
		updateAppHeight()
		firefoxRAFTimeout = requestAnimationFrame(triggerAnimationFrame)
	}

	function updateAppHeight() {
		document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
	}

	function disableTouchAction() {
		const settingsDom = document.getElementById('settings') as HTMLElement
		if (dominterface && settingsDom) {
			dominterface.style.touchAction = 'none'
			settingsDom.style.touchAction = 'none'
		}
	}

	function enableTouchAction() {
		const settingsDom = document.getElementById('settings') as HTMLElement
		if (dominterface && settingsDom) {
			dominterface.style.removeProperty('touch-action')
			settingsDom.style.removeProperty('touch-action')
		}
	}
}

function serviceWorker() {
	if (ENVIRONNEMENT !== 'PROD' || PLATFORM !== 'online' || !('serviceWorker' in navigator)) {
		return
	}

	navigator.serviceWorker.register('service-worker.js')

	let promptEvent // PWA install trigger (30s interaction default)
	window.addEventListener('beforeinstallprompt', function (e) {
		promptEvent = e
		return promptEvent
	})
}

async function setPotatoComputerMode() {
	if (BROWSER === 'firefox' || BROWSER === 'safari') {
		// firefox fingerprinting protection disables webgl info, smh
		// safari always have hardware acceleration, no need for potato
		return
	}

	const canvas = document.createElement('canvas')
	const gl = canvas?.getContext('webgl')
	const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')

	if (BROWSER === 'chrome' && !gl) {
		document.body.classList.add('potato')
		return
	}

	const vendor = gl?.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? 0) + ''
	const renderer = gl?.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? 0) + ''

	if (vendor.includes('Google') && renderer.includes('SwiftShader')) {
		document.body.classList.add('potato')
	}
}

export function displayInterface(ready?: FeaturesToWait, data?: Sync.Storage) {
	if (data) {
		if (data?.font?.family) features.push('fonts')
		if (data?.quotes?.on) features.push('quotes')
		return
	} else if (!ready) {
		return
	}

	const index = features.indexOf(ready)

	if (index !== -1) {
		features.splice(index, 1)
	} else return

	if (features.length > 0) {
		return
	}

	loadtime = Math.min(performance.now() - loadtime, 400)
	loadtime = loadtime > 33 ? loadtime : 0
	document.documentElement.style.setProperty('--load-time-transition', loadtime + 'ms')
	document.body.classList.remove('loading')

	setTimeout(() => {
		document.body.classList.remove('init')
		settingsInit()
	}, loadtime + 400)
}

//
//
//

export function favicon(val?: string, isEvent?: true) {
	function createFavicon(emoji?: string) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="85">${emoji}</text></svg>`
		const defaulticon = '/src/assets/' + (BROWSER === 'edge' ? 'monochrome.png' : 'favicon.ico')
		const domfavicon = document.getElementById('favicon') as HTMLLinkElement

		domfavicon.href = emoji ? svg : defaulticon
	}

	if (isEvent) {
		const isEmoji = val?.match(/\p{Emoji}/gu) && !val?.match(/[0-9a-z]/g)
		eventDebounce({ favicon: isEmoji ? val : '' })
		document.getElementById('head-favicon')?.remove()
	}

	if (BROWSER === 'firefox') {
		setTimeout(() => createFavicon(val), 0)
	} else {
		createFavicon(val)
	}
}

export function tabTitle(val = '', isEvent?: true) {
	document.title = stringMaxSize(val, 80) || tradThis('New tab')

	if (isEvent) {
		eventDebounce({ tabtitle: stringMaxSize(val, 80) })
	}
}

export function pageControl(val: { width?: number; gap?: number }, isEvent?: true) {
	if (val.width) {
		document.documentElement.style.setProperty('--page-width', (val.width ?? SYNC_DEFAULT.pagewidth) + 'px')
		if (isEvent) eventDebounce({ pagewidth: val.width })
	}

	if (typeof val.gap === 'number') {
		document.documentElement.style.setProperty('--page-gap', (val.gap ?? SYNC_DEFAULT.pagegap) + 'em')
		if (isEvent) eventDebounce({ pagegap: val.gap })
	}
}

export function darkmode(value: 'auto' | 'system' | 'enable' | 'disable', isEvent?: boolean) {
	if (isEvent) {
		storage.sync.set({ dark: value })
	}

	if (value === 'auto') {
		const now = Date.now()
		const { sunrise, sunset } = suntime()
		const choice = now <= sunrise || now > sunset ? 'dark' : 'light'
		document.documentElement.dataset.theme = choice
	}

	if (value === 'disable') document.documentElement.dataset.theme = 'light'
	if (value === 'enable') document.documentElement.dataset.theme = 'dark'
	if (value === 'system') document.documentElement.dataset.theme = ''
}

export function textShadow(init?: number, event?: number) {
	const val = init ?? event
	document.documentElement.style.setProperty('--text-shadow-alpha', (val ?? 0.2)?.toString())

	if (typeof event === 'number') {
		eventDebounce({ textShadow: val })
	}
}

export function customCss(init?: string, event?: { styling: string }) {
	const styleHead = document.getElementById('styles') as HTMLStyleElement
	let skipFirstResize = true

	if (event) {
		if (event?.styling !== undefined) {
			const val = stringMaxSize(event.styling, 8080)
			styleHead.textContent = val
			eventDebounce({ css: val })
		}

		return
	}

	if (init) {
		styleHead.textContent = init
	}

	onSettingsLoad(function saveHeightOnResize() {
		const observer = new ResizeObserver((entry) => {
			if (skipFirstResize) {
				skipFirstResize = false
				return
			}

			const rect = entry[0].contentRect
			eventDebounce({ cssHeight: Math.round(rect.height + rect.top * 2) })
		})

		observer.observe(document.getElementById('cssEditor') as HTMLElement)
	})
}

// Unfocus address bar on chromium
// https://stackoverflow.com/q/64868024
// if (window.location.search !== '?r=1') {
// 	window.location.assign('index.html?r=1')
// }
