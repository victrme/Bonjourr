import notes from './features/notes'
import clock from './features/clock'
import weather from './features/weather'
import customCss from './features/css'
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
import { stringMaxSize, freqControl, linksDataMigration, minutator } from './utils'
import { traduction, tradThis, setTranslationCache } from './utils/translations'
import { eventDebounce } from './utils/debounce'
import onSettingsLoad from './utils/onsettingsload'
import errorMessage from './utils/errormessage'
import suntime from './utils/suntime'

type FeaturesToWait = 'clock' | 'links' | 'fonts' | 'quotes'

const dominterface = document.getElementById('interface') as HTMLDivElement
const features: FeaturesToWait[] = ['clock', 'links']
let interfaceDisplayCallback = () => undefined
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

	onInterfaceDisplay(() => {
		document.body.classList.remove('init')

		userActionsEvents()
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

	// 19.2.0

	delete data.cssHeight
	storage.sync.remove('cssHeight')

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
	} else {
		return
	}

	if (features.length > 0) {
		return
	}

	loadtime = Math.min(performance.now() - loadtime, 400)
	loadtime = loadtime > 33 ? loadtime : 0
	document.documentElement.style.setProperty('--load-time-transition', loadtime + 'ms')
	document.body.classList.remove('loading')

	setTimeout(() => {
		onInterfaceDisplay()
	}, Math.max(333, loadtime))
}

function onInterfaceDisplay(callback?: () => undefined): void {
	if (callback) {
		interfaceDisplayCallback = callback
	} else {
		interfaceDisplayCallback()
	}
}

function userActionsEvents() {
	const toggleSettingsMenu = () => document.dispatchEvent(new Event('toggle-settings'))
	const domsuggestions = document.getElementById('sb-suggestions')
	const domshowsettings = document.querySelector('#showSettings')
	let isMousingDownOnInput = false

	document.body.addEventListener('mousedown', detectTargetAsInputs)
	document.getElementById('showSettings')?.addEventListener('click', toggleSettingsMenu)
	document.getElementById('b_editmove')?.addEventListener('click', closeSettingsOnMoveOpen)

	domshowsettings?.addEventListener('mouseenter', settingsFirstLoad)
	domshowsettings?.addEventListener('pointerdown', settingsFirstLoad)
	document.body.addEventListener('keydown', settingsFirstLoad)

	document.addEventListener('click', clickUserActions)
	document.addEventListener('keydown', keydownUserActions)

	async function keydownUserActions(event: KeyboardEvent) {
		if (event.altKey && event.code === 'KeyS') {
			console.clear()
			console.log(localStorage)
			console.log(await storage.sync.get())
		}

		if (event.code === 'Escape') {
			if (domsuggestions?.classList.contains('shown')) {
				domsuggestions?.classList.remove('shown')
				return
			}

			const open = isOpen()

			if (open.contextmenu) {
				document.dispatchEvent(new Event('close-edit'))
			}
			//
			else if (open.settings) {
				toggleSettingsMenu()
			}
			//
			else if (open.selectall) {
				document.dispatchEvent(new Event('remove-select-all'))
			}
			//
			else if (open.folder) {
				document.dispatchEvent(new Event('close-folder'))
			}
			//
			else {
				toggleSettingsMenu()
			}

			return
		}

		if (event.code === 'Tab') {
			document.body.classList.toggle('tabbing', true)
			return
		}
	}

	async function clickUserActions(event: MouseEvent) {
		if (isMousingDownOnInput) {
			return
		}

		const open = isOpen()
		const path = (event.composedPath() as Element[]) ?? [document.body]
		const pathIds = path.map((el) => (el as HTMLElement).id)

		const on = {
			link: path.some((el) => el?.classList?.contains('block')),
			body: (path[0] as HTMLElement).tagName === 'BODY',
			folder: path.some((el) => el?.id === 'linkblocks' && el?.classList?.contains('in-folder')),
			interface: pathIds.includes('interface'),
		}

		if (document.body.classList.contains('tabbing')) {
			document.body?.classList.toggle('tabbing', false)
		}

		if ((on.body || on.interface) === false) {
			return
		}

		if (open.contextmenu) {
			document.dispatchEvent(new Event('close-edit'))
		}
		//
		else if (open.settings) {
			toggleSettingsMenu()
		}
		//
		else if (open.selectall && !on.link) {
			document.dispatchEvent(new Event('remove-select-all'))
		}
		//
		else if (open.folder && !on.folder) {
			document.dispatchEvent(new Event('close-folder'))
		}
	}

	function isOpen() {
		return {
			settings: !!document.getElementById('settings')?.classList.contains('shown'),
			folder: document.getElementById('linkblocks')?.classList.contains('in-folder'),
			selectall: document.getElementById('linkblocks')?.classList.contains('select-all'),
			contextmenu: document.querySelector<HTMLDialogElement>('#editlink')?.open,
		}
	}

	function detectTargetAsInputs(event: Event) {
		const path = event.composedPath() as Element[]
		const tagName = path[0]?.tagName ?? ''
		isMousingDownOnInput = ['TEXTAREA', 'INPUT'].includes(tagName)
	}

	function closeSettingsOnMoveOpen() {
		setTimeout(() => {
			const elementmover = document.getElementById('element-mover')
			const moverHasOpened = elementmover?.classList.contains('hidden') === false

			if (moverHasOpened) {
				toggleSettingsMenu()
			}
		}, 20)
	}

	function settingsFirstLoad(event?: Event) {
		if (document.getElementById('settings')) {
			return
		}

		const type = event?.type
		const code = (event as KeyboardEvent)?.code

		if (code === 'Escape' || type === 'mouseenter' || type === 'pointerdown') {
			domshowsettings?.removeEventListener('mouseenter', settingsFirstLoad)
			domshowsettings?.removeEventListener('pointerdown', settingsFirstLoad)
			document.body.removeEventListener('keydown', settingsFirstLoad)
			settingsInit()
		}

		if (code === 'Escape') {
			setTimeout(() => domshowsettings?.dispatchEvent(new MouseEvent('click')), 20)
		}
	}
}

