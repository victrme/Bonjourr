import { Sync, Searchbar, Weather, ClockFace, MoveKeys, HideOld } from './types/sync'
import { settingsInit } from './settings'

import storage from './storage'
import notes from './features/notes'
import quotes from './features/quotes'
import weather from './features/weather'
import unsplash from './features/unsplash'
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
	localDefaults,
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

let lazyClockInterval: number
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

export async function clock(
	init: Sync | null,
	event?: {
		is: 'analog' | 'seconds' | 'face' | 'style' | 'ampm' | 'timezone' | 'usdate' | 'greeting'
		value?: string
		checked?: boolean
	}
) {
	//
	type Clock = {
		ampm: boolean
		analog: boolean
		seconds: boolean
		face: string
		style: string
		timezone: string
	}

	// prettier-ignore
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

	function zonedDate(timezone: string = 'auto') {
		const date = new Date()

		if (timezone === 'auto') return date

		const offset = date.getTimezoneOffset() / 60 // hour
		let utcHour = date.getHours() + offset

		const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
		// const minutes = timezone.split('.')[1] ? utcMinutes + parseInt(timezone.split('.')[1]) : date.getMinutes()

		let minutes
		if (timezone.split('.')[1]) {
			minutes = utcMinutes + parseInt(timezone.split('.')[1])

			if (minutes > -30) utcHour++
		} else minutes = date.getMinutes()

		date.setHours(utcHour + parseInt(timezone), minutes)

		return date
	}

	function clockDate(date: Date, usdate: boolean) {
		const jour = tradThis(days[date.getDay()]),
			mois = tradThis(months[date.getMonth()]),
			chiffre = date.getDate()

		$('date')!.textContent = usdate ? `${jour}, ${mois} ${chiffre}` : `${jour} ${chiffre} ${mois}`
	}

	function greetings(date: Date, name?: string) {
		const greets = [
			{ text: 'Good night', hour: 7 },
			{ text: 'Good morning', hour: 12 },
			{ text: 'Good afternoon', hour: 18 },
			{ text: 'Good evening', hour: 24 },
		]

		const domgreetings = $('greetings') as HTMLTitleElement
		const greetResult = greets.filter((greet) => date.getHours() < greet.hour)[0]

		domgreetings.style.textTransform = name ? 'none' : 'capitalize'
		domgreetings.textContent = tradThis(greetResult.text) + (name ? `, ${name}` : '')
	}

	function changeAnalogFace(face: ClockFace = 'none') {
		//
		// Clockwise
		const chars = {
			none: ['', '', '', ''],
			number: ['12', '3', '6', '9'],
			roman: ['XII', 'III', 'VI', 'IX'],
			marks: ['│', '─', '│', '─'],
		}

		document
			.querySelectorAll('#analogClock .numbers')
			.forEach((mark, i) => (mark.textContent = chars[face as keyof typeof chars][i]))
	}

	function changeAnalogStyle(style?: string) {
		$('analogClock')?.setAttribute('class', style || '')
	}

	function startClock(clock: Clock, greeting: string, usdate: boolean) {
		//
		function displayControl() {
			clas($('time-container'), clock.analog, 'analog')
			clas($('analogSeconds'), !clock.seconds, 'hidden')
		}

		function clockInterval() {
			function numerical(date: Date) {
				const fixunits = (val: number) => (val < 10 ? '0' : '') + val.toString()

				let h = clock.ampm ? date.getHours() % 12 : date.getHours(),
					m = fixunits(date.getMinutes()),
					s = fixunits(date.getSeconds())

				if (clock.ampm && h === 0) {
					h = 12
				}

				const domclock = $('clock')

				if (domclock) {
					clas(domclock, !clock.ampm && h < 10, 'zero') // Double zero on 24h
					domclock.textContent = `${h}:${m}${clock.seconds ? ':' + s : ''}`
				}
			}

			function analog(date: Date) {
				const rotation = (elem: HTMLElement | null, val: number) => {
					if (elem) {
						elem.style.transform = `rotate(${val}deg)`
					}
				}

				let s = date.getSeconds() * 6,
					m = (date.getMinutes() + date.getSeconds() / 60) * 6,
					h = ((date.getHours() % 12) + date.getMinutes() / 60) * 30

				rotation($('hours'), h)
				rotation($('minutes'), m)

				if (clock.seconds) {
					rotation($('analogSeconds'), s)
				}
			}

			// Control
			const date = zonedDate(clock.timezone)
			clock.analog ? analog(date) : numerical(date)

			// Midnight, change date
			if (date.getHours() === 0 && date.getMinutes() === 0) {
				clockDate(date, usdate)
			}

			// Hour change
			if (date.getMinutes() === 0) {
				greetings(date, greeting)
			}
		}

		//stops multiple intervals
		clearInterval(lazyClockInterval)

		displayControl()
		clockInterval()
		lazyClockInterval = setInterval(clockInterval, 1000)
	}

	if (event) {
		const { clock, usdate, greeting } = await storage.get(['clock', 'usdate', 'greeting'])

		if (!clock || usdate === undefined || greeting === undefined) {
			return
		}

		switch (event.is) {
			case 'usdate': {
				clockDate(zonedDate(clock.timezone), event.checked || false)
				storage.set({ usdate: event.checked })
				break
			}

			case 'greeting': {
				greetings(zonedDate(clock.timezone), event.value)
				storage.set({ greeting: event.value })
				break
			}

			case 'timezone': {
				clockDate(zonedDate(event.value), usdate)
				greetings(zonedDate(event.value), greeting)
				clock.timezone = event.value ?? 'auto'
				break
			}

			case 'ampm':
				clock.ampm = event.checked ?? false
				break

			case 'analog':
				clock.analog = event.checked ?? false
				break

			case 'face':
				clock.face = event.value as ClockFace
				break

			case 'style':
				changeAnalogStyle(clock.style)
				clock.style = event.value ?? 'round'
				break

			case 'seconds':
				clock.seconds = event.checked ?? false
				break
		}

		storage.set({ clock })
		startClock(clock, greeting, usdate)
		changeAnalogFace(clock.face)
		changeAnalogStyle(clock.style)

		return
	}

	let clock = init?.clock || {
		analog: false,
		seconds: false,
		ampm: false,
		timezone: 'auto',
		face: 'none',
		style: 'round',
	}

	try {
		startClock(clock, init?.greeting || '', init?.usdate || false)
		clockDate(zonedDate(clock.timezone), init?.usdate || false)
		greetings(zonedDate(clock.timezone), init?.greeting || '')
		changeAnalogFace(clock.face)
		changeAnalogStyle(clock.style)
		canDisplayInterface('clock')
	} catch (e) {
		errorMessage(e)
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
				quickLinks(null, { is: 'import', bookmarks: bookmarkToApply })
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
	const time = sunTime()

	if (time) {
		const cases = {
			auto: time.now <= time.rise || time.now > time.set ? 'dark' : 'light',
			system: 'autodark',
			enable: 'dark',
			disable: 'light',
		}

		if (isEvent) {
			clas(document.body, false, 'light')
			clas(document.body, false, 'dark')
			clas(document.body, false, 'autodark')
			storage.set({ dark: value })
		}

		clas(document.body, true, cases[value])
	}
}

export function searchbar(init: Searchbar | null, update?: any, that?: HTMLInputElement) {
	const domcontainer = $('sb_container')
	const domsearchbar = $('searchbar')
	const emptyButton = $('sb_empty')
	const submitButton = $('sb_submit')
	const searchbarButtons = $('sb-buttons')

	const display = (shown: boolean) => $('sb_container')?.setAttribute('class', shown ? 'shown' : 'hidden')
	const setEngine = (value: string) => domsearchbar?.setAttribute('data-engine', value)
	const setRequest = (value: string) => domsearchbar?.setAttribute('data-request', stringMaxSize(value, 512))
	const setNewtab = (value: boolean) => domsearchbar?.setAttribute('data-newtab', value.toString())
	const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value || '')
	const setOpacity = (value = 0.1) => {
		document.documentElement.style.setProperty('--searchbar-background-alpha', value.toString())
		clas($('sb_container'), value > 0.4, 'opaque')
	}

	//
	// Updates

	async function updateSearchbar() {
		const { searchbar } = await storage.get('searchbar')

		if (!that || !searchbar) {
			return
		}

		switch (update) {
			case 'engine': {
				searchbar.engine = that.value
				clas($('searchbar_request'), that.value === 'custom', 'shown')
				setEngine(that.value)
				break
			}

			case 'opacity': {
				searchbar.opacity = parseFloat(that.value)
				setOpacity(parseFloat(that.value))
				break
			}

			case 'request': {
				let val = that.value

				if (val.indexOf('%s') !== -1) {
					searchbar.request = stringMaxSize(val, 512)
					that.blur()
				} else if (val.length > 0) {
					val = ''
					that.setAttribute('placeholder', tradThis('%s Not found'))
					setTimeout(() => that.setAttribute('placeholder', tradThis('Search query: %s')), 2000)
				}

				setRequest(val)
				break
			}

			case 'newtab': {
				searchbar.newtab = that.checked
				setNewtab(that.checked)
				break
			}

			case 'placeholder': {
				searchbar.placeholder = that.value
				setPlaceholder(that.value)
				break
			}
		}

		eventDebounce({ searchbar })
	}

	if (update) {
		updateSearchbar()
		return
	}

	//
	// Initialisation

	const { on, engine, request, newtab, opacity, placeholder } = init || structuredClone(syncDefaults.searchbar)

	try {
		display(on)
		setEngine(engine)
		setRequest(request)
		setNewtab(newtab)
		setPlaceholder(placeholder)
		setOpacity(opacity)

		if (on) {
			domsearchbar?.focus()
		}
	} catch (e) {
		errorMessage(e)
	}

	//
	// Events

	function submitSearch(e: SubmitEvent) {
		if (!domsearchbar) return
		e.preventDefault()

		const URLs = {
			google: 'https://www.google.com/search?q=%s',
			ddg: 'https://duckduckgo.com/?q=%s',
			startpage: 'https://www.startpage.com/do/search?query=%s',
			qwant: 'https://www.qwant.com/?q=%s',
			yahoo: 'https://search.yahoo.com/search?q=%s',
			bing: 'https://www.bing.com/search?q=%s',
			brave: 'https://search.brave.com/search?q=%s',
			ecosia: 'https://www.ecosia.org/search?q=%s',
			lilo: 'https://search.lilo.org/?q=%s',
			baidu: 'https://www.baidu.com/s?wd=%s',
		}

		let searchURL = 'https://www.google.com/search?q=%s'
		const isNewtab = domsearchbar?.dataset.newtab === 'true'
		const engine = domsearchbar?.dataset.engine || 'google'
		const request = domsearchbar?.dataset.request || ''

		searchURL = tradThis(engine)

		if (!searchURL.includes('%s') && engine in URLs) {
			searchURL = URLs[engine as keyof typeof URLs]
		}

		if (engine === 'custom') {
			searchURL = request
		}

		// add search query to url
		searchURL = searchURL.replace('%s', encodeURIComponent((domsearchbar as HTMLInputElement).value))

		// open new page
		window.open(searchURL, isNewtab ? '_blank' : '_self')
	}

	function toggleInputButton(toggle: boolean) {
		if (toggle) {
			emptyButton?.removeAttribute('disabled')
			submitButton?.removeAttribute('disabled')
		} else {
			emptyButton?.setAttribute('disabled', '')
			submitButton?.setAttribute('disabled', '')
		}
	}

	function handleInputButtons() {
		const hasText = (domsearchbar as HTMLInputElement).value.length > 0
		clas(searchbarButtons, hasText, 'shown')
		toggleInputButton(hasText)
	}

	function removeInputText() {
		if (!domsearchbar) return

		domsearchbar.focus()
		;(domsearchbar as HTMLInputElement).value = ''
		clas(searchbarButtons, false, 'shown')
		toggleInputButton(false)
	}

	// This removes duplicates in case searchbar is called multiple times
	domcontainer?.removeEventListener('submit', submitSearch)
	domsearchbar?.removeEventListener('input', handleInputButtons)
	emptyButton?.removeEventListener('click', removeInputText)

	domcontainer?.addEventListener('submit', submitSearch)
	domsearchbar?.addEventListener('input', handleInputButtons)
	emptyButton?.addEventListener('click', removeInputText)
}

