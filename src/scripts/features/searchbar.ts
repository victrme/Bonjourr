import { EXTENSION, IS_MOBILE, PLATFORM, SEARCHBAR_ENGINES } from '../defaults.ts'
import { opacityFromHex, stringMaxSize } from '../shared/generic.ts'
import { hexColorFromSplitRange } from '../shared/dom.ts'
import { getLang, tradThis } from '../utils/translations.ts'
import { eventDebounce } from '../utils/debounce.ts'
import { apiWebSocket } from '../shared/api.ts'
import { storage } from '../storage.ts'
import { parse } from '../utils/parse.ts'

import type { SearchEngines } from '../../types/shared.ts'
import type { Searchbar } from '../../types/sync.ts'

type SearchbarUpdate = {
	engine?: string
	newtab?: boolean
	width?: string
	suggestions?: boolean
	placeholder?: string
	request?: HTMLInputElement
	background?: true
}

type Suggestions = {
	text: string
	desc?: string
	image?: string
}[]

type UndefinedElement = Element | undefined | null

let socket: WebSocket | undefined
const domainPattern = /^(?!.*\s)(?:https?:\/\/)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z0-9-]{2,})/i

const domsuggestions = document.getElementById('sb-suggestions') as HTMLUListElement | undefined
const domcontainer = document.getElementById('sb_container') as HTMLDivElement | undefined
const domsearchbar = document.getElementById('searchbar') as HTMLInputElement | undefined
const dombuttons = document.getElementById('sb-buttons') as HTMLDivElement | undefined
const emptyButton = document.getElementById('sb_empty')

const display = (shown = false) => domcontainer?.classList.toggle('hidden', !shown)
const setEngine = (value = 'google') => domcontainer?.setAttribute('data-engine', value)
const setRequest = (value = '') => domcontainer?.setAttribute('data-request', stringMaxSize(value, 512))
const setNewtab = (value = false) => domcontainer?.setAttribute('data-newtab', value.toString())
const setSuggestions = (value = true) => domcontainer?.setAttribute('data-suggestions', value.toString())
const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value)
const setWidth = (value = 30) =>
	document.documentElement.style.setProperty('--searchbar-width', `${value.toString()}em`)
const setBackground = (value = '#fff2') => {
	document.documentElement.style.setProperty('--searchbar-background', value)
	document
		.getElementById('sb_container')
		?.classList.toggle('opaque', value.includes('#fff') && opacityFromHex(value) > 7)
}

export function searchbar(init?: Searchbar, update?: SearchbarUpdate) {
	if (update) {
		updateSearchbar(update)
		return
	}

	try {
		display(init?.on)
		setWidth(init?.width)
		setEngine(init?.engine)
		setRequest(init?.request)
		setNewtab(init?.newtab)
		setPlaceholder(init?.placeholder)
		setSuggestions(init?.suggestions)
		setBackground(init?.background)

		dombuttons?.addEventListener('click', focusSearchbar)
		emptyButton?.addEventListener('click', removeInputText)
		domcontainer?.addEventListener('submit', submitSearch)
		domsearchbar?.addEventListener('input', handleUserInput)
		document.addEventListener('keydown', searchbarShortcut)
	} catch (_) {
		//...
	}
}

async function updateSearchbar({
	engine,
	newtab,
	background,
	placeholder,
	request,
	suggestions,
	width,
}: SearchbarUpdate) {
	const { searchbar } = await storage.sync.get('searchbar')

	if (!searchbar) {
		return
	}

	if (isValidEngine(engine)) {
		document.getElementById('searchbar_request')?.classList.toggle('shown', engine === 'custom')
		searchbar.engine = engine
		setEngine(engine)
	}

	if (suggestions !== undefined) {
		searchbar.suggestions = suggestions
		setSuggestions(suggestions)
	}

	if (newtab !== undefined) {
		searchbar.newtab = newtab
		setNewtab(newtab)
	}

	if (width !== undefined) {
		searchbar.width = Number.parseInt(width)
		setWidth(searchbar.width)
	}

	if (placeholder !== undefined) {
		searchbar.placeholder = placeholder
		setPlaceholder(placeholder)
	}

	if (background) {
		searchbar.background = hexColorFromSplitRange('sb-background-range')
		setBackground(searchbar.background)
	}

	if (request) {
		if (!request.value.includes('%s')) {
			return
		}

		searchbar.request = stringMaxSize(request.value, 512)
		setRequest(searchbar.request)
		request.blur()
	}

	eventDebounce({ searchbar })
}

//
//	Search Submission
//

function isValidUrl(string: string): boolean {
	try {
		const basicURL = !!new URL(string)
		const regexMatch = domainPattern.test(string)
		return basicURL && regexMatch
	} catch (_) {
		return false
	}
}

