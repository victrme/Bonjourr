import { Sync, Weather, MoveKeys, HideOld } from './types/sync'
import { settingsInit } from './settings'

import storage from './storage'
import clock from './features/clock'
import notes from './features/notes'
import quotes from './features/quotes'
import weather from './features/weather'
import unsplash from './features/unsplash'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import moveElements from './features/move'
import hideElements from './features/hide'
import localBackgrounds from './features/localbackgrounds'

import {
	$,
	clas,
	bundleLinks,
	detectPlatform,
	extractHostname,
	getBrowser,
	minutator,
	mobilecheck,
	periodOfDay,
	stringMaxSize,
	syncDefaults,
	testOS,
	convertHideStorage,
} from './utils'

import { traduction, tradThis, setTranslationCache } from './utils/translations'
import { eventDebounce } from './utils/debounce'
import errorMessage from './utils/errorMessage'

type FunctionsLoadState = 'Off' | 'Waiting' | 'Ready'

const dominterface = document.getElementById('interface') as HTMLDivElement
const functionsLoad: { [key: string]: FunctionsLoadState } = {
	clock: 'Waiting',
	links: 'Waiting',
	fonts: 'Off',
	quotes: 'Off',
}

let loadtimeStart = performance.now()
let loadBis = false
let sunset = 0
let sunrise = 0

// const interfaceObserver = new MutationObserver((mutationList, observer) => {
// 	console.log(mutationList, observer)
// 	setTimeout(() => {
// 		interfaceObserver.disconnect()
// 	}, 500)
// })

// interfaceObserver.observe(dominterface, { attributes: true, childList: true, subtree: true })

export const freqControl = {
	set: () => {
		return new Date().getTime()
	},

	get: (every: string, last: number) => {
		// instead of adding unix time to the last date
		// look if day & hour has changed
		// because we still cannot time travel
		// changes can only go forward

		const nowDate = new Date()
		const lastDate = new Date(last || 0)
		const changed = {
			date: nowDate.getDate() !== lastDate.getDate(),
			hour: nowDate.getHours() !== lastDate.getHours(),
		}

		switch (every) {
			case 'day':
				return changed.date

			case 'hour':
				return changed.date || changed.hour

			case 'tabs':
				return true

			case 'pause':
				return last === 0

			case 'period': {
				const sun = sunTime()
				return last === 0 || !sun ? true : periodOfDay(sun) !== periodOfDay(sun, +lastDate) || false
			}

			default:
				return false
		}
	},
}

const interfaceFade = (function interfaceFadeDebounce() {
	let fadeTimeout: number

	async function apply(duration = 400) {
		clearTimeout(fadeTimeout)

		// Wait for grid change (in ::root css var) to fade back in
		let observer = new MutationObserver(() => {
			fadeTimeout = setTimeout(() => (dominterface.style.transition = ''), duration)
			dominterface.style.removeProperty('opacity')
			observer.disconnect()
		})

		observer.observe(document.documentElement, { attributes: true })

		// Do fade out and then wait for the duration of the transition
		dominterface.style.opacity = '0'
		dominterface.style.transition = `opacity ${duration}ms cubic-bezier(.215,.61,.355,1)`
		await new Promise((resolve) => setTimeout(resolve, duration))
	}

	return { apply }
})()

export async function toggleWidgetsDisplay(list: { [key in MoveKeys]?: boolean }, fromInput?: true) {
	const listEntries = Object.entries(list)

	const widgets = {
		time: { domid: 'time', inputid: 'i_time' },
		main: { domid: 'main', inputid: 'i_main' },
		quicklinks: { domid: 'linkblocks', inputid: 'i_quicklinks' },
		notes: { domid: 'notes_container', inputid: 'i_notes' },
		quotes: { domid: 'quotes_container', inputid: 'i_quotes' },
		searchbar: { domid: 'sb_container', inputid: 'i_sb' },
	}

	// toggle settings option drawers
	listEntries.forEach(([key, on]) => {
		clas($(key + '_options'), on, 'shown')
	})

	// toggle 'enable' switches
	listEntries.forEach(([key, on]) => {
		if (key in widgets) {
			const id = widgets[key as keyof typeof widgets].inputid
			const input = $(id) as HTMLInputElement

			if (id && input) {
				input.checked = on
			}
		}
	})

	// Fade interface
	await interfaceFade.apply(200)

	// toggle widget on interface
	listEntries.forEach(([key, on]) => {
		if (key in widgets) {
			const dom = $(widgets[key as keyof typeof widgets].domid)
			clas(dom, !on, 'hidden')
		}
	})

	// user is toggling from settings, update grid
	if (fromInput) {
		const [id, on] = listEntries[0] // always only one toggle
		moveElements(null, { widget: { id: id as MoveKeys, on: on } })
	}
}

