import { textShadow, favicon, tabTitle, darkmode, pageControl } from './features/others.ts'
import { supportersNotifications } from './features/supporters.ts'
import { migrateToNewIdbFormat } from './features/backgrounds/local.ts'
import { synchronization } from './features/synchronization/index.ts'
import { backgroundsInit } from './features/backgrounds/index.ts'
import { interfacePopup } from './features/popup.ts'
import { moveElements } from './features/move/index.ts'
import { hideElements } from './features/hide.ts'
import { customFont } from './features/fonts.ts'
import { quickLinks } from './features/links/index.ts'
import { searchbar } from './features/searchbar.ts'
import { customCss } from './features/css.ts'
import { weather } from './features/weather/index.ts'
import { quotes } from './features/quotes.ts'
import { notes } from './features/notes.ts'
import { clock } from './features/clock.ts'

import { SYSTEM_OS, BROWSER, PLATFORM, IS_MOBILE, CURRENT_VERSION, ENVIRONNEMENT } from './defaults.ts'
import { traduction, setTranslationCache } from './utils/translations.ts'
import { needsChange, userDate, suntime } from './shared/time.ts'
import { onSettingsLoad } from './utils/onsettingsload.ts'
import { filterImports } from './imports.ts'
import { settingsInit } from './settings.ts'
import { userActions } from './events.ts'
import { storage } from './storage.ts'
import 'clickdown'

import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

type FeaturesToWait = 'clock' | 'links' | 'fonts' | 'quotes'

const dominterface = document.getElementById('interface') as HTMLDivElement
const features: FeaturesToWait[] = ['clock', 'links']
let interfaceDisplayCallback = () => undefined
let loadtime = performance.now()

//	Startup

try {
	startup()
	serviceWorker()
	onlineAndMobile()
} catch (_) {
	// ...
}

async function startup() {
	let { sync, local } = await storage.init()
	const oldVersion = sync?.about?.version

	if (!(sync && local)) {
		return
	}

	if (oldVersion !== CURRENT_VERSION) {
		sync = upgradeSyncStorage(sync)
		local = upgradeLocalStorage(local)
		await migrateToNewIdbFormat(local)

		// <!> do not move
		// <!> must delete old keys before upgrading storage
		await storage.sync.clear()
		await storage.sync.set(sync)
	}

	await setTranslationCache(sync.lang, local)
	displayInterface(undefined, sync)
	traduction(null, sync.lang)
	userDate(sync.clock.timezone)
	suntime(local.lastWeather?.sunrise, local.lastWeather?.sunset)

	weather({ sync: sync, lastWeather: local.lastWeather })
	customFont(sync.font)
	textShadow(sync.textShadow)
	favicon(sync.favicon)
	tabTitle(sync.tabtitle)
	clock(sync)
	darkmode(sync.dark)
	searchbar(sync.searchbar)
	quotes({ sync, local })
	notes(sync.notes)
	moveElements(sync.move)
	customCss(sync.css)
	hideElements(sync.hide)
	backgroundsInit(sync, local, true)
	quickLinks(sync)
	synchronization(local)
	settingsInit(sync, local)
	pageControl({ width: sync.pagewidth, gap: sync.pagegap })
	operaExtensionExplainer(local.operaExplained)

	document.documentElement.dataset.system = SYSTEM_OS as string
	document.documentElement.dataset.browser = BROWSER as string
	document.documentElement.dataset.platform = PLATFORM as string

	document.getElementById('time')?.classList.toggle('hidden', !sync.time)
	document.getElementById('main')?.classList.toggle('hidden', !sync.main)

	onInterfaceDisplay(() => {
		document.body.classList.remove('init')

		setPotatoComputerMode()
		userActions()

		supportersNotifications({
			supporters: sync.supporters,
			review: sync.review,
		})

		interfacePopup({
			announce: sync.announcements,
			review: sync.review ?? 0,
			new: CURRENT_VERSION,
			old: oldVersion,
		})
	})
}

function upgradeSyncStorage(data: Sync): Sync {
	return filterImports(data, data)
}

function upgradeLocalStorage(data: Local): Local {
	data.translations = undefined
	storage.local.remove('translations')

	// data.lastWeather = undefined
	// storage.local.remove('lastWeather')

	return data
}

