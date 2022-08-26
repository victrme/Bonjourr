import debounce from 'lodash.debounce'
import snarkdown from 'snarkdown'

import { google } from './types/googleFonts'
import UnsplashImage from './types/unsplashImage'
import { Local, DynamicCache, Quote } from './types/local'
import { Sync, Searchbar, Weather, Font, Hide, Dynamic, ClockFace } from './types/sync'

import { dict, days, enginesLocales, months, enginesUrls } from './lang'
import { settingsInit } from './settings'

import {
	$,
	clas,
	bundleLinks,
	closeEditLink,
	detectPlatform,
	errorMessage,
	extractDomain,
	extractHostname,
	getBrowser,
	getFavicon,
	has,
	localDefaults,
	minutator,
	mobilecheck,
	periodOfDay,
	randomString,
	safeFontList,
	stringMaxSize,
	syncDefaults,
	testOS,
	tradThis,
	turnRefreshButton,
	validateHideElem,
} from './utils'

const eventDebounce = debounce(function (value: { [key: string]: unknown }) {
	chrome.storage.sync.set(value)
}, 400)

const freqControl = {
	set: function () {
		return new Date().getTime()
	},

	get: function (every?: string, last?: number) {
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

		if (every === 'day') return changed.date
		if (every === 'hour') return changed.date || changed.hour
		if (every === 'tabs') return true
		if (every === 'pause') return last === 0
		if (every === 'period') {
			const sun = sunTime()

			if (!sun) return 'day'
			else return periodOfDay(sun) !== periodOfDay(sun, +lastDate)
		}
	},
}

export function traduction(settingsDom: Element | null, lang = 'en') {
	type DictKey = keyof typeof dict
	type DictField = keyof typeof dict.April // "april" just to select a random field

	if (!Object.keys(dict.April).includes(lang)) {
		return // Is english or not valid lang code ? keep english (do nothing)
	}

	const trns = (settingsDom ? settingsDom : document).querySelectorAll('.trn')
	const dictKeys = Object.keys(dict)
	let text: string

	trns.forEach((trn) => {
		if (trn.textContent) {
			text = trn.textContent

			// Translate if text is a valid dict key
			// lang is de facto a valid dict[...] key because it didnt return before
			if (dictKeys.includes(text)) {
				trn.textContent = dict[text as DictKey][lang as DictField]
			}
		}
	})

	document.documentElement.setAttribute('lang', lang)
}

export function textField(val: string = '', event?: boolean) {
	const parsed = $('tfparsed')
	const editor = $('tfeditor')
	const editBtn = $('b_tfedit')
	const aria = tradThis('Text field tick box')

	let html = snarkdown(val)
	html = html.replaceAll(`<a href="undefined"> </a>`, `<input type="checkbox" aria-label="${aria}">`)
	html = html.replaceAll(`<a href="undefined">x</a>`, `<input type="checkbox" aria-label="${aria}" checked>`)

	const replaceAt = (s: string, repl: string, i: number) => {
		return s.substring(0, i) + repl + s.substring(i + repl.length)
	}

	if (!parsed || !editor) {
		return false
	}

	parsed.innerHTML = html

	// Set checkboxes toggle event
	parsed.querySelectorAll('input[type="checkbox"]').forEach((checkbox, ii) => {
		checkbox.addEventListener('click', () => {
			let raw = (editor as HTMLInputElement).value
			const matches = [...raw.matchAll(/(\[[x ]\])/g)]
			const matchIndex = matches[ii].index

			if (typeof matchIndex === 'number') {
				raw = replaceAt(raw, matches[ii][0].includes('x') ? ` ` : `x`, matchIndex + 1)
			}

			;(editor as HTMLInputElement).value = raw
			eventDebounce({ textfield: raw })
		})
	})

	if (event) {
		eventDebounce({ textfield: val })
		return
	}

	// Init: also set textarea
	if (editor) {
		;(editor as HTMLInputElement).value = val
	}

	// Edit Button event
	editBtn?.addEventListener('click', (e: MouseEvent) => {
		if (!editor || !parsed || !editBtn) {
			return
		}

		const isEditorHidden = editor.classList.contains('hidden')
		const isParsedHidden = parsed.classList.contains('hidden')

		// Set editor height to be the same as preview
		// Removes textfield padding from height calc
		if (isEditorHidden) {
			const padding = parseFloat($('interface')?.style.fontSize || '0') * 16 * 4
			editor.style.height = ($('textfield_container')?.offsetHeight || 0) - padding + 'px'
			editor.focus()
		}

		// No tabbing possible when editor is hidden
		editor.setAttribute('tabindex', isEditorHidden ? '0' : '-1')

		// Toggle classes
		clas(editor, !isEditorHidden, 'hidden')
		clas(parsed, !isParsedHidden, 'hidden')

		// Change edit button text
		editBtn.textContent = tradThis(isEditorHidden ? 'done' : 'edit')
	})

	// No browser shortcuts if text field shortcuts detected
	editor?.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.ctrlKey && ['KeyI', 'KeyB', 'KeyC', 'KeyS', 'KeyU', 'KeyT'].includes(e.code)) {
			e.preventDefault()
		}
	})

	// Editor Shortcuts
	editor?.addEventListener('keyup', (e: KeyboardEvent) => {
		const editordom = editor as HTMLTextAreaElement
		const { selectionStart, selectionEnd } = editordom

		// No selections, return
		if (!e.ctrlKey || selectionStart === selectionEnd) {
			return
		}

		function addDecoration(charStart: string, charEnd: string = charStart) {
			let result = editordom.value,
				start = result.substring(0, selectionStart),
				selection = result.substring(selectionStart, selectionEnd),
				end = result.substring(selectionEnd)

			const isRemoval = selection.startsWith(charStart) && (selection.endsWith(charEnd) || charEnd === '')

			// Remove or adds characters from selection
			selection = isRemoval
				? selection.substring(charStart.length, selection.length - charEnd.length)
				: charStart + selection + charEnd

			// Apply to editor
			result = start + selection + end
			editordom.value = result
			textField(result, true)

			// Set selection to same position (because changing value resets cursor)
			const addLength = charStart.length + charEnd.length
			const remLength = -(charStart.length + charEnd.length)
			editordom.selectionStart = selectionStart
			editordom.selectionEnd = selectionEnd + (isRemoval ? remLength : addLength)
		}

		switch (e.code) {
			case 'KeyI':
				addDecoration('_')
				break

			case 'KeyB':
				addDecoration('**')
				break

			case 'KeyC':
				addDecoration('`')
				break

			case 'KeyS':
				addDecoration('~~')
				break

			case 'KeyU':
				addDecoration('[', '](url)')
				break

			case 'KeyT':
				addDecoration('[ ] ', '')
				break
		}
	})
}

