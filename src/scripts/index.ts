import { settingsInit } from './settings'

import notes from './features/notes'
import clock from './features/clock'
import weather from './features/weather'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import moveElements from './features/move'
import hideElements from './features/hide'
import initBackground from './features/backgrounds'
import { syncNewBookmarks } from './features/links/bookmarks'
import quotes, { oldJSONToCSV } from './features/quotes'
import storage, { getSyncDefaults } from './storage'

import { SYSTEM_OS, BROWSER, PLATFORM, IS_MOBILE, SYNC_DEFAULT, CURRENT_VERSION } from './defaults'
import { traduction, tradThis, setTranslationCache } from './utils/translations'
import { stringMaxSize, freqControl, linksDataMigration } from './utils'
import { eventDebounce } from './utils/debounce'
import onSettingsLoad from './utils/onsettingsload'
import errorMessage from './utils/errormessage'
import suntime from './utils/suntime'

const dominterface = document.getElementById('interface') as HTMLDivElement

let loadtimeStart = performance.now()

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
		const { sunrise, sunset } = suntime
		const choice = now <= sunrise || now > sunset ? 'dark' : 'light'
		document.documentElement.dataset.theme = choice
	}

	if (value === 'disable') document.documentElement.dataset.theme = 'light'
	if (value === 'enable') document.documentElement.dataset.theme = 'dark'
	if (value === 'system') document.documentElement.dataset.theme = ''
}

export function showPopup(value: string | number) {
	//
	function affiche() {
		const popup = document.getElementById('popup') as HTMLElement

		const reviewURLs = {
			chrome: 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews',
			firefox: 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/',
			safari: 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236',
			edge: 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid',
			other: 'https://bonjourr.fr/help#%EF%B8%8F-reviews',
		}

		function closePopup(e: Event) {
			const isDesc = (e.target as HTMLElement)?.id === 'popup_text'

			if (isDesc) {
				popup?.classList.remove('shown')
				setTimeout(() => popup?.remove(), 200)
				setTimeout(() => document.getElementById('creditContainer')?.classList.add('shown'), 600)
			}

			storage.sync.set({ reviewPopup: 'removed' })
		}

		popup.style.display = 'flex'
		document.getElementById('popup_review')?.setAttribute('href', reviewURLs[BROWSER])
		document.getElementById('popup_review')?.addEventListener('mousedown', closePopup)
		document.getElementById('popup_donate')?.addEventListener('mousedown', closePopup)
		document.getElementById('popup_text')?.addEventListener('click', closePopup, { passive: true })

		setTimeout(() => popup?.classList.add('shown'), 400)
		setTimeout(() => document.getElementById('creditContainer')?.classList.remove('shown'), 0)
	}

	// TODO: condition a verifier

	if (typeof value === 'number') {
		if (value > 30) affiche() // s'affiche après 30 tabs
		else storage.sync.set({ reviewPopup: value + 1 })

		return
	}

	if (value !== 'removed') {
		storage.sync.set({ reviewPopup: 0 })
	}
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

async function setPotatoComputerMode() {
	if ((navigator as any).gpu === undefined) {
		return
	}

	try {
		await (await (navigator as any).gpu.requestAdapter()).requestDevice()
	} catch (error) {
		document.body.classList.add('potato')
	}
}

const features = ['clock', 'links']

function displayInterface(e: Event) {
	const ready = (e as CustomEvent)?.detail
	const index = features.indexOf(ready)

	if (index !== -1) {
		features.splice(index, 1)
	}

	// Display
	if (features.length === 0) {
		document.removeEventListener('interface', displayInterface)

		let loadtime = Math.min(performance.now() - loadtimeStart, 400)
		loadtime = loadtime < 33 ? 0 : loadtime

		document.documentElement.style.setProperty('--load-time-transition', loadtime + 'ms')
		document.body.classList.remove('loading')

		setTimeout(() => {
			document.body.classList.remove('init')
			settingsInit()
		}, loadtime + 100)
	}
}

document.addEventListener('interface', displayInterface)

function onlineAndMobileHandler() {
	if (IS_MOBILE) {
		let visibilityHasChanged = false

		// For Mobile that caches pages for days
		document.addEventListener('visibilitychange', async () => {
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

			const frequency = freqControl.get(data.unsplash.every, data.unsplash.time)
			const needNewImage = data.background_type === 'unsplash' && frequency

			if (needNewImage && data.unsplash) {
				initBackground(data, local)
			}

			clock(data)
			weather({ sync: data, lastWeather: local.lastWeather })
		})
	}

	// Only on Online / Safari
	if (PLATFORM === 'online') {
		//
		// Update export code on localStorage changes

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('service-worker.js')
		}

		// PWA install trigger (30s interaction default)
		let promptEvent
		window.addEventListener('beforeinstallprompt', function (e) {
			promptEvent = e
			return promptEvent
		})

		// Firefox cannot -moz-fill-available with height
		// On desktop, uses fallback 100vh
		// On mobile, sets height dynamically because vh is bad on mobile
		if (BROWSER === 'firefox' && IS_MOBILE) {
			const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
			appHeight()

			// Resize will crush page when keyboard opens
			// window.addEventListener('resize', appHeight)

			// Fix for opening tabs Firefox iOS
			if (SYSTEM_OS === 'ios') {
				let globalID: number

				function triggerAnimationFrame() {
					appHeight()
					globalID = requestAnimationFrame(triggerAnimationFrame)
				}

				window.requestAnimationFrame(triggerAnimationFrame)
				setTimeout(() => cancelAnimationFrame(globalID), 500)
			}
		}

		if (BROWSER === 'safari' && SYSTEM_OS === 'ios') {
			onSettingsLoad(() => {
				const settingsDom = document.getElementById('settings') as HTMLElement

				document.querySelectorAll('input[type="text"], input[type="url"], textarea')?.forEach((input) => {
					input.addEventListener('focus', () => {
						if (dominterface && settingsDom) {
							dominterface.style.touchAction = 'none'
							settingsDom.style.touchAction = 'none'
						}
					})

					input.addEventListener('blur', () => {
						if (dominterface && settingsDom) {
							dominterface.style.removeProperty('touch-action')
							settingsDom.style.removeProperty('touch-action')
						}
					})
				})
			})
		}
	}
}

