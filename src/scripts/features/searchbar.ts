import storage from '../storage'
import { Searchbar } from '../types/sync'
import { stringMaxSize, syncDefaults } from '../utils'
import { eventDebounce } from '../utils/debounce'
import errorMessage from '../utils/errorMessage'
import { tradThis } from '../utils/translations'

type SearchbarUpdate = {
	engine?: string
	opacity?: string
	newtab?: boolean
	placeholder?: string
	request?: HTMLInputElement
}

type Suggestions = {
	text: string
	desc?: string
	image?: string
}[]

const domsuggestions = document.getElementById('sb-suggestions') as HTMLUListElement | undefined
const domcontainer = document.getElementById('sb_container') as HTMLDivElement | undefined
const domsearchbar = document.getElementById('searchbar') as HTMLInputElement | undefined
const emptyButton = document.getElementById('sb_empty')

const display = (shown: boolean) => domcontainer?.classList.toggle('hidden', !shown)
const setEngine = (value: string) => domcontainer?.setAttribute('data-engine', value)
const setRequest = (value: string) => domcontainer?.setAttribute('data-request', stringMaxSize(value, 512))
const setNewtab = (value: boolean) => domcontainer?.setAttribute('data-newtab', value.toString())
const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value || '')
const setOpacity = (value = 0.1) => {
	document.documentElement.style.setProperty('--searchbar-background-alpha', value.toString())
	document.getElementById('sb_container')?.classList.toggle('opaque', value > 0.4)
}

function submitSearch(e: Event) {
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
	const isNewtab = domcontainer?.dataset.newtab === 'true'
	const engine = domcontainer?.dataset.engine || 'google'
	const request = domcontainer?.dataset.request || ''

	searchURL = tradThis(engine)

	if (!searchURL.includes('%s') && engine in URLs) {
		searchURL = URLs[engine as keyof typeof URLs]
	}

	if (engine === 'custom') {
		searchURL = request
	}

	// add search query to url
	searchURL = searchURL.replace('%s', encodeURIComponent(domsearchbar?.value ?? ''))

	// open new page
	window.open(searchURL, isNewtab ? '_blank' : '_self')
}

function suggestionItemDOM() {
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

	li.addEventListener('mouseenter', (e) => {
		domcontainer?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')
		;(e.target as HTMLElement).setAttribute('aria-selected', 'true')
	})

	li.addEventListener('mouseleave', (e) => {
		;(e.target as HTMLElement).removeAttribute('aria-selected')
	})

	li.addEventListener('click', (e) => {
		if (domsearchbar) {
			const value = li.querySelector('.suggest-result')?.textContent ?? ''
			domsearchbar.value = value
			submitSearch(e)
		}
	})

	return li
}

function initSuggestions() {
	const ul = document.querySelector<HTMLUListElement>('#sb-suggestions')

	if (ul?.childElementCount === 0) {
		for (let ii = 0; ii < 10; ii++) {
			ul?.appendChild(suggestionItemDOM())
		}
	}

	domcontainer?.addEventListener('keydown', (e) => {
		const isArrowDown = e.code === 'ArrowDown'
		const isArrowUp = e.code === 'ArrowUp'
		const isEnter = e.code === 'Enter'
		const isEscape = e.code === 'Escape'
		let lastSelected = ul?.querySelector('li[aria-selected="true"]')

		lastSelected?.removeAttribute('aria-selected')

		if (isEscape) {
			return
		}

		if (isArrowDown && domsearchbar) {
			lastSelected = lastSelected?.nextElementSibling ?? ul?.querySelector('li')

			if (lastSelected) {
				const value = lastSelected?.querySelector('.suggest-result')?.textContent ?? ''
				domsearchbar.value = value
			}
		}

		if (isArrowUp && domsearchbar) {
			lastSelected = lastSelected?.previousElementSibling
			e.preventDefault()

			if (lastSelected) {
				const value = lastSelected?.querySelector('.suggest-result')?.textContent ?? ''
				domsearchbar.value = value
			}
		}

		if (isEnter && domsearchbar && lastSelected) {
			const value = lastSelected?.querySelector('.suggest-result')?.textContent ?? ''
			domsearchbar.value = value
			submitSearch(e)
		}

		lastSelected?.setAttribute('aria-selected', 'true')
	})
}

