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

const domcontainer = document.getElementById('sb_container') as HTMLDivElement | undefined
const domsearchbar = document.getElementById('searchbar') as HTMLInputElement | undefined
const emptyButton = document.getElementById('sb_empty')

const display = (shown: boolean) => domcontainer?.classList.toggle('hidden', !shown)
const setEngine = (value: string) => domsearchbar?.setAttribute('data-engine', value)
const setRequest = (value: string) => domsearchbar?.setAttribute('data-request', stringMaxSize(value, 512))
const setNewtab = (value: boolean) => domsearchbar?.setAttribute('data-newtab', value.toString())
const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value || '')
const setOpacity = (value = 0.1) => {
	document.documentElement.style.setProperty('--searchbar-background-alpha', value.toString())
	document.getElementById('sb_container')?.classList.toggle('opaque', value > 0.4)
}

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
	searchURL = searchURL.replace('%s', encodeURIComponent(domsearchbar?.value ?? ''))

	// open new page
	window.open(searchURL, isNewtab ? '_blank' : '_self')
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

		domcontainer?.addEventListener('submit', submitSearch)
		domsearchbar?.addEventListener('input', handleInputButtons)
		emptyButton?.addEventListener('click', removeInputText)

		if (on) {
			setTimeout(() => domsearchbar?.focus(), 100)
		}
	} catch (e) {
		errorMessage(e)
	}
}