export function showPopup(value: string | number) {
	//
	function affiche() {
		const setReviewLink = () =>
			getBrowser() === 'chrome'
				? 'https://chrome.google.com/webstore/detail/bonjourr-%C2%B7-minimalist-lig/dlnejlppicbjfcfcedcflplfjajinajd/reviews'
				: getBrowser() === 'firefox'
				? 'https://addons.mozilla.org/en-US/firefox/addon/bonjourr-startpage/'
				: getBrowser() === 'safari'
				? 'https://apps.apple.com/fr/app/bonjourr-startpage/id1615431236'
				: getBrowser() === 'edge'
				? 'https://microsoftedge.microsoft.com/addons/detail/bonjourr/dehmmlejmefjphdeoagelkpaoolicmid'
				: 'https://bonjourr.fr/help#%EF%B8%8F-reviews'

		const dom = {
			wrap: document.createElement('div'),
			btnwrap: document.createElement('div'),
			desc: document.createElement('p'),
			review: document.createElement('a'),
			donate: document.createElement('a'),
		}

		const closePopup = (fromText: boolean) => {
			if (fromText) {
				$('popup')?.classList.remove('shown')
				setTimeout(() => {
					$('popup')?.remove()
					setTimeout(() => $('creditContainer')?.style.removeProperty('opacity'), 400)
				}, 200)
			}
			storage.set({ reviewPopup: 'removed' })
		}

		dom.wrap.id = 'popup'
		dom.desc.id = 'popup_text'
		dom.desc.textContent = tradThis(
			'Love using Bonjourr? Consider giving us a review or donating, that would help a lot! 😇'
		)

		dom.review.href = setReviewLink()
		dom.donate.href = 'https://ko-fi.com/bonjourr'

		dom.review.textContent = tradThis('Review')
		dom.donate.textContent = tradThis('Donate')

		dom.btnwrap.id = 'popup_buttons'
		dom.btnwrap.appendChild(dom.review)
		dom.btnwrap.appendChild(dom.donate)

		dom.wrap.appendChild(dom.desc)
		dom.wrap.appendChild(dom.btnwrap)

		document.body.appendChild(dom.wrap)

		$('creditContainer')!.style.opacity = '0'

		setTimeout(() => dom.wrap.classList.add('shown'), 200)

		dom.review.addEventListener('mousedown', () => closePopup(false))
		dom.donate.addEventListener('mousedown', () => closePopup(false))
		dom.desc.addEventListener('click', () => closePopup(true), { passive: true })
	}

	// TODO: condition a verifier

	if (typeof value === 'number') {
		if (value > 30) affiche() //s'affiche après 30 tabs
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