export function favicon(init: string | null, event?: HTMLInputElement) {
	function createFavicon(emoji: string) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="85">${emoji}</text></svg>`
		document.querySelector("link[rel~='icon']")?.setAttribute('href', emoji ? svg : `src/assets/${getFavicon()}`)
	}

	if (init !== undefined && init !== null) {
		createFavicon(init)
	}

	if (event) {
		const val = event.value
		const isEmoji = val.match(/\p{Emoji}/gu) && !val.match(/[0-9a-z]/g)

		if (isEmoji) createFavicon(val)
		else event.value = ''

		eventDebounce({ favicon: isEmoji ? val : '' })
	}
}

export function tabTitle(init: string | null, event?: HTMLInputElement) {
	const title = init ? init : event ? stringMaxSize(event.value, 80) : tradThis('New tab')

	if (event) {
		eventDebounce({ tabtitle: title })
	}

	document.title = title
}

export function clock(
	init: Sync | null,
	event?: {
		is: 'analog' | 'seconds' | 'face' | 'ampm' | 'timezone' | 'usdate' | 'greeting'
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
		timezone: string
	}

	function zonedDate(timezone: string = 'auto') {
		const date = new Date()

		if (timezone === 'auto') return date

		const offset = date.getTimezoneOffset() / 60
		const utcHour = date.getHours() + offset
		date.setHours(utcHour + parseInt(timezone))

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

	function startClock(clock: Clock, greeting: string, usdate: boolean) {
		//
		function displayControl() {
			const numeric = $('clock'),
				analog = $('analogClock'),
				analogSec = $('analogSeconds')

			//cache celle qui n'est pas choisi
			clas(numeric, clock.analog, 'hidden')
			clas(analog, !clock.analog, 'hidden')

			//cache l'aiguille des secondes
			clas(analogSec, !clock.seconds && clock.analog, 'hidden')
		}

		function clockInterval() {
			//

			function numerical(date: Date) {
				//seul numerique a besoin du ampm
				function toAmpm(val: number) {
					if (val > 12) val -= 12
					else if (val === 0) val = 12
					else val

					return val
				}

				function fixunits(val: number) {
					let res = val < 10 ? '0' + val.toString() : val.toString()
					return res
				}

				let h = clock.ampm ? toAmpm(date.getHours()) : date.getHours(),
					m = fixunits(date.getMinutes()),
					s = fixunits(date.getSeconds())

				$('clock')!.textContent = `${h}:${m}${clock.seconds ? ':' + s : ''}`
			}

			function analog(date: Date) {
				function rotation(that: HTMLSpanElement, val: number) {
					that.style.transform = `rotate(${val}deg)`
				}

				let s = date.getSeconds() * 6,
					m = date.getMinutes() * 6,
					h = date.getHours() * 30

				//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
				if (true || date.getMinutes() === 0) rotation($('minutes')!, m)
				if (true || date.getHours() === 0) rotation($('hours')!, h)

				//tourne pas les secondes si pas de seconds
				if (clock.seconds) rotation($('analogSeconds')!, s)
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
		chrome.storage.sync.get(['clock', 'usdate', 'greeting'], (data) => {
			let clock = data.clock || {
				analog: false,
				seconds: false,
				ampm: false,
				timezone: 'auto',
				face: 'none',
			}

			switch (event.is) {
				case 'usdate': {
					clockDate(zonedDate(data.clock.timezone), event.checked || false)
					chrome.storage.sync.set({ usdate: event.checked })
					break
				}

				case 'greeting': {
					greetings(zonedDate(data.clock.timezone), event.value)
					chrome.storage.sync.set({ greeting: event.value })
					break
				}

				case 'timezone': {
					clockDate(zonedDate(event.value), data.usdate)
					greetings(zonedDate(event.value), data.greeting)
					clock.timezone = event.value
					break
				}

				case 'analog':
					clock.analog = event.checked
					break

				case 'face':
					clock.face = event.value as ClockFace
					break

				case 'seconds':
					clock.seconds = event.checked
					break
			}

			chrome.storage.sync.set({ clock })
			startClock(clock, data.greeting, data.usdate)
			changeAnalogFace(clock.face)
		})

		return
	}

	let clock = init?.clock || {
		analog: false,
		seconds: false,
		ampm: false,
		timezone: 'auto',
		face: 'none',
	}

	try {
		startClock(clock, init?.greeting || '', init?.usdate || false)
		clockDate(zonedDate(clock.timezone), init?.usdate || false)
		greetings(zonedDate(clock.timezone), init?.greeting || '')
		changeAnalogFace(clock.face)
		canDisplayInterface('clock')
	} catch (e) {
		errorMessage('Clock or greetings failed at init', e)
	}
}

export function quickLinks(
	init: Sync | null,
	event?: {
		is: 'add' | 'import' | 'style' | 'toggle' | 'newtab' | 'row'
		bookmarks?: { title: string; url: string }[]
		checked?: boolean
		value?: string
		elem?: Element
	}
) {
	const domlinkblocks = $('linkblocks')!

	async function initblocks(links: Link[], linksrow: number, isnewtab: boolean) {
		//
		function createBlock(link: Link) {
			let title = stringMaxSize(link.title, 64)
			let url = stringMaxSize(link.url, 512)

			//le DOM du block
			const img = document.createElement('img')
			const span = document.createElement('span')
			const atag = document.createElement('a')
			const li = document.createElement('li')

			img.alt = ''
			img.loading = 'lazy'
			img.setAttribute('draggable', 'false')

			atag.appendChild(img)
			atag.appendChild(span)
			atag.setAttribute('draggable', 'false')

			atag.href = url
			atag.setAttribute('rel', 'noreferrer noopener')

			if (isnewtab) {
				atag.setAttribute('target', '_blank')
			}

			li.id = link._id
			li.setAttribute('class', 'block')
			li.appendChild(atag)

			// this also adds "normal" title as usual
			textOnlyControl(li, title, domlinkblocks.className === 'text')

			return { icon: img, block: li }
		}

		function createRows(
			blocks: {
				icon: HTMLImageElement
				block: HTMLLIElement
			}[],
			rowSize: number
		) {
			const rowsAmount = Math.ceil(blocks.length / rowSize)

			// append uls to linkblocks
			for (let row = 0; row < rowsAmount; row++) {
				const ul = document.createElement('ul')

				// append block lis to uls (rows)
				for (let col = 0; col < rowSize; col++) {
					const li = blocks[col + rowSize * row]?.block
					if (li) ul.appendChild(li)
				}

				domlinkblocks.appendChild(ul)
			}
		}

		async function fetchNewIcon(dom: HTMLImageElement, url: string) {
			// Apply loading gif d'abord
			dom.src = 'src/assets/interface/loading.svg'

			const img = new Image()

			// DuckDuckGo favicon API is fallback
			let result = `https://icons.duckduckgo.com/ip3/${extractHostname(url)}.ico`
			const bonjourrAPI = await fetch(`https://favicon.bonjourr.fr/api/${extractHostname(url)}`)
			const apiText = await bonjourrAPI.text() // API return empty string if nothing found

			if (apiText.length > 0) {
				result = apiText
			}

			img.onload = () => (dom.src = result)
			img.src = result
			img.remove()

			return result
		}

		if (links.length > 0) {
			if (!init) {
				// remove old links blocks rows
				document.querySelectorAll('#linkblocks ul').forEach((ul) => ul.remove())
			}

			try {
				// Add blocks and events
				const blocklist = links.map((l) => createBlock(l))
				blocklist.forEach(({ block }) => addEvents(block))

				linksDragging()
				canDisplayInterface('links')
				createRows(blocklist, linksrow)

				// Load icons one by one
				links.map(async (link, index) => {
					const dom = blocklist[index].icon
					const needsToChange = ['api.faviconkit.com', 'loading.svg'].some((x) => link.icon.includes(x))

					// Fetch new icons if matches these urls
					if (needsToChange) {
						link.icon = await fetchNewIcon(dom, link.url)
						chrome.storage.sync.set({ [link._id]: link })
					}

					// Apply cached
					else dom.src = link.icon
				})
			} catch (e) {
				errorMessage('Failed to load links', e)
			}
		}

		// Links is done
		else canDisplayInterface('links')
	}

	function removeLinkSelection() {
		//enleve les selections d'edit
		domlinkblocks.querySelectorAll('img').forEach(function (e) {
			clas(e, false, 'selected')
		})
	}

	function addEvents(elem: HTMLLIElement) {
		// Mouse clicks
		elem.oncontextmenu = function (e) {
			e.preventDefault()
			removeLinkSelection()
			displayEditWindow(this as HTMLLIElement, { x: e.x, y: e.y })
		}

		if (!mobilecheck()) {
			elem.onkeyup = function (e) {
				if (e.key === 'e') {
					const { offsetLeft, offsetTop } = e.target as HTMLElement
					displayEditWindow(this as HTMLLIElement, { x: offsetLeft, y: offsetTop })
				}
			}
		}
	}

	function linksDragging() {
		type Coords = {
			order: number
			pos: { x: number; y: number }
			triggerbox: { x: [number, number]; y: [number, number] }
		}

		let draggedId: string = ''
		let draggedClone: HTMLLIElement
		let updatedOrder: { [key: string]: number } = {}
		let coords: { [key: string]: Coords } = {}
		let coordsEntries: [string, Coords][] = []
		let startsDrag = false
		let push = 0 // adds interface translate to cursor x (only for "fixed" clone)
		let [cox, coy] = [0, 0] // (cursor offset x & y)

		const deplaceElem = (dom: HTMLElement, x: number, y: number) => {
			dom.style.transform = `translateX(${x}px) translateY(${y}px)`
		}

		const initDrag = (ex: number, ey: number, path: EventTarget[]) => {
			let block = path.find((t) => (t as HTMLElement).className === 'block') as HTMLLIElement

			if (!block) {
				return
			}

			// Initialise toute les coordonnees
			// Defini l'ID de l'element qui se deplace
			// Defini la position de la souris pour pouvoir offset le deplacement de l'elem

			startsDrag = true
			draggedId = block.id
			push = dominterface.classList.contains('pushed') ? 100 : 0
			dominterface.style.cursor = 'grabbing'

			document.querySelectorAll('#linkblocks li').forEach((block, i) => {
				const { x, y, width, height } = block.getBoundingClientRect()
				const blockid = block.id

				updatedOrder[blockid] = i

				coords[blockid] = {
					order: i,
					pos: { x, y },
					triggerbox: {
						// Creates a box with 10% padding used to trigger
						// the rearrange if mouse position is in-between these values
						x: [x + width * 0.1, x + width * 0.9],
						y: [y + height * 0.1, y + height * 0.9],
					},
				}

				block.setAttribute('style', 'pointerEvents: none')
			})

			// Transform coords in array here to improve performance during mouse move
			coordsEntries = Object.entries(coords)

			const draggedDOM = $(draggedId)
			const draggedCoord = coords[draggedId]

			if (draggedDOM) {
				draggedDOM.setAttribute('style', 'opacity: 0')
				draggedClone = draggedDOM.cloneNode(true) as HTMLLIElement // create fixed positionned clone of element
				draggedClone.id = ''
				draggedClone.className = 'block dragging-clone on'

				const ul = document.querySelector('#linkblocks ul')
				if (ul) ul.appendChild(draggedClone) // append to ul to get same styling
			}

			if (draggedCoord) {
				cox = ex - draggedCoord.pos.x // offset to cursor position
				coy = ey - draggedCoord.pos.y // on dragged element
			}

			deplaceElem(draggedClone, ex - cox + push, ey - coy)
		}

		const applyDrag = (ex: number, ey: number) => {
			// Dragged element clone follows cursor
			deplaceElem(draggedClone, ex + push - cox, ey - coy)

			// Element switcher
			coordsEntries.forEach(function parseThroughCoords([key, val]) {
				if (
					// Mouse position is inside a block trigger box
					// And it is not the dragged block box
					// Nor the switched block (to trigger switch once)
					ex > val.triggerbox.x[0] &&
					ex < val.triggerbox.x[1] &&
					ey > val.triggerbox.y[0] &&
					ey < val.triggerbox.y[1]
				) {
					const drgO = coords[draggedId]?.order || 0 // (dragged order)
					const keyO = coords[key]?.order || 0 // (key order)
					let interval = [drgO, keyO] // interval of links to move
					let direction = 0

					if (drgO < keyO) direction = -1 // which direction to move links
					if (drgO > keyO) direction = 1

					if (direction > 0) interval[0] -= 1 // remove dragged index from interval
					if (direction < 0) interval[0] += 1

					interval = interval.sort((a, b) => a - b) // sort to always have [small, big]

					coordsEntries.forEach(([keyBis, coord], index) => {
						const neighboor = $(keyBis)

						if (!neighboor) {
							return
						}

						// Element index between interval
						if (index >= interval[0] && index <= interval[1]) {
							const ox = coordsEntries[index + direction][1].pos.x - coord.pos.x
							const oy = coordsEntries[index + direction][1].pos.y - coord.pos.y

							updatedOrder[keyBis] = index + direction // update order w/ direction
							deplaceElem(neighboor, ox, oy) // translate it to its neighboors position
							return
						}

						updatedOrder[keyBis] = index // keep same order
						deplaceElem(neighboor, 0, 0) // Not in interval (anymore) ? reset translate
					})

					updatedOrder[draggedId] = keyO // update dragged element order with triggerbox order
				}
			})
		}

		const endDrag = () => {
			if (draggedId && startsDrag) {
				const neworder = updatedOrder[draggedId]
				const { x, y } = coordsEntries[neworder][1].pos // last triggerbox position
				startsDrag = false
				draggedId = ''
				coords = {}
				coordsEntries = []

				deplaceElem(draggedClone, x + push, y)
				draggedClone.className = 'block dragging-clone' // enables transition (by removing 'on' class)
				dominterface.style.cursor = ''

				setTimeout(() => {
					chrome.storage.sync.get(null, (data) => {
						Object.entries(updatedOrder).forEach(([key, val]) => {
							const link = data[key] as Link
							link.order = val // Updates orders
						})

						eventDebounce({ ...data }) // saves

						document.querySelectorAll('#linkblocks ul').forEach((ul) => ul.remove()) // remove uls
						initblocks(bundleLinks(data as Sync), data.linksrow, data.linknewtab) // re-init blocks
					})
				}, 200)
			}
		}

		// These a the same init, apply & end function for mobile & desktop
		if (navigator.maxTouchPoints > 0) {
			domlinkblocks.ontouchmove = function (e) {
				// Uses touches to get the finger (or other input method :o) position
				!startsDrag
					? initDrag(e.touches[0]?.clientX || 0, e.touches[0]?.clientY || 0, e.composedPath())
					: applyDrag(e.touches[0]?.clientX || 0, e.touches[0]?.clientY || 0)
			}

			domlinkblocks.ontouchend = endDrag
		}
		//
		else {
			dominterface.onmousemove = function (e) {
				if (e.buttons !== 1) return // Do nothing unless left click is down
				!startsDrag ? initDrag(e.x, e.y, e.composedPath()) : applyDrag(e.x, e.y)
			}

			dominterface.onmouseup = endDrag
			dominterface.onmouseleave = endDrag
		}
	}

	function editEvents() {
		function submitEvent() {
			return updatesEditedLink($('editlink')!.getAttribute('data-linkid') || '')
		}

		function inputSubmitEvent(e: KeyboardEvent) {
			if (e.code === 'Enter') {
				submitEvent()
				const input = e.target as HTMLInputElement
				input.blur() // unfocus to signify change
			}
		}

		$('e_delete')?.addEventListener('click', function () {
			removeLinkSelection()
			removeblock($('editlink')!.getAttribute('data-linkid') || '')
			clas($('editlink'), false, 'shown')
		})

		$('e_submit')?.addEventListener('click', function () {
			const noErrorOnEdit = submitEvent() // returns false if saved icon data too big
			if (noErrorOnEdit) {
				closeEditLink() // only auto close on apply changes button
				removeLinkSelection()
			}
		})

		$('e_title')?.addEventListener('keyup', inputSubmitEvent)
		$('e_url')?.addEventListener('keyup', inputSubmitEvent)
		$('e_iconurl')?.addEventListener('keyup', inputSubmitEvent)
	}

	function displayEditWindow(domlink: HTMLLIElement, { x, y }: { x: number; y: number }) {
		//
		function positionsEditWindow() {
			const { innerHeight, innerWidth } = window // viewport size

			removeLinkSelection()

			if (x + 250 > innerWidth) x -= x + 250 - innerWidth // right overflow pushes to left
			if (y + 200 > innerHeight) y -= 200 // bottom overflow pushes above mouse

			// Moves edit link to mouse position
			document.querySelector('#editlink')?.setAttribute('style', `transform: translate(${x + 3}px, ${y + 3}px)`)
		}

		const linkId = domlink.id
		const domicon = domlink.querySelector('img')
		const domedit = document.querySelector('#editlink')
		const opendedSettings = has($('settings'), 'shown')

		chrome.storage.sync.get(linkId, (data) => {
			const { title, url, icon } = data[linkId]

			const domtitle = $('e_title') as HTMLInputElement
			const domurl = $('e_url') as HTMLInputElement
			const domiconurl = $('e_iconurl') as HTMLInputElement

			domtitle.setAttribute('placeholder', tradThis('Title'))
			domurl.setAttribute('placeholder', tradThis('Link'))
			domiconurl.setAttribute('placeholder', tradThis('Icon'))

			domtitle.value = title
			domurl.value = url
			domiconurl.value = icon

			positionsEditWindow()

			clas(domicon, true, 'selected')
			clas(domedit, true, 'shown')
			clas(domedit, opendedSettings, 'pushed')

			domedit?.setAttribute('data-linkid', linkId)

			domtitle.focus()
		})
	}

	function updatesEditedLink(linkId: string) {
		const e_title = $('e_title') as HTMLInputElement
		const e_url = $('e_url') as HTMLInputElement
		const e_iconurl = $('e_iconurl') as HTMLInputElement

		if (e_iconurl.value.length === 7500) {
			e_iconurl.value = ''
			e_iconurl.setAttribute('placeholder', tradThis('Icon must be < 8kB'))

			return false
		}

		chrome.storage.sync.get(linkId, (data) => {
			const domlink = $(linkId) as HTMLLIElement
			const domicon = domlink.querySelector('img') as HTMLImageElement
			const domurl = domlink.querySelector('a') as HTMLAnchorElement
			let link = data[linkId]

			link = {
				...link,
				title: stringMaxSize(e_title.value, 64),
				url: stringMaxSize(e_url.value, 512),
				icon: stringMaxSize(e_iconurl.value, 7500),
			}

			textOnlyControl(domlink, link.title, domlinkblocks.className === 'text')
			domurl.href = link.url
			domicon.src = link.icon

			// Updates
			chrome.storage.sync.set({ [linkId]: link })
		})

		return true
	}

	function removeblock(linkId: string) {
		chrome.storage.sync.get([linkId], (data) => {
			const links = bundleLinks(data as Sync)
			let link = data[linkId] as Link
			const linkDOM = $(linkId)

			if (!link || !linkDOM) {
				return
			}

			const rowDOM = linkDOM.parentElement as HTMLUListElement
			const height = linkDOM.getBoundingClientRect().height
			const isLastOnRow = rowDOM.childElementCount === 1

			linkDOM.setAttribute('style', 'height: ' + height + 'px')
			clas(linkDOM, true, 'removed')

			if (isLastOnRow) {
				rowDOM.setAttribute('style', 'max-height: 0; overflow: hidden')
			}

			setTimeout(function () {
				linkDOM.remove()

				if (isLastOnRow) {
					rowDOM.remove()
				}
			}, 600)

			links.forEach((l: Link) => {
				l.order -= l.order > link.order ? 1 : 0 // Decrement order for elements above the one removed
				data[l._id] = l // updates link in storage
			})

			chrome.storage.sync.set(isExtension ? data : { import: data })
			chrome.storage.sync.remove(link._id)
		})
	}

	function linkSubmission(type: 'add' | 'import', importList?: { title: string; url: string }[]) {
		// importList here can also be button dom when type is "addlink"
		// This needs to be cleaned up later

		chrome.storage.sync.get(null, (data) => {
			const links = bundleLinks(data as Sync)
			let newLinksList = []

			const validator = (title: string, url: string, order: number) => {
				url = stringMaxSize(url, 512)
				const to = (scheme: string) => url.startsWith(scheme)
				const acceptableSchemes = to('http://') || to('https://')
				const unacceptable = to('about:') || to('chrome://')

				return {
					order: order,
					_id: 'links' + randomString(6),
					title: stringMaxSize(title, 64),
					icon: 'src/assets/interface/loading.svg',
					url: acceptableSchemes ? url : unacceptable ? 'false' : 'https://' + url,
				}
			}

			// Default link submission
			if (type === 'add') {
				const titledom = $('i_title') as HTMLInputElement
				const urldom = $('i_url') as HTMLInputElement
				const title = titledom.value
				const url = urldom.value

				if (url.length < 3) return

				titledom.value = ''
				urldom.value = ''

				newLinksList.push(validator(title, url, links.length))
			}

			// When importing bookmarks
			if (type === 'import' && importList) {
				if (importList?.length === 0) return

				importList.forEach(({ title, url }, i: number) => {
					if (url !== 'false') {
						newLinksList.push(validator(title, url, links.length + i))
					}
				})
			}

			// Saves to storage added links before icon fetch saves again
			newLinksList.forEach((newlink) => {
				chrome.storage.sync.set({ [newlink._id]: newlink })
			})

			// Add new link(s) to existing ones
			links.push(...newLinksList)

			// Displays and saves before fetching icon
			initblocks(links, data.linksrow, data.linknewtab)
			domlinkblocks.style.visibility = 'visible'
		})
	}

	function textOnlyControl(block: HTMLLIElement, title: string, toText: boolean) {
		const span = block.querySelector('span')
		const a = block.querySelector('a')

		if (span && a) {
			span.textContent = toText && title === '' ? extractDomain(a.href) : title
		}
	}

	if (event) {
		switch (event.is) {
			case 'add':
				linkSubmission('add')
				break

			case 'import':
				linkSubmission('import', event.bookmarks)
				break

			case 'toggle': {
				clas($('linkblocks'), !event.checked, 'hidden')
				interfaceWidgetToggle(null, 'links')
				chrome.storage.sync.set({ quicklinks: event.checked })
				break
			}

			// TODO: newtab not working on new a11y links
			case 'newtab': {
				const val = event.checked || false
				chrome.storage.sync.set({ linknewtab: val })
				document.querySelectorAll('.block a').forEach((a) => {
					if (val) a.setAttribute('target', '_blank')
					else a.removeAttribute('target')
				})
				break
			}

			case 'style': {
				chrome.storage.sync.get(null, (data) => {
					const links = bundleLinks(data as Sync)
					const classes = ['large', 'medium', 'small', 'text']
					const blocks = document.querySelectorAll('#linkblocks .block') as NodeListOf<HTMLLIElement>

					links.forEach(({ title }, i: number) => textOnlyControl(blocks[i], title, event.value === 'text'))

					classes.forEach((c) => domlinkblocks.classList.remove(c))
					domlinkblocks.classList.add(event.value?.toString() || '')

					chrome.storage.sync.set({ linkstyle: event.value })
				})
				break
			}

			case 'row': {
				chrome.storage.sync.get(null, (data) => {
					const links = bundleLinks(data as Sync)
					const row = parseInt(event.value || '6')

					initblocks(links, row, data.linknewtab)
					eventDebounce({ linksrow: row })
				})
				break
			}
		}

		return
	}

	if (!init) {
		errorMessage('No data for quick links !')
		return
	}

	domlinkblocks.className = init.linkstyle // set class before appendBlock, cannot be moved
	clas($('linkblocks'), !init.quicklinks, 'hidden')
	initblocks(bundleLinks(init), init.linksrow, init.linknewtab)

	setTimeout(() => editEvents(), 150) // No need to activate edit events asap
	window.addEventListener('resize', closeEditLink)
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
	chrome.permissions.request({ permissions: ['bookmarks'] }, (granted) => {
		if (!granted) return

		chrome.storage.sync.get(null, (data) => {
			// ;(window.location.protocol === 'moz-extension:' ? browser : chrome).bookmarks.getTree().then((response) => {
			chrome.bookmarks.getTree().then((response) => {
				clas($('bookmarks_container'), true, 'shown')
				main(bundleLinks(data as Sync), response)
			})
		})
	})

	// Close events
	$('bmk_close')!.onclick = () => closeBookmarks($('bookmarks_container')!)

	$('bookmarks_container')!.addEventListener('click', function (e: MouseEvent) {
		if ((e.target as HTMLElement).id === 'bookmarks_container') closeBookmarks(this)
	})
}

