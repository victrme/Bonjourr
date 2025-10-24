import { darkmode, favicon, pageControl, tabTitle, textShadow } from './features/others.ts'
import { supportersNotifications } from './features/supporters.ts'
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
import { pomodoro } from './features/pomodoro.ts'
import { notes } from './features/notes.ts'
import { clock } from './features/clock.ts'
import './features/contextmenu.ts'

import { displayInterface, onInterfaceDisplay } from './shared/display.ts'
import { setTranslationCache, traduction } from './utils/translations.ts'
import { needsChange, suntime, userDate } from './shared/time.ts'
import { onSettingsLoad } from './utils/onsettingsload.ts'
import { settingsInit } from './settings.ts'
import { userActions } from './events.ts'
import { filterData } from './compatibility/apply.ts'
import { storage } from './storage.ts'

import {
	BROWSER,
	CURRENT_VERSION,
	ENVIRONNEMENT,
	IS_MOBILE,
	LOCAL_DEFAULT,
	PLATFORM,
	SYNC_DEFAULT,
	SYSTEM_OS,
	TAB_ID,
	tabs_bc
} from './defaults.ts'

try {
	startup()
	serviceWorker()
	onlineAndMobile()
} catch (_) {
	console.warn('Startup failed')
}

async function startup() {
	let { sync, local } = await storage.init()
	const oldVersion = sync?.about?.version

	if (!sync || !local) {
		console.warn('Storage failed, loading Bonjourr with default settings')
		sync = structuredClone(SYNC_DEFAULT)
		local = structuredClone(LOCAL_DEFAULT)
	}

	if (oldVersion !== CURRENT_VERSION) {
		console.info(`Updated Bonjourr, ${oldVersion} => ${CURRENT_VERSION}`)

		localStorage.setItem('update-archive', JSON.stringify(sync))

		sync = filterData('update', sync)

		local.translations = undefined
		storage.local.remove('translations')
		local = { ...LOCAL_DEFAULT, ...local }

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
	pomodoro(sync.pomodoro)
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
	keepTrackOfTabs()

	document.documentElement.dataset.system = SYSTEM_OS as string
	document.documentElement.dataset.browser = BROWSER as string
	document.documentElement.dataset.platform = PLATFORM as string

	document.getElementById('time')?.classList.toggle('hidden', !sync.time)
	document.getElementById('main')?.classList.toggle('hidden', !sync.main)

	onInterfaceDisplay(() => {
		document.body.classList.remove('init')

		setPotatoComputerMode()
		userActions()

		supportersNotifications(sync)

		interfacePopup({
			announce: sync.announcements,
			review: sync.review ?? 0,
			new: CURRENT_VERSION,
			old: oldVersion,
		})
	})
}

function onlineAndMobile() {
	const dominterface = document.getElementById('interface') as HTMLDivElement
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

		const sync = await storage.sync.get()
		const local = await storage.local.get()
		const { backgroundLastChange, lastWeather } = local

		if (!sync.clock || !sync.weather) {
			return
		}

		const time = (backgroundLastChange ? new Date(backgroundLastChange) : new Date()).getTime()
		const needNew = needsChange(sync.backgrounds.frequency, time)
		const notColor = sync.backgrounds.type !== 'color'

		clock(sync)
		weather({ sync, lastWeather })

		if (notColor && needNew) {
			backgroundsInit(sync, local)
		}
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

	globalThis.addEventListener('beforeinstallprompt', (e) => {
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

// to keep track of which Bonjourr tab the user interacted with last
function keepTrackOfTabs() {
	// Whenever the tab becomes visible or focused, mark it as active
	function updateLastActiveTab() {
		localStorage.setItem('lastActiveTab', TAB_ID)
	}

	
	if (!document.hidden) {
		updateLastActiveTab()
	}

	window.addEventListener('focus', updateLastActiveTab)
	window.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			updateLastActiveTab()
		}
	})

	// sends event to other tabs when tab gets closed
	window.addEventListener('beforeunload', () => {
		tabs_bc.postMessage('tabClosed')
	})

	tabs_bc.onmessage = (event) => {
		// when receiving tabClosed event, sets this tab as the last active one
		if (event.data === 'tabClosed') {
			updateLastActiveTab()
		}
	}
}