function createSearchUrl(val: string, engine: string): string {
	const urLs: Record<SearchEngines, string> = {
		default: '',
		google: 'https://www.google.com/search?udm=14&q=%s',
		ddg: 'https://duckduckgo.com/?q=%s',
		startpage: 'https://www.startpage.com/do/search?query=%s',
		qwant: 'https://www.qwant.com/?q=%s',
		yahoo: 'https://search.yahoo.com/search?q=%s',
		bing: 'https://www.bing.com/search?q=%s',
		brave: 'https://search.brave.com/search?q=%s',
		ecosia: 'https://www.ecosia.org/search?q=%s',
		lilo: 'https://search.lilo.org/?q=%s',
		baidu: 'https://www.baidu.com/s?wd=%s',
		custom: domcontainer?.dataset.request || '',
	}

	let searchUrl = ''

	if (isValidEngine(engine)) {
		const trad = tradThis(engine)
		searchUrl = trad.includes('%s') ? trad : urLs[engine]
	}

	return searchUrl.replace('%s', encodeURIComponent(val ?? ''))
}

function submitSearch(e: Event) {
	e.preventDefault()

	const canUseDefault = !IS_MOBILE && (PLATFORM === 'chrome' || PLATFORM === 'firefox')
	const newtab = domcontainer?.dataset.newtab === 'true'
	const val = domsearchbar?.value
	let engine = domcontainer?.dataset.engine ?? 'default'

	if (!val) {
		return
	}

	if (socket) {
		socket.close()
	}

	if (canUseDefault && engine === 'default') {
		;(EXTENSION as typeof chrome)?.search.query({
			disposition: newtab ? 'NEW_TAB' : 'CURRENT_TAB',
			text: val,
		})
		return
	}

	engine = engine.replace('default', 'google')

	const hasProtocol = val.startsWith('http://') || val.startsWith('https://')
	const domainUrl = hasProtocol ? val : `https://${val}`
	const searchUrl = createSearchUrl(val, engine)
	const url = isValidUrl(domainUrl) ? domainUrl : searchUrl
	const target = newtab ? '_blank' : '_self'

	globalThis.open(url, target)
	return
}

//
//	Suggestions
//

function initSuggestions() {
	function selectShownResult(next: UndefinedElement): UndefinedElement {
		return next?.classList.contains('shown') ? next : null
	}

	function applyResultContentToInput(elem: UndefinedElement) {
		if (!(elem && domsearchbar)) {
			return
		}

		domsearchbar.value = elem?.querySelector('.suggest-result')?.textContent ?? ''
	}

	for (let ii = 0; ii < 10; ii++) {
		const li = document.createElement('li')
		const image = document.createElement('img')
		const wrapper = document.createElement('div')
		const result = document.createElement('p')
		const description = document.createElement('p')

		li.setAttribute('tabindex', '0')
		image.setAttribute('draggable', 'false')
		image.setAttribute('width', '16')
		image.setAttribute('height', '16')

		result.classList.add('suggest-result')
		description.classList.add('suggest-desc')

		wrapper.appendChild(result)
		wrapper.appendChild(description)
		li.appendChild(image)
		li.appendChild(wrapper)

		li.addEventListener('mouseenter', () => {
			domcontainer?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')
			li?.setAttribute('aria-selected', 'true')
		})

		li.addEventListener('mouseleave', () => {
			li?.removeAttribute('aria-selected')
		})

		li.addEventListener('click', (e) => {
			applyResultContentToInput(li)
			submitSearch(e)
		})

		domsuggestions?.appendChild(li)
	}

	function toggleSuggestions(e: FocusEvent) {
		const relatedTarget = e?.relatedTarget as Element
		const targetIsResult = relatedTarget?.parentElement?.id === 'sb-suggestions'
		const hasResults = document.querySelectorAll('#sb-suggestions li.shown')?.length > 0
		const isFocus = e.type === 'focus'

		if (!targetIsResult) {
			domsuggestions?.classList.toggle('shown', isFocus && hasResults)
		}
	}

	function navigateSuggestions(e: KeyboardEvent) {
		const isArrowDown = e.code === 'ArrowDown'
		const isArrowUp = e.code === 'ArrowUp'
		const isEnter = e.code === 'Enter'
		const isEscape = e.code === 'Escape'
		let lastSelected = domsuggestions?.querySelector('li[aria-selected="true"]')

		lastSelected?.removeAttribute('aria-selected')

		if (isEscape) {
			return
		}

		if (isArrowDown) {
			lastSelected = selectShownResult(lastSelected?.nextElementSibling) ??
				domsuggestions?.querySelector('li.shown')
			applyResultContentToInput(lastSelected)
		}

		if (isArrowUp) {
			lastSelected = selectShownResult(lastSelected?.previousElementSibling)
			applyResultContentToInput(lastSelected)
			e.preventDefault()
		}

		if (isEnter && lastSelected) {
			applyResultContentToInput(lastSelected)
			submitSearch(e)
		}

		lastSelected?.setAttribute('aria-selected', 'true')
	}

	function hideResultsAndSuggestions() {
		const children = Object.values(domsuggestions?.children ?? [])
		for (const child of children) {
			child.classList.remove('shown')
		}
		domsuggestions?.classList.remove('shown')
	}

	async function createSuggestionSocket() {
		socket = await apiWebSocket('suggestions')

		socket?.addEventListener('message', (event: MessageEvent) => {
			const data = parse<Suggestions | { error: string }>(event.data)

			if (Array.isArray(data)) {
				suggestions(data as Suggestions)
			} else if (data?.error) {
				createSuggestionSocket()
			}
		})
	}

	domcontainer?.addEventListener('keydown', navigateSuggestions)
	domsearchbar?.addEventListener('focus', toggleSuggestions)
	domsearchbar?.addEventListener('blur', toggleSuggestions)
	emptyButton?.addEventListener('click', hideResultsAndSuggestions)

	createSuggestionSocket()
}