export function favicon(val?: string, isEvent?: true) {
	function createFavicon(emoji?: string) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="85">${emoji}</text></svg>`
		const defaulticon = '/src/assets/' + (getBrowser() === 'edge' ? 'monochrome.png' : 'favicon.ico')

		document.querySelector("head link[rel~='icon']")?.setAttribute('href', emoji ? svg : defaulticon)
	}

	if (isEvent) {
		const isEmoji = val?.match(/\p{Emoji}/gu) && !val?.match(/[0-9a-z]/g)
		createFavicon(val)
		eventDebounce({ favicon: isEmoji ? val : '' })
		return
	}

	if (val) {
		createFavicon(val)
	}
}

export function tabTitle(val = '', isEvent?: true) {
	document.title = stringMaxSize(val, 80) || tradThis('New tab')

	if (isEvent) {
		eventDebounce({ tabtitle: stringMaxSize(val, 80) })
	}
}

export function pageWidth(val?: number, isEvent?: true) {
	document.documentElement.style.setProperty('--page-width', (val || syncDefaults.pagewidth) + 'px')

	if (isEvent) {
		eventDebounce({ pagewidth: val })
	}
}

export async function linksImport() {
	const closeBookmarks = (container: HTMLElement) => {
		container.classList.add('hiding')
		setTimeout(() => container.setAttribute('class', ''), 400)
	}

	function main(links: Link[], bookmarks: chrome.bookmarks.BookmarkTreeNode[]): void {
		const listdom = document.createElement('ol')

		let bookmarksList: chrome.bookmarks.BookmarkTreeNode[] = []
		let selectedList: string[] = []

		bookmarks[0].children?.forEach((cat) => {
			const list = cat.children

			if (Array.isArray(list)) {
				bookmarksList.push(...list)
			}
		})

		function selectBookmark(elem: HTMLLIElement) {
			const isSelected = elem.classList.toggle('selected')
			const index = elem.getAttribute('data-index')
			let counter = listdom.querySelectorAll('li.selected').length

			if (!index) return

			// update list to return
			isSelected ? selectedList.push(index) : selectedList.pop()

			// Change submit button text & class on selections
			if (counter === 0) $('bmk_apply')!.textContent = tradThis('Select bookmarks to import')
			if (counter === 1) $('bmk_apply')!.textContent = tradThis('Import this bookmark')
			if (counter > 1) $('bmk_apply')!.textContent = tradThis('Import these bookmarks')

			clas($('bmk_apply'), counter === 0, 'none')
		}

		bookmarksList.forEach((mark, index) => {
			const elem = document.createElement('li')
			const titleWrap = document.createElement('p')
			const title = document.createElement('span')
			const favicon = document.createElement('img')
			const url = document.createElement('pre')
			const markURL = mark.url

			// only append links if url are not empty
			// (temp fix to prevent adding bookmarks folder title ?)
			if (!markURL || markURL === '') {
				return
			}

			favicon.src = 'https://icons.duckduckgo.com/ip3/' + extractHostname(markURL) + '.ico'
			favicon.alt = ''

			title.textContent = mark.title
			url.textContent = markURL

			titleWrap.appendChild(favicon)
			titleWrap.appendChild(title)

			elem.setAttribute('data-index', index.toString())
			elem.setAttribute('tabindex', '0')
			elem.appendChild(titleWrap)
			elem.appendChild(url)

			elem.onclick = () => selectBookmark(elem)
			elem.onkeydown = (e: KeyboardEvent) => (e.code === 'Enter' ? selectBookmark(elem) : '')

			if (links.filter((x) => x.url === stringMaxSize(markURL, 512)).length === 0) {
				listdom.appendChild(elem)
			}
		})

		// Replace list to filter already added bookmarks
		const oldList = document.querySelector('#bookmarks ol')
		if (oldList) oldList.remove()
		$('bookmarks')!.prepend(listdom)

		// Just warning if no bookmarks were found
		if (bookmarksList.length === 0) {
			clas($('bookmarks'), true, 'noneFound')
			return
		}

		// Submit event
		$('bmk_apply')!.onclick = function () {
			let bookmarkToApply = selectedList.map((i) => ({
				title: bookmarksList[parseInt(i)].title,
				url: bookmarksList[parseInt(i)].url || '',
			}))

			if (bookmarkToApply.length > 0) {
				closeBookmarks($('bookmarks_container')!)
				quickLinks(null, { bookmarks: bookmarkToApply })
			}
		}

		const lidom = document.querySelector('#bookmarks ol li') as HTMLLIElement
		lidom.focus()
	}

	// Ask for bookmarks first
	chrome.permissions.request({ permissions: ['bookmarks'] }, async (granted) => {
		if (!granted) return

		const data = await storage.get()
		const extAPI = window.location.protocol === 'moz-extension:' ? browser : chrome
		extAPI.bookmarks.getTree().then((response) => {
			clas($('bookmarks_container'), true, 'shown')
			main(bundleLinks(data as Sync), response)
		})
	})

	// Close events
	$('bmk_close')!.onclick = () => closeBookmarks($('bookmarks_container')!)

	$('bookmarks_container')!.addEventListener('click', function (e: MouseEvent) {
		if ((e.target as HTMLElement).id === 'bookmarks_container') closeBookmarks(this)
	})
}

export function initBackground(data: Sync) {
	const type = data.background_type || 'dynamic'
	const blur = data.background_blur
	const bright = data.background_bright

	backgroundFilter('init', { blur, bright })

	type === 'custom' ? localBackgrounds() : unsplash(data.dynamic)
}

export function imgBackground(url: string, color?: string) {
	const overlaydom = $('background_overlay') as HTMLDivElement
	const backgrounddom = $('background') as HTMLDivElement
	const backgroundbisdom = $('background-bis') as HTMLDivElement
	let img = new Image()

	img.onload = () => {
		if (loadBis) {
			backgrounddom.style.opacity = '0'
			backgroundbisdom.style.backgroundImage = `url(${url})`
		} else {
			backgrounddom.style.opacity = `1`
			backgrounddom.style.backgroundImage = `url(${url})`
		}

		overlaydom.style.opacity = '1'
		loadBis = !loadBis

		if (color && testOS.ios) {
			setTimeout(() => document.documentElement.style.setProperty('--average-color', color), 400)
		}
	}

	img.src = url
	img.remove()
}

export function backgroundFilter(cat: 'init' | 'blur' | 'bright', val: { blur?: number; bright?: number }, isEvent?: boolean) {
	let result = ''
	const domblur = $('i_blur') as HTMLInputElement
	const dombright = $('i_bright') as HTMLInputElement

	switch (cat) {
		case 'init':
			result = `blur(${val.blur}px) brightness(${val.bright})`
			break

		case 'blur':
			result = `blur(${val.blur}px) brightness(${dombright.value})`
			break

		case 'bright':
			result = `blur(${domblur.value}px) brightness(${val.bright})`
			break
	}

	$('background')!.style.filter = result
	$('background-bis')!.style.filter = result

	if (isEvent) {
		if (cat === 'blur') eventDebounce({ background_blur: val.blur })
		if (cat === 'bright') eventDebounce({ background_bright: val.bright })
	}
}

export function darkmode(value: 'auto' | 'system' | 'enable' | 'disable', isEvent?: boolean) {
	if (isEvent) {
		storage.set({ dark: value })
	}

	if (value === 'auto') {
		const { now, rise, set } = sunTime()
		const choice = now <= rise || now > set ? 'dark' : 'light'
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
		const browser = getBrowser()

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

			storage.set({ reviewPopup: 'removed' })
		}

		popup.style.display = 'flex'
		document.getElementById('popup_review')?.setAttribute('href', reviewURLs[browser])
		document.getElementById('popup_review')?.addEventListener('mousedown', closePopup)
		document.getElementById('popup_donate')?.addEventListener('mousedown', closePopup)
		document.getElementById('popup_text')?.addEventListener('click', closePopup, { passive: true })

		setTimeout(() => popup?.classList.add('shown'), 400)
		setTimeout(() => document.getElementById('creditContainer')?.classList.remove('shown'), 0)
	}

	// TODO: condition a verifier

	if (typeof value === 'number') {
		if (value > 30) affiche() // s'affiche après 30 tabs
		else storage.set({ reviewPopup: value + 1 })

		return
	}

	if (value !== 'removed') {
		storage.set({ reviewPopup: 0 })
	}
}

export function textShadow(init: number | null, event?: number) {
	const val = init ?? event
	document.documentElement.style.setProperty('--text-shadow-alpha', (val ?? 0.2)?.toString())

	if (typeof event === 'number') {
		eventDebounce({ textShadow: val })
	}
}

export function customCss(init: string | null, event?: { is: 'styling' | 'resize'; val: string | number }) {
	const styleHead = $('styles') as HTMLStyleElement

	if (init) {
		styleHead.textContent = init
	}

	if (event) {
		switch (event.is) {
			case 'styling': {
				if (typeof event.val === 'string') {
					const val = stringMaxSize(event.val, 8080)
					styleHead.textContent = val
					eventDebounce({ css: val })
				}
				break
			}

			case 'resize': {
				if (typeof event.val === 'number') {
					eventDebounce({ cssHeight: event.val })
				}
				break
			}
		}
	}
}

export function sunTime(init?: Weather) {
	if (init && init.lastState) {
		sunrise = init.lastState.sunrise
		sunset = init.lastState.sunset
	}

	if (sunset === 0) {
		return {
			now: minutator(new Date()),
			rise: 420,
			set: 1320,
		}
	}

	return {
		now: minutator(new Date()),
		rise: minutator(new Date(sunrise * 1000)),
		set: minutator(new Date(sunset * 1000)),
	}
}

export function canDisplayInterface(cat: keyof typeof functionsLoad | null, init?: Sync) {
	//
	// Progressive anim to max of Bonjourr animation time
	function displayInterface() {
		let loadtime = Math.min(performance.now() - loadtimeStart, 400)

		if (loadtime < 33) {
			loadtime = 0
		}

		document.documentElement.style.setProperty('--load-time-transition', loadtime + 'ms')
		document.body.classList.remove('loading')

		setTimeout(async () => {
			const data = await storage.get()
			settingsInit(data)
			document.body.classList.remove('init')
		}, loadtime + 100)
	}

	// More conditions if user is using advanced features
	if (init || !cat) {
		if (init?.font?.family && init?.font?.url) functionsLoad.fonts = 'Waiting'
		if (init?.quotes?.on) functionsLoad.quotes = 'Waiting'
		return
	}

	if (functionsLoad[cat] === 'Off') {
		return // Function is not activated, don't wait for it
	}

	functionsLoad[cat] = 'Ready'

	if (Object.values(functionsLoad).includes('Waiting') === false && !$('settings')) {
		displayInterface()
	}
}

function onlineAndMobileHandler() {
	//

	if (mobilecheck()) {
		// For Mobile that caches pages for days
		document.addEventListener('visibilitychange', async () => {
			const data = await storage.get()

			if (!data?.clock || !data?.weather) {
				return
			}

			const { dynamic, background_type } = data
			const dynamicNeedsImage = background_type === 'dynamic' && freqControl.get(dynamic.every, dynamic.time)

			if (dynamicNeedsImage && data.dynamic) {
				unsplash(data.dynamic)
			}

			clock(data)
			weather(data)
			sunTime(data.weather)
		})
	}

	// Only on Online / Safari
	if (detectPlatform() === 'online') {
		//
		// Update export code on localStorage changes

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js')
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
		if (getBrowser('firefox') && mobilecheck()) {
			const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
			appHeight()

			// Resize will crush page when keyboard opens
			// window.addEventListener('resize', appHeight)

			// Fix for opening tabs Firefox iOS
			if (testOS.ios) {
				let globalID: number

				function triggerAnimationFrame() {
					appHeight()
					globalID = requestAnimationFrame(triggerAnimationFrame)
				}

				window.requestAnimationFrame(triggerAnimationFrame)
				setTimeout(() => cancelAnimationFrame(globalID), 500)
			}
		}
	}
}

function initTimeAndMainBlocks(time: boolean, main: boolean) {
	document.getElementById('time')?.classList.toggle('hidden', !time)
	document.getElementById('main')?.classList.toggle('hidden', !main)
}

function startup(data: Sync) {
	traduction(null, data.lang)
	canDisplayInterface(null, data)
	sunTime(data.weather)
	weather(data)
	customFont(data.font)
	textShadow(data.textShadow)
	favicon(data.favicon)
	tabTitle(data.tabtitle)
	clock(data)
	darkmode(data.dark)
	searchbar(data.searchbar)
	quotes(data)
	showPopup(data.reviewPopup)
	notes(data.notes || null)
	moveElements(data.move)
	customCss(data.css)
	hideElements(data.hide)
	initBackground(data)
	quickLinks(data)
	initTimeAndMainBlocks(data.time, data.main)
	pageWidth(data.pagewidth)
}

;(async () => {
	onlineAndMobileHandler()

	try {
		const data = await storage.get()

		// Version change
		if (data?.about?.version !== syncDefaults.about.version) {
			const version_old = data?.about?.version
			const version = syncDefaults.about.version

			console.log(`Version change: ${version_old} => ${version}`)

			data.about = { browser: detectPlatform(), version }

			// From old 1.15.x
			// To new 1.16.x
			if (version_old.includes('1.15') && version.includes('1.16')) {
				localStorage.hasUpdated = 'true'
				localStorage.removeItem('translations')

				// Breaking data changes needs filtering
				data.hide = convertHideStorage(data.hide as HideOld)
				data.css = data.css.replaceAll('#widgets', '')
				data.time = (!data.hide?.clock || !data.hide?.date) ?? true
				data.main = (!data.hide?.weatherdesc || !data.hide?.weathericon || !data.hide?.greetings) ?? true
			}

			storage.set({ ...data })
		}

		await setTranslationCache(data.lang)

		startup(data)
	} catch (e) {
		errorMessage(e)
	}
})()