async function setPotatoComputerMode() {
	if (BROWSER === 'firefox' || BROWSER === 'safari') {
		// firefox fingerprinting protection disables webgl info, smh
		// safari always have hardware acceleration, no need for potato
		return
	}

	const fourHours = 1000 * 60 * 60 * 4
	const isPotato = localStorage.potato === 'yes'
	const expirationTime = Date.now() - parseInt(localStorage.lastPotatoCheck)

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

	const vendor = gl?.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? 0) + ''
	const renderer = gl?.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? 0) + ''
	const detectedPotato = vendor.includes('Google') && renderer.includes('SwiftShader')

	localStorage.potato = detectedPotato ? 'yes' : 'no'
	localStorage.lastPotatoCheck = Date.now()
	document.body.classList.toggle('potato', detectedPotato)
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
	let theme = 'light'

	switch (value) {
		case 'disable':
			theme = 'light'
			break

		case 'enable':
			theme = 'dark'
			break

		case 'system':
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
			break

		case 'auto': {
			const now = minutator(new Date())
			const { sunrise, sunset } = suntime()
			theme = now <= sunrise || now > sunset ? 'dark' : 'light'
			break
		}
	}

	document.documentElement.dataset.theme = theme

	if (isEvent) {
		storage.sync.set({ dark: value })
		return
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
		document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
	})
}

export function textShadow(init?: number, event?: number) {
	const val = init ?? event
	document.documentElement.style.setProperty('--text-shadow-alpha', (val ?? 0.2)?.toString())

	if (typeof event === 'number') {
		eventDebounce({ textShadow: val })
	}
}

// Unfocus address bar on chromium
// https://stackoverflow.com/q/64868024
// if (window.location.search !== '?r=1') {
// 	window.location.assign('index.html?r=1')
// }