export function weather(
	init: Sync | null,
	event?: { is: 'city' | 'geol' | 'units' | 'forecast' | 'temp'; checked?: boolean; value?: string; elem?: Element }
) {
	const date = new Date()
	const i_city = $('i_city') as HTMLInputElement
	const i_ccode = $('i_ccode') as HTMLInputElement
	const sett_city = $('sett_city') as HTMLInputElement
	const current = $('current')
	const forecast = $('forecast')
	const tempContainer = $('tempContainer')

	async function request(storage: Weather): Promise<Weather> {
		function getRequestURL(isForecast: boolean) {
			const WEATHER_API_KEY = [
				'YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=',
				'Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=',
				'N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk=',
			]
			const type = isForecast ? 'forecast' : 'weather'
			const lang = document.documentElement.getAttribute('lang')
			const key = window.atob(WEATHER_API_KEY[forecast ? 0 : 1])
			const units = storage.unit || 'metric'
			let location = ''

			if (storage.location?.length === 2) {
				location = `&lat=${storage.location[0]}&lon=${storage.location[1]}`
			} else {
				location = `&q=${encodeURI(storage.city)},${storage.ccode}`
			}

			return `https://api.openweathermap.org/data/2.5/${type}?appid=${key}${location}&units=${units}&lang=${lang}`
		}

		if (!navigator.onLine) {
			return storage
		}

		let currentResponse: any
		let forecastResponse: any
		let currentJSON: any
		let forecastJSON: any

		try {
			currentResponse = await fetch(getRequestURL(false))
			forecastResponse = await fetch(getRequestURL(true))
			currentJSON = await currentResponse.json()
			forecastJSON = await forecastResponse.json()
		} catch (error) {
			console.error(error)
			return storage
		}

		if (!currentResponse.ok || !forecastResponse.ok) {
			return storage // API not ok ? nothing was saved
		}

		//
		// Current API call
		//

		const { temp, feels_like, temp_max } = currentJSON.main
		const { sunrise, sunset } = currentJSON.sys
		const { description, id } = currentJSON.weather[0]

		storage = {
			...storage,
			lastCall: Math.floor(new Date().getTime() / 1000),
			lastState: {
				temp,
				feels_like,
				temp_max,
				sunrise,
				sunset,
				description,
				icon_id: id,
			},
		}

		//
		// Forecast API call
		//

		const thisdate = new Date()
		const todayHour = thisdate.getHours()
		let forecastDay = thisdate.getDate()
		let maxTempFromList = -273.15

		// Late evening forecast for tomorrow
		if (todayHour > 18) {
			const tomorrow = thisdate.setDate(thisdate.getDate() + 1)
			forecastDay = new Date(tomorrow).getDate()
		}

		// Get the highest temp for the specified day
		forecastJSON.list.forEach((elem: any) => {
			if (new Date(elem.dt * 1000).getDate() === forecastDay)
				maxTempFromList < elem.main.temp_max ? (maxTempFromList = elem.main.temp_max) : ''
		})

		storage.fcHigh = Math.round(maxTempFromList)

		return storage
	}

	async function weatherCacheControl(storage: Weather) {
		const now = Math.floor(date.getTime() / 1000)

		if (typeof storage.lastCall === 'number') {
			// Current: 30 mins
			if (navigator.onLine && (now > storage.lastCall + 1800 || sessionStorage.lang)) {
				sessionStorage.removeItem('lang')
				storage = await request(storage)
				chrome.storage.sync.set({ weather: storage })
			}

			displayWeather(storage)
		}

		// First startup
		else initWeather(storage)
	}

	async function initWeather(storage: Weather) {
		//
		// First, tries to get city and country code to add in settings
		const ipapi = await fetch('https://ipapi.co/json')

		if (ipapi.ok) {
			const json = await ipapi.json()

			if (!json.error) {
				storage = { ...storage, city: json.city, ccode: json.country }
			}
		}

		// Then use this as callback in Geolocation request
		async function setWeatherAfterGeolocation(location?: [number, number]) {
			if (location) {
				storage.location = location
			}

			// Request API with all infos available
			storage = await request(storage)

			displayWeather(storage)
			chrome.storage.sync.set({ weather: storage })

			setTimeout(() => {
				// If settings is available, all other inputs are
				if ($('settings')) {
					const i_ccode = $('i_ccode') as HTMLInputElement
					const i_city = $('i_city') as HTMLInputElement
					const i_geol = $('i_geol') as HTMLInputElement
					const sett_city = $('sett_city') as HTMLDivElement

					i_ccode.value = storage.ccode
					i_city.setAttribute('placeholder', storage.city)

					if (location) {
						clas(sett_city, true, 'hidden')
						i_geol.checked = true
					}
				}
			}, 150)
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => setWeatherAfterGeolocation([pos.coords.latitude, pos.coords.longitude]), // Accepted
			() => setWeatherAfterGeolocation() // Rejected
		)
	}

	function displayWeather(storage: Weather) {
		const currentState = storage.lastState

		if (!currentState) {
			return
		}

		const handleDescription = () => {
			const desc = currentState.description
			const feels = Math.floor(currentState.feels_like)
			const actual = Math.floor(currentState.temp)
			let tempText = ''

			switch (storage.temperature) {
				case 'feelslike': {
					tempText = `${tradThis('It currently feels like')} ${feels}°`
					break
				}

				case 'both': {
					tempText = `${tradThis('It is currently')} ${actual}°, ${tradThis('feels like')} ${feels}°`
					break
				}

				default: {
					tempText = `${tradThis('It is currently')} ${actual}°`
				}
			}

			const iconText = tempContainer?.querySelector('p')

			if (current && iconText) {
				current.textContent = `${desc[0].toUpperCase() + desc.slice(1)}. ${tempText}`
				iconText.textContent = actual + '°'
			}
		}

		const handleWidget = () => {
			let filename = 'lightrain'
			const categorieIds: [number[], string][] = [
				[[200, 201, 202, 210, 211, 212, 221, 230, 231, 232], 'thunderstorm'],
				[[300, 301, 302, 310], 'lightdrizzle'],
				[[312, 313, 314, 321], 'showerdrizzle'],
				[[500, 501, 502, 503], 'lightrain'],
				[[504, 520, 521, 522], 'showerrain'],
				[[511, 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622], 'snow'],
				[[701, 711, 721, 731, 741, 751, 761, 762, 771, 781], 'mist'],
				[[800], 'clearsky'],
				[[801], 'fewclouds'],
				[[802], 'brokenclouds'],
				[[803, 804], 'overcastclouds'],
			]

			categorieIds.forEach((category) => {
				if (category[0].includes(currentState.icon_id as never)) filename = category[1]
			})

			if (!tempContainer) {
				return
			}

			const widgetIcon = tempContainer.querySelector('img')
			const { now, rise, set } = sunTime()
			const timeOfDay = now < rise || now > set ? 'night' : 'day'
			const iconSrc = `src/assets/weather/${timeOfDay}/${filename}.png`

			if (widgetIcon) {
				widgetIcon.setAttribute('src', iconSrc)
				return
			}

			const icon = document.createElement('img')
			icon.src = iconSrc
			icon.setAttribute('alt', '')
			icon.setAttribute('draggable', 'false')
			tempContainer.prepend(icon)

			// from 1.2s request anim to .4s hide elem anim
			setTimeout(() => (tempContainer.style.transition = 'opacity 0.4s, max-height 0.4s, transform 0.4s'), 400)
		}

		const handleForecast = () => {
			if (forecast) {
				forecast.textContent = `${tradThis('with a high of')} ${storage.fcHigh}° ${tradThis(
					date.getHours() > 21 ? 'tomorrow' : 'today'
				)}.`

				clas(forecast, false, 'wait')
			}
		}

		handleWidget()
		handleDescription()
		handleForecast()

		clas(current, false, 'wait')
		clas(tempContainer, false, 'wait')
	}

	function forecastVisibilityControl(value: string = 'auto') {
		let isTimeForForecast = false

		if (value === 'auto') isTimeForForecast = date.getHours() < 12 || date.getHours() > 21
		else isTimeForForecast = value === 'always'

		clas(forecast, isTimeForForecast, 'shown')
	}

	async function updatesWeather() {
		chrome.storage.sync.get('weather', async (data) => {
			switch (event?.is) {
				case 'units': {
					data.weather.unit = event.checked ? 'imperial' : 'metric'

					data.weather = await request(data.weather)
					break
				}

				case 'city': {
					if (i_city.value.length < 3 || !navigator.onLine) {
						return false
					}

					data.weather.ccode = i_ccode.value
					data.weather.city = stringMaxSize(i_city.value, 64)

					const inputAnim = i_city.animate([{ opacity: 1 }, { opacity: 0.6 }], {
						direction: 'alternate',
						easing: 'linear',
						duration: 800,
						iterations: Infinity,
					})

					data.weather = await request(data.weather)

					i_city.value = ''
					i_city.blur()
					inputAnim.cancel()
					i_city.setAttribute('placeholder', data.weather.city)

					break
				}

				case 'geol': {
					data.weather.location = []

					if (event.checked) {
						navigator.geolocation.getCurrentPosition(
							async (pos) => {
								//update le parametre de location
								clas(sett_city, event.checked || true, 'hidden')
								data.weather.location = [pos.coords.latitude, pos.coords.longitude]

								data.weather = await request(data.weather)
								chrome.storage.sync.set({ weather: data.weather })
								displayWeather(data.weather)
							},
							() => {
								// Désactive geolocation if refused
								setTimeout(() => (event.checked = false), 400)
							}
						)
						return
					} else {
						i_city.setAttribute('placeholder', data.weather.city)
						i_ccode.value = data.weather.ccode
						clas(sett_city, event.checked || false, 'hidden')

						data.weather.location = []
						data.weather = await request(data.weather)
					}
					break
				}

				case 'forecast': {
					data.weather.forecast = event.value
					forecastVisibilityControl(event.value)
					break
				}

				case 'temp': {
					data.weather.temperature = event.value
					break
				}
			}

			chrome.storage.sync.set({ weather: data.weather })
			displayWeather(data.weather)
		})
	}

	// Event & Init
	if (event) {
		updatesWeather()
		return
	}

	if (init) {
		try {
			if (validateHideElem(init.hide)) {
				if (init.hide[1][1] + init.hide[1][2] === 2) return false
			}
		} catch (e) {
			errorMessage('Could not validate Hide in Weather', e)
		}

		try {
			forecastVisibilityControl(init.weather.forecast)
			weatherCacheControl(init.weather)
		} catch (e) {
			errorMessage('Weather init did not work', e)
		}
	}
}