function suggestions(results: Suggestions) {
	const input = domsearchbar as HTMLInputElement
	const liList = domsuggestions?.querySelectorAll('li') ?? []

	domsuggestions?.classList.toggle('shown', results.length > 0)
	domsuggestions?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')

	liList.forEach((li, i) => {
		const result = results[i]
		const resultdom = li.querySelector('.suggest-result')
		const descdom = li.querySelector('.suggest-desc')

		if (!(result && resultdom && descdom)) {
			return
		}

		const searchIcon = 'src/assets/interface/magnifying-glass.svg'
		const image = result.image ?? searchIcon
		const desc = result.desc ?? ''

		if (resultdom) {
			resultdom.textContent = result.text
		}

		if (result.text.includes(input.value)) {
			const queryIndex = result.text.indexOf(input.value)
			const startdom = document.createElement('span')
			const querydom = document.createElement('b')
			const enddom = document.createElement('span')

			startdom.textContent = result.text.slice(0, queryIndex)
			querydom.textContent = result.text.slice(queryIndex, input.value.length)
			enddom.textContent = result.text.slice(input.value.length)

			resultdom.textContent = ''
			resultdom.appendChild(startdom)
			resultdom.appendChild(querydom)
			resultdom.appendChild(enddom)
		}

		const imgdom = li.querySelector('img') as HTMLImageElement
		imgdom.classList.toggle('default-search-icon', image === searchIcon)
		imgdom.src = image

		descdom.textContent = desc
		li.classList.toggle('shown', !!result)

		// This cuts results short if it overflows the interface
		const rect = li.getBoundingClientRect()
		const yLimit = rect.y + rect.height + 40 // 40 is arbitrary padding in px
		const isOverflowing = yLimit > document.body.offsetHeight

		if (isOverflowing) {
			li.classList.remove('shown')
		}
	})

	if (domsuggestions?.querySelectorAll('li.shown')?.length === 0) {
		domsuggestions?.classList.remove('shown')
	}
}

//
//	Searchbar Events
//

function handleUserInput(e: Event) {
	const value = ((e as InputEvent).target as HTMLInputElement).value ?? ''
	const hasProtocol = value.startsWith('http://') || value.startsWith('https://')
	const withProtocol = hasProtocol ? value : `https://${value}`
	const startsTypingProtocol = 'https://'.startsWith(value) || 'http://'.startsWith(value)

	// Button display toggle
	if (domsearchbar) {
		toggleInputButton(value.length > 0)
	}

	if (value === '') {
		for (const li of document.querySelectorAll('#sb-suggestions li.shown') ?? []) {
			li.classList.remove('shown')
		}
		domsuggestions?.classList.remove('shown')
		return
	}

	if (startsTypingProtocol || isValidUrl(withProtocol)) {
		domsuggestions?.classList.remove('shown')
		return
	}

	if (domcontainer?.dataset.suggestions === 'true' && domsuggestions?.childElementCount === 0) {
		initSuggestions()
	}

	// request suggestions
	if (domcontainer?.dataset.suggestions === 'true' && socket && socket.readyState === socket.OPEN) {
		const engine = (domcontainer?.dataset.engine ?? 'ddg').replace('custom', 'ddg').replace('default', 'google')
		const query = encodeURIComponent(value ?? '')
		socket.send(JSON.stringify({ q: query, with: engine, lang: getLang() }))
	}
}

function toggleInputButton(enabled: boolean) {
	document.getElementById('sb-buttons')?.classList.toggle('shown', enabled)
	document.getElementById('sb_empty')?.toggleAttribute('disabled', !enabled)
	document.getElementById('sb_submit')?.toggleAttribute('disabled', !enabled)
}

function removeInputText() {
	if (domsearchbar) {
		domsearchbar.focus()
		domsearchbar.value = ''
		toggleInputButton(false)
	}
}

function focusSearchbar() {
	if (dombuttons?.classList.contains('shown') === false) {
		domsearchbar?.focus()
	}
}

function searchbarShortcut(event: KeyboardEvent) {
	const target = event.target as Element
	const fromBody = target.tagName === 'BODY'

	if (fromBody && event.key === '/') {
		domsearchbar?.focus()
		domsearchbar?.select()
		event.preventDefault()
	}
}

function isValidEngine(str = ''): str is SearchEngines {
	return SEARCHBAR_ENGINES.includes(str as SearchEngines)
}