function startup(data: Sync.Storage, local: Local.Storage) {
	traduction(null, data.lang)
	suntime.update(local.lastWeather?.sunrise, local.lastWeather?.sunset)
	weather({ sync: data, lastWeather: local.lastWeather })
	customFont(data.font)
	textShadow(data.textShadow)
	favicon(data.favicon)
	tabTitle(data.tabtitle)
	clock(data)
	darkmode(data.dark)
	searchbar(data.searchbar)
	quotes({ sync: data, local })
	showPopup(data.reviewPopup)
	notes(data.notes)
	moveElements(data.move)
	customCss(data.css)
	hideElements(data.hide)
	initBackground(data, local)
	quickLinks(data)
	syncNewBookmarks(data.syncbookmarks)
	pageControl({ width: data.pagewidth, gap: data.pagegap })

	document.getElementById('time')?.classList.toggle('hidden', !data.time)
	document.getElementById('main')?.classList.toggle('hidden', !data.main)

	if (data?.font?.family) features.push('fonts')
	if (data?.quotes?.on) features.push('quotes')

	onSettingsLoad(() => {
		setPotatoComputerMode()
	})
}

// Unfocus address bar on chromium
// https://stackoverflow.com/q/64868024
// if (window.location.search !== '?r=1') {
// 	window.location.assign('index.html?r=1')
// }

;(async () => {
	onlineAndMobileHandler()

	try {
		let { sync, local } = await storage.init()
		const version_old = sync?.about?.version
		const hasChanged = version_old !== CURRENT_VERSION

		if (hasChanged) {
			if (version_old === undefined && Object.keys(sync).length === 0) {
				console.log(`First install: ${CURRENT_VERSION}`)
				sync = await getSyncDefaults()
			} else {
				console.log(`Version change: ${version_old} => ${CURRENT_VERSION}`)
			}

			if (Array.isArray(sync?.quotes?.userlist)) {
				const newuserlist = oldJSONToCSV(sync?.quotes?.userlist as unknown as Quotes.UserInput)
				sync.quotes.userlist = newuserlist
			}

			if (!sync.dateformat) {
				sync.dateformat = sync.usdate ? 'us' : 'eu'
			}

			sync = linksDataMigration(sync)
			sync.about = SYNC_DEFAULT.about
			storage.sync.set(sync)
		}

		await setTranslationCache(sync.lang, local, hasChanged)

		startup(sync, local)
	} catch (e) {
		errorMessage(e)
	}
})()