export function initBackground(data: Sync) {
	const type = data.background_type || 'dynamic'
	const blur = data.background_blur
	const bright = data.background_bright

	backgroundFilter('init', { blur, bright })

	if (type === 'custom') {
		localBackgrounds({ every: data.custom_every, time: data.custom_time })
		return
	}

	unsplash(data)
}

export function imgBackground(url: string, loadTime: number = 0, isInit?: boolean) {
	const overlaydom = $('background_overlay') as HTMLDivElement
	const backgrounddom = $('background') as HTMLDivElement
	let img = new Image()

	img.onload = () => {
		if (loadTime) {
			const animDuration = loadTime > 1000 ? 1400 : loadTime + 400
			const changeDuration = (time: number) => {
				overlaydom.style.transition = `transform .4s, opacity ${time}ms`
			}

			changeDuration(animDuration)
			setTimeout(() => changeDuration(400), animDuration)
		}

		const applyBackground = () => {
			overlaydom.style.opacity = `1`
			backgrounddom.style.backgroundImage = `url(${url})`
			localIsLoading = false
		}

		isInit ? applyBackground() : setTimeout(applyBackground, 400)
	}

	img.src = url
	img.remove()
}

export function localBackgrounds(
	init: { every: string; time: number } | null,
	event?: {
		is: string
		settings?: HTMLElement
		button?: HTMLSpanElement
		file?: FileList
	}
) {
	// Storage needs to be flat, as to only ask for needed background
	// SelectedId is self explanatory
	// CustomIds is list to get amount of backgrounds without accessing them
	// storage.local = {
	// 	  `full${_id}`: "/9j/4AAQSkZJRgAB...",
	// 	  `thumb${_id}`: "/9j/4AAQSkZJRgAB...",
	// 	  idsList: [ _id1, _id2, _id3 ],
	//    selectedId: _id3
	// }

	function isOnlineStorageAtCapacity(newFile: string) {
		//
		// Only applies to versions using localStorage: 5Mo limit
		if (detectPlatform() === 'online') {
			const ls = localStorage.bonjourrBackgrounds

			// Takes dynamic cache + google font list
			const potentialFontList = JSON.parse(ls).googleFonts ? 0 : 7.6e5
			const lsSize = ls.length + potentialFontList + 10e4

			// Uploaded file in storage would exceed limit
			if (lsSize + newFile.length > 5e6) {
				alert(`Image size exceeds storage: ${Math.abs(lsSize - 5e6) / 1000}ko left`)
				$('background_overlay')!.style.opacity = '1'

				return true
			}
		}

		return false
	}

	function b64toBlobUrl(b64Data: string, callback: Function) {
		fetch(`data:image/jpeg;base64,${b64Data}`).then((res) => {
			res.blob().then((blob) => callback(URL.createObjectURL(blob)))
		})
	}

	function thumbnailSelection(id: string) {
		document.querySelectorAll('.thumbnail').forEach((thumb) => clas(thumb, false, 'selected'))
		clas(document.querySelector('.thumbnail#' + id), true, 'selected') // add selection style
	}

	function addNewImage(files: FileList) {
		const filesArray = [...files] // fileList to Array
		let filesIdsList: string[] = []
		let selected = ''

		filesArray.forEach(() => {
			const _id = randomString(6)
			selected = _id
			filesIdsList.push(_id)
		})

		filesArray.forEach((file, i) => {
			let reader = new FileReader()

			reader.onload = function (event) {
				const result = event.target?.result as string

				if (typeof result === 'string' && isOnlineStorageAtCapacity(result)) {
					return console.warn('Uploaded image was not saved') // Exit with warning before saving image
				}

				compress(result, 'thumbnail', filesIdsList[i])
				compress(result)

				chrome.storage.local.set({ ['custom_' + filesIdsList[i]]: result })
			}

			localIsLoading = true
			$('background_overlay')!.style.opacity = '0'
			reader.readAsDataURL(file)
		})

		// Adds to list, becomes selected and save background
		chrome.storage.local.get(['idsList'], (local) => {
			let list = [...local.idsList]
			list.push(...filesIdsList)

			if (local.idsList.length === 0) {
				chrome.storage.sync.set({ background_type: 'custom' }) // change type si premier local
			}

			setTimeout(() => thumbnailSelection(selected), 400)

			chrome.storage.local.set({
				...local,
				idsList: list,
				selectedId: selected,
			})
		})
	}

	function compress(file: string, state?: string, _id?: string) {
		//
		// Hides previous bg and credits
		if (state !== 'thumbnail') {
			clas($('credit'), false, 'shown')
			$('background_overlay')!.style.opacity = `0`
		}

		const compressStart = performance.now()
		const img = new Image()

		img.onload = () => {
			const elem = document.createElement('canvas')
			const ctx = elem.getContext('2d')

			if (!ctx) return

			// canvas proportionné à l'image
			// rétréci suivant le taux de compression
			// si thumbnail, toujours 140px
			const height = state === 'thumbnail' ? 140 * window.devicePixelRatio : img.height
			const scaleFactor = height / img.height
			elem.width = img.width * scaleFactor
			elem.height = height

			ctx.drawImage(img, 0, 0, img.width * scaleFactor, height) //dessine l'image proportionné

			const data = ctx.canvas.toDataURL(img.src) // renvoie le base64
			const cleanData = data.slice(data.indexOf(',') + 1, data.length) //used for blob

			if (state === 'thumbnail' && _id) {
				chrome.storage.local.set({ ['customThumb_' + _id]: cleanData })
				addThumbnails(cleanData, _id, null, true)

				return
			}

			b64toBlobUrl(cleanData, (bloburl: string) => {
				const compressTime = performance.now() - compressStart
				setTimeout(() => imgBackground(bloburl, compressTime), 400 - compressTime)
			})
		}

		img.src = file
	}

	function addThumbnails(data: string, _id: string, settingsDom: HTMLElement | null, isSelected: boolean) {
		const settings = settingsDom ? settingsDom : ($('settings') as HTMLElement)

		const div = document.createElement('div')
		const i = document.createElement('img')
		const rem = document.createElement('button')
		const wrap = settings.querySelector('#fileContainer')

		div.id = _id
		div.setAttribute('class', 'thumbnail' + (isSelected ? ' selected' : ''))
		if (!mobilecheck()) rem.setAttribute('class', 'hidden')

		let close = document.createElement('img')
		close.setAttribute('src', 'src/assets/interface/close.svg')
		rem.appendChild(close)

		b64toBlobUrl(data, (bloburl: string) => (i.src = bloburl))

		div.appendChild(i)
		div.appendChild(rem)
		wrap?.prepend(div)

		i.onmouseup = (e) => {
			if (e.button !== 0 || localIsLoading) return

			const target = e.target as HTMLElement

			if (!target.parentElement) {
				return console.log('No parent (thumbnail) found')
			}

			const _id = target.parentElement.id
			const bgKey = 'custom_' + _id

			chrome.storage.local.get('selectedId', (local) => {
				// image selectionné est différente de celle affiché
				if (_id !== local.selectedId) {
					thumbnailSelection(_id)

					$('background_overlay')!.style.opacity = `0`
					localIsLoading = true
					chrome.storage.local.set({ selectedId: _id }) // Change bg selectionné
					chrome.storage.local.get([bgKey], (local) => compress(local[bgKey])) //affiche l'image voulue
				}
			})
		}

		rem.onmouseup = (e) => {
			const path = e.composedPath()

			if (e.button !== 0 || localIsLoading) {
				return
			}

			chrome.storage.local.get(['idsList', 'selectedId'], (local) => {
				const thumbnail = path.find((d: EventTarget) => {
					return (d as HTMLElement).className.includes('thumbnail')
				}) as HTMLElement

				const _id = thumbnail.id
				let { idsList, selectedId } = local
				let poppedList = idsList.filter((s: string) => !s.includes(_id))

				thumbnail.remove()

				chrome.storage.local.remove('custom_' + _id)
				chrome.storage.local.remove(['customThumb_' + _id])
				chrome.storage.local.set({ idsList: poppedList })

				// Draw new image if displayed is removed
				if (_id === selectedId) {
					// To another custom
					if (poppedList.length > 0) {
						selectedId = poppedList[0]
						thumbnailSelection(selectedId)

						const toShowId = 'custom_' + poppedList[0]
						chrome.storage.local.get([toShowId], (local) => compress(local[toShowId]))
					}

					// back to unsplash
					else {
						$('background_overlay')!.style.opacity = '0'
						chrome.storage.sync.set({ background_type: 'dynamic' })

						setTimeout(() => {
							chrome.storage.sync.get('dynamic', (data) => unsplash(data as Sync))
						}, 400)

						selectedId = ''
					}

					chrome.storage.local.set({ selectedId }) // selected is new chosen background
				}
			})
		}
	}

	function displayCustomThumbnails(settingsDom: HTMLElement) {
		const thumbnails = settingsDom.querySelectorAll('#bg_tn_wrap .thumbnail')

		chrome.storage.local.get(['idsList', 'selectedId'], (local) => {
			const { idsList, selectedId } = local

			if (idsList.length > 0 && thumbnails.length < idsList.length) {
				const thumbsKeys = idsList.map((id: string) => 'customThumb_' + id) // To get keys for storage

				// Parse through thumbnails to display them
				chrome.storage.local.get(thumbsKeys, (local) => {
					Object.entries(local).forEach(([key, val]) => {
						if (!key.startsWith('customThumb_')) return // online only, can be removed after lsOnlineStorage rework

						const _id = key.replace('customThumb_', '')
						const blob = val.replace('data:image/jpeg;base64,', '')
						const isSelected = _id === selectedId

						addThumbnails(blob, _id, settingsDom, isSelected)
					})
				})
			}
		})
	}

	function refreshCustom(button: HTMLSpanElement) {
		chrome.storage.sync.get('custom_every', (sync) => {
			$('background_overlay')!.style.opacity = '0'
			turnRefreshButton(button, true)
			localIsLoading = true

			setTimeout(
				() =>
					localBackgrounds({
						every: sync.custom_every,
						time: 0,
					}),
				400
			)
		})
	}

	function applyCustomBackground(id: string) {
		chrome.storage.local.get(['custom_' + id], (local) => {
			const perfStart = performance.now()
			const background = local['custom_' + id]

			const cleanData = background.slice(background.indexOf(',') + 1, background.length)
			b64toBlobUrl(cleanData, (bloburl: string) => {
				imgBackground(bloburl, perfStart, !!init)
			})
		})
	}

	if (event) {
		if (event.is === 'thumbnail' && event.settings) displayCustomThumbnails(event.settings)
		if (event.is === 'newfile' && event.file) addNewImage(event.file)
		if (event.is === 'refresh' && event.button) refreshCustom(event.button)
		return
	}

	if (!init) {
		return
	}

	chrome.storage.local.get(['selectedId', 'idsList'], (local) => {
		try {
			// need all of saved stuff
			let { selectedId, idsList } = local
			const { every, time } = init
			const needNewImage = freqControl.get(every, time || 0)

			// 1.14.0 (firefox?) background recovery fix
			if (!idsList) {
				idsList = []
				selectedId = ''

				chrome.storage.local.get(null, (local) => {
					const ids = Object.keys(local)
						.filter((k) => k.startsWith('custom_'))
						.map((k) => k.replace('custom_', ''))

					chrome.storage.local.set({ idsList: ids, selectedId: ids[0] || '' })
					chrome.storage.sync.get(null, (data) => initBackground(data as Sync))
				})
			}

			if (idsList.length === 0) {
				chrome.storage.sync.get('dynamic', (data) => {
					unsplash(data as Sync) // no bg, back to unsplash
				})
				return
			}

			if (every && needNewImage) {
				if (idsList.length > 1) {
					idsList = idsList.filter((l: string) => !l.includes(selectedId)) // removes current from list
					selectedId = idsList[Math.floor(Math.random() * idsList.length)] // randomize from list
				}

				applyCustomBackground(selectedId)

				chrome.storage.sync.set({ custom_time: freqControl.set() })
				chrome.storage.local.set({ selectedId })

				if ($('settings')) thumbnailSelection(selectedId) // change selection if coming from refresh

				return
			}

			applyCustomBackground(selectedId)
		} catch (e) {
			errorMessage('Could not init local backgrounds', e)
		}
	})
}