export function displayInterface(ready?: FeaturesToWait, data?: Sync) {
	if (data) {
		if (data?.font?.family) {
			features.push('fonts')
		}
		if (data?.quotes?.on) {
			features.push('quotes')
		}

		return
	}

	if (!ready) {
		return
	}

	const index = features.indexOf(ready)

	if (index !== -1) {
		features.splice(index, 1)
	} else {
		return
	}

	if (features.length > 0) {
		return
	}

	loadtime = Math.min(performance.now() - loadtime, 333)
	loadtime = loadtime > 33 ? loadtime : 0
	document.documentElement.style.setProperty('--load-time-transition', `${loadtime}ms`)
	document.body.classList.remove('loading')

	setTimeout(
		() => {
			onInterfaceDisplay()
		},
		Math.max(333, loadtime),
	)
}

function onInterfaceDisplay(callback?: () => undefined): void {
	if (callback) {
		interfaceDisplayCallback = callback
	} else {
		interfaceDisplayCallback()
	}
}

function onlineAndMobile() {
	const onlineFirefoxMobile = PLATFORM === 'online' && BROWSER === 'firefox' && IS_MOBILE
	const onlineSafariIos = PLATFORM === 'online' && BROWSER === 'safari' && SYSTEM_OS === 'ios'
	let visibilityHasChanged = false
	let firefoxRafTimeout: number

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
			globalThis.requestAnimationFrame(triggerAnimationFrame)
			setTimeout(() => cancelAnimationFrame(firefoxRafTimeout), 500)
		}
	}

	if (onlineSafariIos) {
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
		const local = await storage.local.get()

		if (!(data?.clock && data?.weather)) {
			return
		}

		const last = local.backgroundLastChange
		const time = (last ? new Date(last) : new Date()).getTime()
		const frequency = needsChange(data.backgrounds.frequency, time)
		const needNewImage = data.background_type === 'unsplash' && frequency

		if (needNewImage && data.unsplash) {
			backgroundsInit(data, local)
		}

		clock(data)
		weather({ sync: data, lastWeather: local.lastWeather })
	}

	function triggerAnimationFrame() {
		updateAppHeight()
		firefoxRafTimeout = requestAnimationFrame(triggerAnimationFrame)
	}

	function updateAppHeight() {
		document.documentElement.style.setProperty('--app-height', `${globalThis.innerHeight}px`)
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

	let promptEvent: Event // PWA install trigger (30s interaction default)

	globalThis.addEventListener('beforeinstallprompt', e => {
		promptEvent = e
		return promptEvent
	})
}

function setPotatoComputerMode() {
	if (BROWSER === 'firefox' || BROWSER === 'safari') {
		// firefox fingerprinting protection disables webgl info, smh
		// safari always have hardware acceleration, no need for potato
		return
	}

	const fourHours = 1000 * 60 * 60 * 4
	const isPotato = localStorage.potato === 'yes'
	const expirationTime = Date.now() - Number.parseInt(localStorage.lastPotatoCheck ?? '0')

	if (expirationTime < fourHours) {
		document.body.classList.toggle('potato', isPotato)
		return
	}

	const canvas = document.createElement('canvas')
	const gl = canvas?.getContext('webgl')
	const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')

	if (BROWSER === 'chrome' && !gl) {
		document.body.classList.add('potato')
		return
	}

	const vendor = gl?.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? 0).toString()
	const renderer = gl?.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? 0).toString()
	const detectedPotato = vendor.includes('Google') && renderer.includes('SwiftShader')

	localStorage.potato = detectedPotato ? 'yes' : 'no'
	localStorage.lastPotatoCheck = Date.now()
	document.body.classList.toggle('potato', detectedPotato)
}

function operaExtensionExplainer(explained?: true) {
	if (explained || BROWSER !== 'opera' || PLATFORM !== 'chrome') {
		return
	}

	const template = document.getElementById('opera-explainer-template') as HTMLTemplateElement
	const doc = template.content.cloneNode(true) as Document
	const dialog = doc.getElementById('opera-explainer') as HTMLDialogElement
	const button = doc.getElementById('b_opera-explained')

	document.body.classList.add('loading')
	document.body.appendChild(dialog)
	dialog.showModal()
	setTimeout(() => dialog.classList.add('shown'))

	button?.addEventListener('click', () => {
		storage.local.set({ operaExplained: true })
		document.body.classList.remove('loading')
		dialog.close()
	})
}
