import storage from '../storage'
import { Searchbar } from '../types/sync'
import { stringMaxSize, clas, syncDefaults } from '../utils'
import { eventDebounce } from '../utils/debounce'
import errorMessage from '../utils/errorMessage'
import { tradThis } from '../utils/translations'

export default function searchbar(init: Searchbar | null, update?: any, that?: HTMLInputElement) {
	const domcontainer = document.getElementById('sb_container')
	const domsearchbar = document.getElementById('searchbar')
	const emptyButton = document.getElementById('sb_empty')
	const submitButton = document.getElementById('sb_submit')
	const searchbarButtons = document.getElementById('sb-buttons')

	const display = (shown: boolean) => domcontainer?.classList.toggle('hidden', !shown)
	const setEngine = (value: string) => domsearchbar?.setAttribute('data-engine', value)
	const setRequest = (value: string) => domsearchbar?.setAttribute('data-request', stringMaxSize(value, 512))
	const setNewtab = (value: boolean) => domsearchbar?.setAttribute('data-newtab', value.toString())
	const setPlaceholder = (value = '') => domsearchbar?.setAttribute('placeholder', value || '')
	const setOpacity = (value = 0.1) => {
		document.documentElement.style.setProperty('--searchbar-background-alpha', value.toString())
		document.getElementById('sb_container')?.classList.toggle('opaque', value > 0.4)
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
				document.getElementById('searchbar_request')?.classList.toggle('shown', that.value === 'custom')
				searchbar.engine = that.value
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