export async function unsplash(
	init: Sync | null,
	event?: {
		is: string
		value?: string
		button?: HTMLSpanElement | null
	}
) {
	// TODO: Separate Collection type with users string
	type CollectionType = 'night' | 'noon' | 'day' | 'evening' | 'user'

	async function preloadImage(src: string) {
		const img = new Image()

		img.src = src
		await img.decode()
		img.remove()

		return
	}

	function imgCredits(image: UnsplashImage) {
		//
		// Filtering
		const domcredit = $('credit')
		let needsSpacer = false
		let artist = ''
		let photoLocation = ''
		let exifDescription = ''
		const referral = '?utm_source=Bonjourr&utm_medium=referral'
		const { city, country, name, username, link, exif } = image

		if (!city && !country) {
			photoLocation = tradThis('Photo by ')
		} else {
			if (city) photoLocation = city + ', '
			if (country) {
				photoLocation += country
				needsSpacer = true
			}
		}

		if (exif) {
			const orderedExifData = [
				{ key: 'model', format: `%val% - ` },
				{ key: 'aperture', format: `f/%val% ` },
				{ key: 'exposure_time', format: `%val%s ` },
				{ key: 'iso', format: `ISO %val% ` },
				{ key: 'focal_length', format: `%val%mm` },
			]

			orderedExifData.forEach(({ key, format }) => {
				if (Object.keys(exif).includes(key)) {
					const exifVal = exif[key as keyof typeof exif]

					if (exifVal) {
						exifDescription += key === 'iso' ? exifVal.toString() : format.replace('%val%', exifVal.toString())
					}
				}
			})
		}

		// Force Capitalization
		artist = name
			.split(' ')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase())
			.join(' ')

		// DOM element

		const locationDOM = document.createElement('a')
		const spacerDOM = document.createElement('span')
		const artistDOM = document.createElement('a')
		const exifDOM = document.createElement('p')

		exifDOM.className = 'exif'
		exifDOM.textContent = exifDescription
		locationDOM.textContent = photoLocation
		artistDOM.textContent = artist
		spacerDOM.textContent = ` - `

		locationDOM.href = link + referral
		artistDOM.href = 'https://unsplash.com/@' + username + referral

		if (domcredit) {
			domcredit.textContent = ''

			domcredit.appendChild(exifDOM)
			domcredit.appendChild(locationDOM)
			if (needsSpacer) domcredit.appendChild(spacerDOM)
			domcredit.appendChild(artistDOM)

			clas(domcredit, true, 'shown')
		}
	}

	function loadBackground(props: UnsplashImage, loadTime?: number) {
		imgBackground(props.url, loadTime || 0, !!init)
		imgCredits(props)

		// sets meta theme-color to main background's color
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', props.color)
	}

	async function requestNewList(collecType: CollectionType) {
		const header = new Headers()
		const collecString = allCollectionType[collecType] || allCollectionType.day
		const url = `https://api.unsplash.com/photos/random?collections=${collecString}&count=8`
		header.append('Authorization', `Client-ID 3686c12221d29ca8f7947c94542025d760a8e0d49007ec70fa2c4b9f9d377b1d`)
		header.append('Accept-Version', 'v1')

		const resp = await fetch(url, { headers: header })
		const json = await resp.json()

		if (resp.status === 404 || json.length === 1) {
			console.log(json?.errors)
			return false
		}

		const filteredList: UnsplashImage[] = []
		const { width, height } = screen
		const imgSize = width > height ? width : height // higher res on mobile

		json.forEach((img: any) => {
			filteredList.push({
				url: img.urls.raw + '&w=' + imgSize + '&dpr=' + window.devicePixelRatio,
				link: img.links.html,
				username: img.user.username,
				name: img.user.name,
				city: img.location.city,
				country: img.location.country,
				color: img.color,
				exif: img.exif,
				desc: img.description,
			})
		})

		return filteredList
	}

	function chooseCollection(customCollection?: string): CollectionType {
		if (customCollection) {
			customCollection = customCollection.replaceAll(` `, '')
			allCollectionType.user = customCollection
			return 'user'
		}

		return periodOfDay(sunTime())
	}

	function collectionUpdater(dynamic: Dynamic): CollectionType {
		const { every, lastCollec, collection } = dynamic
		const Pause = every === 'pause'
		const Day = every === 'day'

		if ((Pause || Day) && lastCollec) {
			return lastCollec // Keeps same collection on >day so that user gets same type of backgrounds
		}

		const collec = chooseCollection(collection) // Or updates collection with sunTime or user collec
		dynamic.lastCollec = collec
		chrome.storage.sync.set({ dynamic: dynamic })

		return collec
	}

	async function cacheControl(dynamic: Dynamic, caches: DynamicCache, collecType: CollectionType, preloading: boolean) {
		//
		const needNewImage = freqControl.get(dynamic.every, dynamic.time)
		let list = caches[collecType]

		if (preloading) {
			loadBackground(list[0])
			await preloadImage(list[1].url) // Is trying to preload next
			chrome.storage.local.remove('waitingForPreload')
			return
		}

		if (!needNewImage) {
			loadBackground(list[0]) // No need for new, load the same image
			return
		}

		// Needs new image, Update time
		dynamic.lastCollec = collecType
		dynamic.time = freqControl.set()

		// Removes previous image from list
		if (list.length > 1) list.shift()

		// Load new image
		loadBackground(list[0])

		// If end of cache, get & save new list
		if (list.length === 1 && navigator.onLine) {
			const newList = await requestNewList(collecType)

			if (newList) {
				caches[collecType] = list.concat(newList)
				await preloadImage(newList[0].url)
				chrome.storage.local.set({ dynamicCache: caches })
				chrome.storage.local.remove('waitingForPreload')
			}

			return
		}

		if (list.length > 1) await preloadImage(list[1].url) // Or preload next

		chrome.storage.sync.set({ dynamic: dynamic })
		chrome.storage.local.set({ dynamicCache: caches })
		chrome.storage.local.remove('waitingForPreload')
	}

	async function populateEmptyList(collecType: CollectionType, cache: DynamicCache) {
		const newList = await requestNewList(collecType)
		const changeStart = performance.now()

		if (!newList) {
			return // Don't save dynamicCache if request failed, also don't preload nothing
		}

		await preloadImage(newList[0].url)
		loadBackground(newList[0], performance.now() - changeStart)

		cache[collecType] = newList
		chrome.storage.local.set({ dynamicCache: cache })
		chrome.storage.local.set({ waitingForPreload: true })

		//preload
		await preloadImage(newList[1].url)
		chrome.storage.local.remove('waitingForPreload')
	}

	function updateDynamic(
		event: {
			is: string
			value?: string
			button?: HTMLSpanElement | null
		},
		sync: Sync,
		local: Local
	) {
		switch (event.is) {
			case 'refresh': {
				if (!event.button) return console.log('No buttons to animate')

				// Only refreshes background if preload is over
				// If not, animate button to show it is trying
				if (local.waitingForPreload === undefined) {
					turnRefreshButton(event.button, true)
					$('background_overlay')!.style.opacity = '0'

					const newDynamic = { ...sync.dynamic, time: 0 }
					chrome.storage.sync.set({ dynamic: newDynamic })
					chrome.storage.local.set({ waitingForPreload: true })

					setTimeout(() => cacheControl(newDynamic, local.dynamicCache, collectionUpdater(newDynamic), false), 400)

					return
				}

				turnRefreshButton(event.button, false)
				break
			}

			case 'every': {
				if (!event.value) return console.log('Not valid "every" value')

				sync.dynamic.every = event.value
				sync.dynamic.time = freqControl.set()
				chrome.storage.sync.set({ dynamic: sync.dynamic })
				break
			}

			// Back to dynamic and load first from chosen collection
			case 'removedCustom': {
				chrome.storage.sync.set({ background_type: 'dynamic' })
				loadBackground(local.dynamicCache[collectionUpdater(sync.dynamic)][0])
				break
			}

			// Always request another set, update last time image change and load background
			case 'collection': {
				if (!navigator.onLine || !event.value) return

				$('background_overlay')!.style.opacity = '0'

				// remove user collec
				if (event.value === '') {
					const defaultColl = chooseCollection()
					local.dynamicCache.user = []
					sync.dynamic.collection = ''
					sync.dynamic.lastCollec = defaultColl

					chrome.storage.sync.set({ dynamic: sync.dynamic })
					chrome.storage.local.set({ dynamicCache: local.dynamicCache })

					unsplash(sync)
					return
				}

				// add new collec
				sync.dynamic.collection = event.value
				sync.dynamic.lastCollec = 'user'
				sync.dynamic.time = freqControl.set()
				chrome.storage.sync.set({ dynamic: sync.dynamic })

				populateEmptyList(chooseCollection(event.value), local.dynamicCache)
				break
			}
		}
	}

	// collections source: https://unsplash.com/@bonjourr/collections
	const allCollectionType = {
		noon: 'GD4aOSg4yQE',
		day: 'o8uX55RbBPs',
		evening: '3M2rKTckZaQ',
		night: 'bHDh4Ae7O8o',
		user: '',
	}

	if (event) {
		// No init, Event
		chrome.storage.sync.get('dynamic', (sync) =>
			chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], (local) => {
				updateDynamic(event, sync as Sync, local as Local)
			})
		)
	}

	if (!init) {
		return
	}

	chrome.storage.local.get(['dynamicCache', 'waitingForPreload'], (local) => {
		try {
			// Real init start
			const collecType = collectionUpdater(init.dynamic)
			const cache = local.dynamicCache || localDefaults.dynamicCache

			if (cache[collecType].length === 0) {
				populateEmptyList(collecType, cache) // If list empty: request new, save sync & local
				return
			}

			cacheControl(init.dynamic, cache, collecType, local.waitingForPreload) // Not empty: normal cacheControl
		} catch (e) {
			errorMessage('Dynamic errored on init', e)
		}
	})

	return
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

	if (isEvent) {
		if (cat === 'blur') eventDebounce({ background_blur: val.blur })
		if (cat === 'bright') eventDebounce({ background_bright: val.bright })
	}
}

