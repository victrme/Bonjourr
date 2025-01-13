import notes from './features/notes'
import clock from './features/clock'
import quotes from './features/quotes'
import weather from './features/weather/index'
import customCss from './features/css'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import moveElements from './features/move'
import hideElements from './features/hide'
import interfacePopup from './features/popup'
import initBackground from './features/backgrounds'
import synchronization from './features/synchronization'
import { settingsPreload } from './settings'
import { supportersNotifications } from './features/supporters'
import { textShadow, favicon, tabTitle, darkmode, pageControl } from './features/others'

import { SYSTEM_OS, BROWSER, PLATFORM, IS_MOBILE, CURRENT_VERSION, ENVIRONNEMENT } from './defaults'
import { traduction, setTranslationCache } from './utils/translations'
import { freqControl } from './utils'
import onSettingsLoad from './utils/onsettingsload'
import filterImports from './utils/filterimports'
import errorMessage from './utils/errormessage'
import suntime from './utils/suntime'
import storage from './storage'
import 'clickdown'

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
} catch (error) {
	errorMessage(error)
}

async function startup() {
	let { sync, local } = await storage.init()
	const OLD_VERSION = sync?.about?.version

	if (!sync || !local) {
		errorMessage('Storage failed 😥')
		return
	}

	if (OLD_VERSION !== CURRENT_VERSION) {
		console.log(`Version change: ${OLD_VERSION} => ${CURRENT_VERSION}`)
		sync = upgradeSyncStorage(sync)
		local = upgradeLocalStorage(local)

		// <!> do not move
		// <!> must delete old keys before upgrading storage
		await storage.sync.clear()
		await storage.sync.set(sync)
	}

	await setTranslationCache(sync.lang, local)
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
	synchronization(local)
	pageControl({ width: sync.pagewidth, gap: sync.pagegap })
	operaExtensionExplainer(local.operaExplained)

	document.documentElement.dataset.system = SYSTEM_OS as string
	document.documentElement.dataset.browser = BROWSER as string
	document.documentElement.dataset.platform = PLATFORM as string

	document.getElementById('time')?.classList.toggle('hidden', !sync.time)
	document.getElementById('main')?.classList.toggle('hidden', !sync.main)

	onInterfaceDisplay(() => {
		document.body.classList.remove('init')

		settingsPreload()
		userActionsEvents()
		setPotatoComputerMode()

		supportersNotifications({
			supporters: sync.supporters,
			review: sync.review,
		})

		interfacePopup({
			old: OLD_VERSION,
			new: CURRENT_VERSION,
			review: sync.review ?? 0,
			announce: sync.announcements,
		})
	})
}

function upgradeSyncStorage(data: Sync.Storage): Sync.Storage {
	return filterImports(data, data)
}

function upgradeLocalStorage(data: Local.Storage): Local.Storage {
	data.translations = undefined
	storage.local.remove('translations')

	// data.lastWeather = undefined
	// storage.local.remove('lastWeather')

	return data
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
	const domsuggestions = document.getElementById('sb-suggestions')
	let isMousingDownOnInput = false

	document.body.addEventListener('mousedown', detectTargetAsInputs)
	document.getElementById('b_editmove')?.addEventListener('click', closeSettingsOnMoveOpen)

	document.addEventListener('click', clickUserActions)
	document.addEventListener('keydown', keydownUserActions)
	document.addEventListener('keyup', keydownUserActions)

	function keydownUserActions(event: KeyboardEvent) {
		if (event.code === 'Escape') {
			if (domsuggestions?.classList.contains('shown')) {
				domsuggestions?.classList.remove('shown')
				return
			}

			const open = isOpen()
			const keyup = event.type === 'keyup'

			if (open.contextmenu) {
				document.dispatchEvent(new Event('close-edit'))
			}
			//
			else if (open.settings && keyup) {
				document.dispatchEvent(new Event('toggle-settings'))
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
			else if (keyup) {
				// condition to avoid conflicts with esc key on supporters modal
				// likely to be improved
				if (document.documentElement.dataset.supportersModal === undefined) {
					document.dispatchEvent(new Event('toggle-settings'))
				}
			}

			return
		}

		if (event.code === 'Tab') {
			document.body.classList.toggle('tabbing', true)
			return
		}
	}

	function clickUserActions(event: MouseEvent) {
		if (isMousingDownOnInput) {
			return
		}

		const open = isOpen()
		const composedPath = (event.composedPath() as Element[]) ?? [document.body]
		const path = composedPath.filter((node) => node?.className?.includes)
		const pathIds = path.map((el) => (el as HTMLElement).id)

		const on = {
			body: (path[0] as HTMLElement).tagName === 'BODY',
			link: path.some((el) => el.classList.contains('link')),
			linkfolder: path.some((el) => el.className.includes('folder')),
			addgroup: path.some((el) => el.className.includes('add-group')),
			folder: path.some((el) => el.className.includes('in-folder')),
			interface: pathIds.includes('interface'),
			editlink: pathIds.includes('editlink'),
			settings: path.some((el) => el.id === 'settings'),
			showsettings: path.some((el) => el.id === 'show-settings'),
		}

		if (document.body.classList.contains('tabbing')) {
			document.body?.classList.toggle('tabbing', false)
		}

		if (on.showsettings) {
			document.dispatchEvent(new Event('toggle-settings'))
		}

		if (open.contextmenu && !on.editlink) {
			if (on.addgroup && document.querySelector('.link-title.add-group.selected')) {
				return
			}

			document.dispatchEvent(new Event('close-edit'))
			return
		}

		if ((on.body || on.interface) === false) {
			return
		}

		if (open.settings) {
			document.dispatchEvent(new Event('toggle-settings'))
		}
		//
		else if (open.selectall && !on.link) {
			document.dispatchEvent(new Event('remove-select-all'))
		}
		//
		else if (open.folder && !on.folder && !on.linkfolder) {
			document.dispatchEvent(new Event('close-folder'))
		}
	}

	function isOpen() {
		return {
			settings: !!document.getElementById('settings')?.classList.contains('shown'),
			folder: !!document.querySelector('.in-folder'),
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
				document.dispatchEvent(new Event('toggle-settings'))
			}
		}, 20)
	}
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

function setPotatoComputerMode() {
	if (BROWSER === 'firefox' || BROWSER === 'safari') {
		// firefox fingerprinting protection disables webgl info, smh
		// safari always have hardware acceleration, no need for potato
		return
	}

	const fourHours = 1000 * 60 * 60 * 4
	const isPotato = localStorage.potato === 'yes'
	const expirationTime = Date.now() - parseInt(localStorage.lastPotatoCheck ?? '0')

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