async function handleSuggestions(e: Event) {
	const event = e as InputEvent // why typescript, why
	const input = event.target as HTMLInputElement

	// INIT
	if (domsuggestions?.childElementCount === 0) {
		initSuggestions()
	}

	// API
	const providerList = ['google', 'bing', 'duckduckgo', 'yahoo', 'qwant']
	let engine = (domcontainer?.dataset.engine ?? '').replace('ddg', 'duckduckgo')

	if (providerList.includes(engine) === false) {
		engine = 'duckduckgo'
	}

	const query = encodeURIComponent(input.value ?? '')
	const url = `${atob('@@SUGGESTIONS_API')}?q=${query}&with=${engine}`
	let results: Suggestions

	try {
		results = (await (await fetch(url)).json()) as Suggestions
	} catch (_) {
		console.warn('Cannot get search suggestions')
		results = []
	}

	// ADD TO DOM
	const liList = domsuggestions?.querySelectorAll('li') ?? []

	domsuggestions?.classList.toggle('shown', results?.length > 0)
	domsuggestions?.querySelector('li[aria-selected="true"]')?.removeAttribute('aria-selected')

	liList.forEach((li, i) => {
		const result = results[i]

		if (result) {
			const image = result.image ?? 'src/assets/interface/magnifying-glass.svg'
			const desc = result.desc ?? ''
			const text = result.text
			li.querySelector('img')!.src = image
			li.querySelector('.suggest-result')!.textContent = text
			li.querySelector('.suggest-desc')!.textContent = desc
		}

		li.classList.toggle('shown', !!result)
	})
}

function toggleInputButton(enabled: boolean) {
	document.getElementById('sb-buttons')?.classList.toggle('shown', enabled)
	document.getElementById('sb_empty')?.toggleAttribute('disabled', !enabled)
	document.getElementById('sb_submit')?.toggleAttribute('disabled', !enabled)
}

function handleInputButtons() {
	if (domsearchbar) {
		toggleInputButton(domsearchbar.value.length > 0)
	}
}

function removeInputText() {
	if (domsearchbar) {
		domsuggestions?.classList.remove('shown')
		domsearchbar.focus()
		domsearchbar.value = ''
		toggleInputButton(false)
	}
}

async function updateSearchbar({ engine, newtab, opacity, placeholder, request }: SearchbarUpdate) {
	const { searchbar } = await storage.get('searchbar')

	if (!searchbar) {
		return
	}

	if (engine) {
		document.getElementById('searchbar_request')?.classList.toggle('shown', engine === 'custom')
		searchbar.engine = engine
		setEngine(engine)
	}

	if (newtab !== undefined) {
		searchbar.newtab = newtab
		setNewtab(newtab)
	}

	if (opacity !== undefined) {
		searchbar.opacity = parseFloat(opacity)
		setOpacity(parseFloat(opacity))
	}

	if (placeholder !== undefined) {
		searchbar.placeholder = placeholder
		setPlaceholder(placeholder)
	}

	if (request) {
		let val = request.value

		if (val.indexOf('%s') !== -1) {
			searchbar.request = stringMaxSize(val, 512)
			request.blur()
		} else if (val.length > 0) {
			val = ''
			request.setAttribute('placeholder', tradThis('%s Not found'))
			setTimeout(() => request.setAttribute('placeholder', tradThis('Search query: %s')), 2000)
		}

		setRequest(val)
	}

	eventDebounce({ searchbar })
}

export default function searchbar(init: Searchbar | null, update?: SearchbarUpdate) {
	//
	// Updates

	if (update) {
		updateSearchbar(update)
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

		emptyButton?.addEventListener('click', removeInputText)
		domcontainer?.addEventListener('submit', submitSearch)
		domsearchbar?.addEventListener('input', handleSuggestions)
		domsearchbar?.addEventListener('input', handleInputButtons)

		if (on) {
			setTimeout(() => domsearchbar?.focus(), 100)
		}
	} catch (e) {
		errorMessage(e)
	}
}