export function darkmode(value: 'auto' | 'system' | 'enable' | 'disable', isEvent?: boolean) {
	const time = sunTime()

	if (time) {
		const cases = {
			auto: time.now <= time.rise || time.now > time.set ? 'dark' : '',
			system: 'autodark',
			enable: 'dark',
			disable: '',
		}

		document.body.setAttribute('class', cases[value])

		if (isEvent) {
			chrome.storage.sync.set({ dark: value })
		}
	}
}

export function searchbar(init: Searchbar | null, event?: any, that?: HTMLInputElement) {
	const domsearchbar = $('searchbar') as HTMLInputElement
	const emptyButton = $('sb_empty') as HTMLButtonElement
	const submitButton = $('sb_submit') as HTMLButtonElement

	const display = (shown: boolean) => $('sb_container')?.setAttribute('class', shown ? 'shown' : 'hidden')
	const setEngine = (value: string) => domsearchbar.setAttribute('data-engine', value)
	const setRequest = (value: string) => domsearchbar.setAttribute('data-request', stringMaxSize(value, 512))
	const setNewtab = (value: boolean) => domsearchbar.setAttribute('data-newtab', value.toString())
	const setOpacity = (value: number) => {
		domsearchbar.setAttribute('style', `background: rgba(255, 255, 255, ${value}); color: ${value > 0.4 ? '#222' : '#fff'}`)

		if (value > 0.4) $('sb_container')?.classList.add('opaque')
		else $('sb_container')?.classList.remove('opaque')
	}

	function updateSearchbar() {
		chrome.storage.sync.get('searchbar', (data) => {
			if (!that) {
				return
			}

			switch (event) {
				case 'searchbar': {
					data.searchbar.on = that.checked
					display(that.checked)
					interfaceWidgetToggle(null, 'searchbar')
					break
				}

				case 'engine': {
					data.searchbar.engine = that.value
					clas($('searchbar_request'), that.value === 'custom', 'shown')
					setEngine(that.value)
					break
				}

				case 'opacity': {
					data.searchbar.opacity = parseFloat(that.value)
					setOpacity(parseFloat(that.value))
					break
				}

				case 'request': {
					let val = that.value

					if (val.indexOf('%s') !== -1) {
						data.searchbar.request = stringMaxSize(val, 512)
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
					data.searchbar.newtab = that.checked
					setNewtab(that.checked)
					break
				}
			}

			eventDebounce({ searchbar: data.searchbar })
		})
	}

	function submitSearch() {
		let searchURL = 'https://www.google.com/search?q=%s'
		const isNewtab = domsearchbar.getAttribute('data-newtab') === 'true'
		const engine = domsearchbar.getAttribute('data-engine') || 'google'
		const request = domsearchbar.getAttribute('data-request') || ''
		const lang = document.documentElement.getAttribute('lang') || 'en'

		type EnginesKey = keyof typeof enginesUrls
		type LocalesKey = keyof typeof enginesLocales
		type LocalesLang = keyof typeof enginesLocales.google

		// is a valid engine
		if (engine in enginesUrls) {
			searchURL = enginesUrls[engine as EnginesKey]

			// has found a translation
			if (engine in enginesLocales && lang in enginesLocales[engine as LocalesKey]) {
				const selectedLocale = enginesLocales[engine as LocalesKey]
				const selectedLang = selectedLocale[lang as LocalesLang]

				searchURL = searchURL.replace('%l', selectedLang)
			}
		}
		// is custom engine
		else if (engine === 'custom') {
			searchURL = request
		}

		searchURL = searchURL.replace('%s', encodeURIComponent(domsearchbar.value))

		if (isNewtab) window.open(searchURL, '_blank')
		else window.location.href = searchURL
	}

	function toggleInputButton(toggle: boolean) {
		if (toggle) {
			emptyButton.removeAttribute('disabled')
			submitButton.removeAttribute('disabled')
		} else {
			emptyButton.setAttribute('disabled', '')
			submitButton.setAttribute('disabled', '')
		}
	}

	domsearchbar.onkeyup = function (e) {
		const domssb = this as HTMLInputElement
		if (e.key === 'Enter' && domssb.value.length > 0) {
			submitSearch()
		}
	}

	domsearchbar.oninput = function () {
		const domssb = this as HTMLInputElement
		const hasText = domssb.value.length > 0

		clas(emptyButton, hasText, 'shown')
		clas(submitButton, hasText, 'shown')
		toggleInputButton(hasText)
	}

	emptyButton.onclick = function () {
		domsearchbar.value = ''
		domsearchbar.focus()
		clas(emptyButton, false, 'shown')
		clas(submitButton, false, 'shown')
		toggleInputButton(false)
	}

	submitButton.onclick = function () {
		submitSearch()
	}

	if (event) {
		updateSearchbar()
		return
	}

	const { on, engine, request, newtab, opacity } = init || syncDefaults.searchbar

	try {
		display(on)
		setEngine(engine)
		setRequest(request)
		setNewtab(newtab)
		setOpacity(opacity)

		if (on) domsearchbar.focus()
	} catch (e) {
		errorMessage('Error in searchbar initialization', e)
	}
}

export async function quotes(
	init: Sync | null,
	event?: {
		is: 'toggle' | 'author' | 'frequency' | 'type' | 'refresh'
		value?: string
		checked?: boolean
	}
) {
	function display(on: boolean) {
		clas($('linkblocks'), on, 'withQuotes')
		$('quotes_container')?.setAttribute('class', on ? 'shown' : 'hidden')
	}

	async function newQuote(lang: string, type: string) {
		try {
			if (!navigator.onLine) {
				return []
			}

			// Fetch a random quote from the quotes API
			const query = (type += type === 'classic' ? `/${lang}` : '')
			const response = await fetch('https://quotes.bonjourr.fr/' + query)
			const json = await response.json()

			if (response.ok) {
				return json
			}
		} catch (error) {
			console.warn(error)
			return []
		}
	}

	function insertToDom(values: Quote) {
		const quoteDOM = $('quote')
		const authorDOM = $('author')

		if (!values || !quoteDOM || !authorDOM) {
			return
		}

		quoteDOM.textContent = values.content
		authorDOM.textContent = values.author
	}

	function controlCacheList(list: Quote[], lang: string, type: string) {
		list.shift() // removes used quote
		chrome.storage.local.set({ quotesCache: list })

		if (list.length < 2) {
			newQuote(lang, type).then((list) => {
				chrome.storage.local.set({ quotesCache: list })
			})
		}

		return list
	}

	function updateSettings() {
		chrome.storage.sync.get(['lang', 'quotes'], async (data) => {
			const updated = { ...data.quotes }
			const { lang, quotes } = data

			switch (event?.is) {
				case 'toggle': {
					const on = event.checked || false // to use inside storage callback
					updated.on = on

					chrome.storage.local.get('quotesCache', (local) => {
						insertToDom(local.quotesCache[0])
						display(on)
					})

					interfaceWidgetToggle(null, 'quotes')
					break
				}

				// TODO: investigate class toggle opposite of data
				case 'author': {
					clas($('author'), event.checked || false, 'alwaysVisible')
					updated.author = event.checked
					break
				}

				case 'frequency': {
					updated.frequency = event.value
					break
				}

				case 'type': {
					if (event.value) {
						updated.type = event.value

						const list = await newQuote(lang, event.value)
						chrome.storage.local.set({ quotesCache: list })

						insertToDom(list[0])
					}
					break
				}

				case 'refresh': {
					updated.last = freqControl.set()

					chrome.storage.local.get('quotesCache', async (local) => {
						const { quotesCache } = local as Local
						const quote = controlCacheList(quotesCache, lang, quotes.type)[0]
						insertToDom(quote)
					})

					break
				}
			}

			chrome.storage.sync.set({ quotes: updated })
		})
	}

	// update and quit
	if (event) {
		updateSettings()
		return
	}

	// Cache:
	// storage.local = { quotesCache: Array(20) }
	// NeedsNewQuote: Removes first element of the list
	// if list is too small, fetches new batch of quotes
	// All quotes type share the same cache
	// changing quotes type fetches new batch

	if (!init) {
		errorMessage('No data to display Quotes !')
		return
	}

	// Init
	chrome.storage.local.get('quotesCache', async (local) => {
		canDisplayInterface('quotes')

		const { lang, quotes } = init
		let needsNewQuote = freqControl.get(quotes.frequency, quotes.last)
		let cache = local.quotesCache
		let quote: Quote

		if (!cache || cache?.length === 0) {
			cache = await newQuote(lang, quotes.type) // gets list
			chrome.storage.local.set({ quotesCache: cache }) // saves list

			quote = cache[0]
		}

		if (needsNewQuote) {
			quotes.last = freqControl.set() // updates last quotes timestamp
			chrome.storage.sync.set({ quotes })

			quote = controlCacheList(cache, lang, quotes.type)[0] // has removed last quote from cache
		}

		// quotes off, just quit
		if (init?.quotes?.on === false) {
			return
		}

		quote = cache[0] // all conditions passed, cache is safe to use

		// Displays
		if (quotes.author) {
			$('author')?.classList.add('alwaysVisible')
		}
		insertToDom(quote)
		display(true)
	})
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
					setTimeout(() => $('credit')?.removeAttribute('style'), 400)
				}, 200)
			}
			chrome.storage.sync.set({ reviewPopup: 'removed' })
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

		const creditdom = $('credit')
		creditdom ? (creditdom.style.opacity = '0') : ''

		setTimeout(() => dom.wrap.classList.add('shown'), 200)

		dom.review.addEventListener('mousedown', () => closePopup(false))
		dom.donate.addEventListener('mousedown', () => closePopup(false))
		dom.desc.addEventListener('click', () => closePopup(true), { passive: true })
	}

	// TODO: condition a verifier

	if (typeof value === 'number') {
		if (value > 30) affiche() //s'affiche après 30 tabs
		else chrome.storage.sync.set({ reviewPopup: value + 1 })

		return
	}

	if (value !== 'removed') {
		chrome.storage.sync.set({ reviewPopup: 0 })
	}
}

export function modifyWeightOptions(weights: string[], settingsDom?: HTMLElement) {
	const select = (settingsDom ? settingsDom : ($('settings') as HTMLElement)).querySelector('#i_weight')
	const options = select?.querySelectorAll('option')

	if ((!weights || weights.length === 0) && options) {
		options.forEach((option) => (option.style.display = 'block'))
		return true
	}

	// Theres weights
	else {
		// filters
		if (weights.includes('regular')) weights[weights.indexOf('regular')] = '400'
		weights = weights.map((aa) => aa)

		// toggles selects
		if (options) {
			options.forEach((option) => (option.style.display = weights.indexOf(option.value) !== -1 ? 'block' : 'none'))
		}
	}
}

export function safeFont(settingsDom?: HTMLElement) {
	const is = safeFontList
	let toUse = is.fallback
	const hasUbuntu = document.fonts.check('16px Ubuntu')
	const notAppleOrWindows = !testOS.mac && !testOS.windows && !testOS.ios

	if (testOS.windows) toUse = is.windows
	else if (testOS.android) toUse = is.android
	else if (testOS.mac || testOS.ios) toUse = is.apple
	else if (notAppleOrWindows && hasUbuntu) toUse = is.linux

	if (settingsDom) {
		settingsDom.querySelector('#i_customfont')?.setAttribute('placeholder', toUse.placeholder)
		modifyWeightOptions(toUse.weights, settingsDom)
	}

	return toUse
}

export function customFont(
	init: Font | null,
	event?: { is: 'autocomplete' | 'size' | 'family' | 'weight'; value?: string; elem?: HTMLElement }
) {
	function setSize(val: string) {
		dominterface.style.fontSize = parseInt(val) / 16 + 'em' // 16 is body px size
	}

	function setWeight(family: string, weight: string) {
		if (weight) {
			const list = safeFont().weights
			dominterface.style.fontWeight = weight
			$('searchbar')!.style.fontWeight = weight

			// Default bonjourr lowers font weight on clock (because we like it)
			const loweredWeight = parseInt(weight) > 100 ? list[list.indexOf(weight) - 1] : weight
			$('clock')!.style.fontWeight = family ? weight : loweredWeight
		}
	}

	function setFamily(family: string, fontface: string) {
		$('fontstyle')!.textContent = fontface
		$('clock')!.style.fontFamily = '"' + family + '"'
		$('credit')!.style.fontFamily = '"' + family + '"'
		dominterface.style.fontFamily = '"' + family + '"'
	}

	async function setFontface(url: string) {
		const resp = await fetch(url)
		const text = await resp.text()
		const fontface = text.replace(/(\r\n|\n|\r|  )/gm, '')
		chrome.storage.local.set({ fontface })

		return fontface
	}

	function updateFont() {
		function fetchFontList(callback: (json: google.fonts.WebfontList) => void) {
			chrome.storage.local.get('googleFonts', async (local) => {
				//
				// Get list from storage
				if (local.googleFonts) {
					callback(local.googleFonts)
					return
				}

				if (!navigator.onLine) {
					return
				}

				// Get list from API
				const a = 'QUl6YVN5QWt5M0pZYzJyQ09MMWpJc3NHQmdMcjFQVDR5VzE1ak9r'
				const url = 'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=' + window.atob(a)
				const resp = await fetch(url)

				if (!resp.ok) {
					return // return nothing if smth wrong, will try to fetch next time
				}

				const json = await resp.json()

				// json has at least one available family
				if (json.items?.length > 0 && typeof json.items[0]?.family === 'string') {
					chrome.storage.local.set({ googleFonts: json })
					callback(json)
				}
			})
		}

		function removeFont() {
			const domstyle = $('fontstyle') as HTMLStyleElement
			const domclock = $('clock') as HTMLDivElement
			const domcredit = $('credit') as HTMLDivElement
			const domsearchbar = $('searchbar') as HTMLDivElement

			domstyle.textContent = ''
			domclock.style.fontFamily = ''
			domcredit.style.fontFamily = ''
			dominterface.style.fontFamily = ''

			// weights
			const baseWeight = testOS.windows ? '400' : '300'
			dominterface.style.fontWeight = baseWeight
			domsearchbar.style.fontWeight = baseWeight
			domclock.style.fontWeight = ''

			$('i_weight')?.setAttribute('value', baseWeight)

			return { url: '', family: '', availWeights: [] as string[], weight: baseWeight }
		}

		async function changeFamily(json: google.fonts.WebfontList, family: string) {
			//
			// Cherche correspondante
			const domfamily = $('i_customfont') as HTMLInputElement
			const domweight = $('i_weight') as HTMLSelectElement
			const font = json.items.filter((font) => font.family.toUpperCase() === family.toUpperCase())

			// One font has been found
			if (font.length > 0) {
				const availWeights = font[0].variants.filter((variant) => !variant.includes('italic'))
				const defaultWeight = availWeights.includes('regular') ? '400' : availWeights[0]
				const url = encodeURI(`https://fonts.googleapis.com/css?family=${font[0].family}:${defaultWeight}`)
				const fontface = await setFontface(url)

				setFamily(font[0].family, fontface)
				setWeight(font[0].family, '400')
				modifyWeightOptions(availWeights)
				domweight.value = '400'

				if (domfamily) domfamily.blur()
				return { url, family: font[0].family, availWeights, weight: '400' }
			}

			// No fonts found
			else {
				domfamily.value = ''
				safeFont($('settings') as HTMLElement)
				return { url: '', family: '', availWeights: [] as string[], weight: testOS.windows ? '400' : '300' }
			}
		}

		chrome.storage.sync.get('font', async ({ font }) => {
			switch (event?.is) {
				case 'autocomplete': {
					fetchFontList((json) => {
						if (!json) return

						const fragment = new DocumentFragment()

						json.items.forEach(function addOptions(item) {
							const option = document.createElement('option')

							option.textContent = item.family
							option.setAttribute('value', item.family)
							fragment.appendChild(option)
						})

						if (event.elem) {
							event.elem.querySelector('#dl_fontfamily')?.appendChild(fragment)
						}
					})
					break
				}

				case 'family': {
					const val = event.value

					if (val === '') {
						safeFont($('settings') as HTMLElement)
						debounce(() => {
							chrome.storage.local.remove('fontface')
							eventDebounce({ font: { size: font.size, ...removeFont() } })
						}, 200)
					}

					if (typeof val === 'string' && val.length > 1) {
						fetchFontList(async (json) => {
							chrome.storage.sync.set({
								font: { size: font.size, ...(await changeFamily(json, val)) },
							})
						})
					}

					break
				}

				case 'weight': {
					if (font.url) {
						font.url = font.url.slice(0, font.url.lastIndexOf(':') + 1)
						font.url += event.value
						setFamily(font.family, await setFontface(font.url))
					}

					// If nothing, removes custom font
					else font.weight = event.value

					setWeight(font.family, event.value || '400')
					eventDebounce({ font: font })
					break
				}

				case 'size': {
					if (event.value) {
						font.size = event.value
						setSize(event.value)
						eventDebounce({ font: font })
					}
					break
				}
			}
		})
	}

	if (event) {
		updateFont()
		return
	}

	// init
	try {
		if (!init) {
			return
		}

		const { size, family, weight, url } = init

		setSize(size)
		setWeight(family, weight)

		if (family === '') {
			return
		}

		// Sets family
		chrome.storage.local.get('fontface', async (local) => {
			setFamily(family, local.fontface || (await setFontface(url))) // fetch font-face data if none in storage
			canDisplayInterface('fonts')
		})
	} catch (e) {
		errorMessage('Custom fonts failed to start', e)
	}
}

export function textShadow(init: number | null, event?: number) {
	const val = init ? init : event
	dominterface.style.textShadow = `1px 2px 6px rgba(0, 0, 0, ${val})`

	if (event) {
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

export function hideElem(
	init: Hide | null,
	event?: { is: 'buttons' | 'hide'; buttonList?: NodeListOf<HTMLButtonElement>; button?: HTMLButtonElement }
) {
	const IDsList = [
		['time', ['time-container', 'date']],
		['main', ['greetings', 'description', 'tempContainer']],
		['linkblocks', ['linkblocks']],
		['showSettings', ['showSettings']],
	]

	// Returns { row, col } to naviguate [[0, 0], [0, 0, 0]] etc.
	const getEventListPosition = (that: HTMLButtonElement) => ({
		row: parseInt(that.getAttribute('data-row') || '0'),
		col: parseInt(that.getAttribute('data-col') || '0'),
	})

	function isEverythingHidden(list: Hide, row: number) {
		const filtered = list[row].filter((el) => el === 1)
		return filtered.length === list[row].length
	}

	function initElements(list: Hide) {
		list.forEach((row, row_i) => {
			const parent = IDsList[row_i][0] as string // [0] is always string

			if (isEverythingHidden(list, row_i)) {
				clas($(parent), true, 'he_hidden')
			}

			// Hide children
			row.forEach((child, child_i) => {
				const id = IDsList[row_i][1][child_i]
				if (!!child) {
					clas($(id), true, 'he_hidden')
				}
			})
		})
	}

	function initButtons() {
		chrome.storage.sync.get('hide', (data) => {
			try {
				data.hide = validateHideElem(data.hide) ? data.hide : [[0, 0], [0, 0, 0], [0], [0]]
				event?.buttonList?.forEach((button) => {
					const pos = getEventListPosition(button)
					if (data.hide[pos.row][pos.col] === 1) button.classList.toggle('clicked')
				})
			} catch (e) {
				errorMessage('Hide buttons failed', e)
			}
		})
	}

	function toggleElement() {
		chrome.storage.sync.get(['weather', 'hide'], (data) => {
			data.hide = validateHideElem(data.hide) ? data.hide : [[0, 0], [0, 0, 0], [0], [0]]

			if (!event?.button) {
				return
			}

			const pos = getEventListPosition(event.button)
			const state = event.button.classList.contains('clicked')
			const child = IDsList[pos.row][1][pos.col]
			const parent = IDsList[pos.row][0] as string

			// Update hidden list
			data.hide[pos.row][pos.col] = state ? 1 : 0
			chrome.storage.sync.set({ hide: data.hide })

			// Re-activates weather
			if (!state && pos.row === 1 && pos.col > 0 && 'weather' in data) {
				weather(data as Sync)
			}

			// Toggle children and parent if needed
			clas($(child), state, 'he_hidden')
			clas($(parent), isEverythingHidden(data.hide, pos.row), 'he_hidden')
		})
	}

	if (event) {
		if (event.is === 'buttons' && event.buttonList) initButtons()
		if (event.is === 'hide' && event.button) toggleElement()
		return
	}

	if (init && validateHideElem(init)) {
		try {
			initElements(init)
		} catch (e) {
			errorMessage('Hide failed on init', e)
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

export function filterImports(data: any) {
	// TODO: Somehow type filterImports

	let result = { ...syncDefaults, ...data }

	// Hide elem classes changed at some point
	if (validateHideElem(data.hide)) {
		const weatherIndex = data.hide.indexOf('weather_desc')
		const widgetIndex = data.hide.indexOf('w_icon')

		if (weatherIndex >= 0) data.hide[weatherIndex] = 'description'
		if (widgetIndex >= 0) data.hide[widgetIndex] = 'widget'
	} else {
		data.hide = [[0, 0], [0, 0, 0], [0], [0]]
	}

	// <1.9.0 searchbar options was boolean
	if (typeof data.searchbar === 'boolean') {
		result.on = data.searchbar
		result.newtab = data.searchbar_newtab || false
		result.engine = data.searchbar_engine ? data.searchbar_engine.replace('s_', '') : 'google'
	}

	// Filter links to remove alias and give random ids
	try {
		function linksFilter(sync: any) {
			const aliasKeyList = Object.keys(sync).filter((key) => key.match('alias:'))

			sync.links?.forEach(({ title, url, icon }: Link, i: number) => {
				const id = 'links' + randomString(6)
				const filteredIcon = icon.startsWith('alias:') ? sync[icon] : icon

				sync[id] = { _id: id, order: i, title, icon: filteredIcon, url }
			})

			aliasKeyList.forEach((key) => delete sync[key]) // removes <1.13.0 aliases
			delete sync.links // removes <1.13.0 links array

			return sync
		}
		result = linksFilter(result)
	} catch (e) {
		errorMessage('Messed up in filter imports', e)
	}

	return result
}

export function canDisplayInterface(cat: keyof typeof functionsLoad | null, init?: Sync) {
	//
	// Progressive anim to max of Bonjourr animation time
	function displayInterface() {
		const domshowsettings = $('showSettings') as HTMLDivElement
		let loadtime = performance.now() - loadtimeStart

		if (loadtime > 400) loadtime = 400
		loadtime = loadtime < 33 ? 0 : 400

		domshowsettings.style.transition = `opacity ${loadtime}ms`
		dominterface.style.transition = `opacity ${loadtime}ms, transform .4s`
		dominterface.style.opacity = '1'

		clas(domshowsettings, true, 'enabled')

		setTimeout(() => {
			dominterface.classList.remove('init')
			domshowsettings.classList.remove('init')
			domshowsettings.style.transition = ``

			chrome.storage.sync.get(null, (data) => settingsInit(data as Sync))
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

export function interfaceWidgetToggle(init: Sync | null, event?: 'links' | 'quotes' | 'searchbar') {
	const toggleEmpty = (is: boolean) => clas($('widgets'), is, 'empty')

	// Event is a string of the widget name to toggle
	if (event) {
		chrome.storage.sync.get(['searchbar', 'quotes', 'quicklinks'], (data) => {
			let displayed = {
				links: data.quicklinks,
				quotes: data.quotes.on,
				searchbar: data.searchbar.on,
			}

			displayed[event] = !displayed[event] // toggles relevent widget
			toggleEmpty(!(displayed.links || displayed.quotes || displayed.searchbar)) // checks if all values are false
		})

		return
	}

	if (init) {
		toggleEmpty(!(init.quicklinks || init.searchbar?.on || init.quotes?.on)) // if one is true, not empty
	}
}

function onlineAndMobileHandler() {
	//

	if (mobilecheck()) {
		// For Mobile that caches pages for days
		document.addEventListener('visibilitychange', () => {
			chrome.storage.sync.get(['dynamic', 'waitingForPreload', 'weather', 'background_type', 'hide'], (data) => {
				const { dynamic, background_type } = data
				const dynamicNeedsImage = background_type === 'dynamic' && freqControl.get(dynamic.every, dynamic.time)

				if (dynamicNeedsImage) {
					$('background_overlay')!.style.opacity = '0'
					unsplash(data as Sync)
				}

				clock(data as Sync)
				sunTime(data.weather)
				weather(data as Sync)
			})
		})
	}

	// Only on Online / Safari
	if (detectPlatform() === 'online') {
		//
		// Update export code on localStorage changes

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js')
		}

		// PWA install trigger (30s interaction default)
		let promptEvent
		window.addEventListener('beforeinstallprompt', function (e) {
			promptEvent = e
			return promptEvent
		})

		// Safari overflow fix
		// Todo: add safari condition
		const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)

		window.addEventListener('resize', appHeight)
		appHeight()

		if (testOS.ios && navigator.userAgent.includes('Firefox')) {
			// Fix for opening tabs Firefox iOS
			let globalID: number
			function triggerAnimationFrame() {
				appHeight()
				globalID = requestAnimationFrame(triggerAnimationFrame)
			}

			window.requestAnimationFrame(triggerAnimationFrame)
			setTimeout(function () {
				cancelAnimationFrame(globalID)
			}, 500)
		}
	}
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
	textField(data.textfield)

	customCss(data.css)
	hideElem(data.hide)
	initBackground(data)
	quickLinks(data)
	interfaceWidgetToggle(data)

	setInterval(() => {
		if (navigator.onLine) {
			chrome.storage.sync.get(['weather', 'hide'], (data) => {
				weather(data as Sync) // Checks every 5 minutes if weather needs update
			})
		}
	}, 300000)
}

type FunctionsLoadState = 'Off' | 'Waiting' | 'Ready'

const dominterface = $('interface') as HTMLDivElement,
	isExtension = detectPlatform() !== 'online',
	functionsLoad: { [key: string]: FunctionsLoadState } = {
		clock: 'Waiting',
		links: 'Waiting',
		fonts: 'Off',
		quotes: 'Off',
	}

let lazyClockInterval = setTimeout(() => {}, 0),
	localIsLoading = false,
	loadtimeStart = performance.now(),
	sunset = 0,
	sunrise = 0

window.onload = function () {
	onlineAndMobileHandler()

	try {
		chrome.storage.sync.get(null, (data) => {
			const VersionChange = data?.about?.version !== syncDefaults.about.version
			const isImport = sessionStorage.isImport === 'true'
			const firstStart = Object.keys(data).length === 0

			if (firstStart) {
				data = syncDefaults
				chrome.storage.local.set(localDefaults)
				chrome.storage.sync.set(isExtension ? data : { import: data })
			}
			//
			else if (isImport) {
				sessionStorage.removeItem('isImport')

				data = filterImports(data)
				data.about = { browser: detectPlatform(), version: syncDefaults.about.version }

				chrome.storage.sync.clear()
				chrome.storage.sync.set(isExtension ? data : { import: data })
			}
			//
			else if (VersionChange) {
				// Is at least 1.14.0, no filtering to do, just update version
				chrome.storage.sync.set({
					quicklinks: true,
					about: { browser: detectPlatform(), version: syncDefaults.about.version },
				})
			}

			startup(data as Sync) // TODO: rip type checking
		})
	} catch (e) {
		errorMessage('Could not load chrome storage on startup', e)
	}
}
