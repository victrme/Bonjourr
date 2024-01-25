import clock from './features/clock'
import notes from './features/notes'
import quotes from './features/quotes'
import weather from './features/weather'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import hideElements from './features/hide'
import moveElements from './features/move'
import interfacePopup from './features/popup'
import localBackgrounds from './features/backgrounds/local'
import unsplashBackgrounds from './features/backgrounds/unsplash'
import storage, { getSyncDefaults } from './storage'
import linksImport, { syncNewBookmarks } from './features/links/bookmarks'
import { backgroundFilter, updateBackgroundOption } from './features/backgrounds'
import { customCss, darkmode, favicon, tabTitle, textShadow, pageControl } from './index'

import langList from './langs'
import parse from './utils/parse'
import debounce from './utils/debounce'
import filterImports from './utils/filterimports'
import orderedStringify from './utils/orderedstringify'
import { traduction, tradThis, toggleTraduction } from './utils/translations'
import { inputThrottle, stringMaxSize, turnRefreshButton } from './utils'
import { SYSTEM_OS, IS_MOBILE, PLATFORM, BROWSER, SYNC_DEFAULT, LOCAL_DEFAULT } from './defaults'

import type { Langs } from '../types/langs'

export async function settingsInit() {
	const data = await storage.sync.get()
	const innerHtml = await (await fetch('settings.html')).text()
	const outerHtml = `<aside id="settings" class="init">${innerHtml}</aside>`

	const parser = new DOMParser()
	const doc = parser.parseFromString(outerHtml, 'text/html')
	const settingsDom = doc.getElementById('settings') as HTMLElement

	document.body.appendChild(settingsDom)

	traduction(settingsDom, data.lang)
	settingsFooter()
	showall(data.showall, false)
	initOptionsValues(data)
	initOptionsEvents()
	initSettingsEvents()
	settingsDrawerBar()
	updateExportJSON()
	controlOptionsTabFocus(settingsDom)

	setTimeout(() => document.dispatchEvent(new Event('settings')))
}

function initOptionsValues(data: Sync.Storage) {
	const domsettings = document.getElementById('settings') as HTMLElement
	const userQuotes = !data.quotes?.userlist?.[0] ? undefined : data.quotes?.userlist

	setInput('i_blur', data.background_blur ?? 15)
	setInput('i_bright', data.background_bright ?? 0.8)
	setInput('cssEditor', data.css || '')
	setInput('i_row', data.linksrow || 8)
	setInput('i_linkstyle', data.linkstyle || 'default')
	setInput('i_type', data.background_type || 'unsplash')
	setInput('i_freq', data.unsplash?.every)
	setInput('i_dark', data.dark || 'system')
	setInput('i_favicon', data.favicon ?? '')
	setInput('i_tabtitle', data.tabtitle ?? '')
	setInput('i_pagewidth', data.pagewidth || 1600)
	setInput('i_pagegap', data.pagegap ?? 1)
	setInput('i_dateformat', data.dateformat || 'eu')
	setInput('i_greeting', data.greeting ?? '')
	setInput('i_textshadow', data.textShadow ?? 0.2)
	setInput('i_noteswidth', data.notes?.width || 50)
	setInput('i_notesopacity', data.notes?.opacity.toString() || 0.1)
	setInput('i_notesalign', data.notes?.align || 'left')
	setInput('i_sbengine', data.searchbar?.engine || 'google')
	setInput('i_sbplaceholder', data.searchbar?.placeholder || '')
	setInput('i_sbopacity', data.searchbar?.opacity ?? 0.1)
	setInput('i_sbrequest', data.searchbar?.request || '')
	setInput('i_qtfreq', data.quotes?.frequency || 'day')
	setInput('i_qttype', data.quotes?.type || 'classic')
	setInput('i_qtlist', userQuotes ?? '')
	setInput('i_clockface', data.clock?.face || 'none')
	setInput('i_clockstyle', data.clock?.style || 'round')
	setInput('i_clocksize', data.clock?.size ?? 5)
	setInput('i_timezone', data.clock?.timezone || 'auto')
	setInput('i_collection', data.unsplash?.collection ?? '')
	setInput('i_geol', data.weather?.geolocation || 'approximate')
	setInput('i_ccode', data.weather?.ccode || 'US')
	setInput('i_units', data.weather?.unit ?? 'metric')
	setInput('i_forecast', data.weather?.forecast || 'auto')
	setInput('i_temp', data.weather?.temperature || 'actual')
	setInput('i_moreinfo', data.weather?.moreinfo || 'none')
	setInput('i_provider', data.weather?.provider ?? '')
	setInput('i_weight', data.font?.weight || '300')
	setInput('i_size', data.font?.size || (IS_MOBILE ? 11 : 14))

	setCheckbox('i_showall', data.showall)
	setCheckbox('i_settingshide', data.hide?.settingsicon ?? false)
	setCheckbox('i_quicklinks', data.quicklinks)
	setCheckbox('i_syncbookmarks', !!data.syncbookmarks)
	setCheckbox('i_linktabs', data.linktabs.active)
	setCheckbox('i_linknewtab', data.linknewtab)
	setCheckbox('i_time', data.time)
	setCheckbox('i_main', data.main)
	setCheckbox('i_greethide', data.hide?.greetings === true)
	setCheckbox('i_notes', data.notes?.on ?? false)
	setCheckbox('i_sb', data.searchbar?.on ?? false)
	setCheckbox('i_quotes', data.quotes?.on ?? false)
	setCheckbox('i_ampm', data.clock?.ampm ?? false)
	setCheckbox('i_sbsuggestions', data.searchbar?.suggestions ?? true)
	setCheckbox('i_sbnewtab', data.searchbar?.newtab ?? false)
	setCheckbox('i_qtauthor', data.quotes?.author ?? false)
	setCheckbox('i_seconds', data.clock?.seconds ?? false)
	setCheckbox('i_analog', data.clock?.analog ?? false)

	// Input translation
	translatePlaceholders()

	// Change edit tips on mobile
	if (IS_MOBILE) {
		domsettings.querySelector('.tooltiptext .instructions')!.textContent = tradThis(
			`Edit your Quick Links by long-pressing the icon.`
		)
	}

	// inserts languages in select
	const i_lang = paramId('i_lang')
	Object.entries(langList).forEach(([code, title]) => {
		let option = document.createElement('option')
		option.value = code
		option.text = title
		i_lang.appendChild(option)
	})

	// must be init after children appening
	setInput('i_lang', data.lang || 'en')

	// Activate changelog
	if (localStorage.hasUpdated === 'true') {
		changelogControl(domsettings)
	}

	// No bookmarks import on safari || online
	if (BROWSER === 'safari' || PLATFORM === 'online') {
		paramId('b_importbookmarks').setAttribute('style', 'display: none')
	}

	// Favicon doesn't work on Safari
	if (BROWSER === 'safari') {
		paramId('i_favicon').setAttribute('style', 'display: none')
	}

	// Export as file doesn't work on Safari extension
	if (PLATFORM === 'safari') {
		paramId('save_wrapper').setAttribute('style', 'display: none')
	}

	// Activate feature options
	paramId('time_options')?.classList.toggle('shown', data.time)
	paramId('analog_options')?.classList.toggle('shown', data.clock.analog && data.showall)
	paramId('digital_options')?.classList.toggle('shown', !data.clock.analog)
	paramId('main_options')?.classList.toggle('shown', data.main)
	paramId('weather_provider')?.classList.toggle('shown', data.weather?.moreinfo === 'custom')
	paramId('quicklinks_options')?.classList.toggle('shown', data.quicklinks)
	paramId('notes_options')?.classList.toggle('shown', data.notes?.on || false)
	paramId('searchbar_options')?.classList.toggle('shown', data.searchbar?.on)
	paramId('searchbar_request')?.classList.toggle('shown', data.searchbar?.engine === 'custom')
	paramId('quotes_options')?.classList.toggle('shown', data.quotes?.on)

	// Page layout
	domsettings.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((b) => {
		const selectedLayout = b.dataset.layout === (data.move?.selection || 'single')
		b?.classList.toggle('selected', selectedLayout)
	})

	// Disables layout change on mobile
	if (window.innerWidth < 600 && 'ontouchstart' in window) {
		for (const button of domsettings.querySelectorAll('#grid-layout button')) {
			button?.setAttribute('disabled', '')
		}
	}

	// Time & main hide elems
	;(function initHideInputs() {
		const { clock, date, weatherdesc, weathericon } = data.hide || {}
		let time = !clock && !date ? 'all' : clock ? 'clock' : 'date'
		let weather = weatherdesc && weathericon ? 'disabled' : weatherdesc ? 'desc' : weathericon ? 'icon' : 'all'
		setInput('i_timehide', time)
		setInput('i_weatherhide', weather)
	})()

	// Backgrounds options init
	paramId('local_options')?.classList.toggle('shown', data.background_type === 'local')
	paramId('unsplash_options')?.classList.toggle('shown', data.background_type === 'unsplash')

	// Unsplash collection placeholder
	if (data?.unsplash?.collection) {
		const coll = data?.unsplash?.collection
		paramId('i_collection')?.setAttribute('placeholder', coll ? coll : '2nVzlQADDIE')
	}

	// CSS height control
	if (data.cssHeight) {
		paramId('cssEditor').setAttribute('style', 'height: ' + data.cssHeight + 'px')
	}

	// Quotes option display
	paramId('quotes_options')?.classList.toggle('shown', data.quotes?.on)
	paramId('quotes_userlist')?.classList.toggle('shown', data.quotes?.type === 'user')
}

function initOptionsEvents() {
	//
	// General

	paramId('i_showall').addEventListener('change', function () {
		showall(this.checked, true)
	})

	paramId('i_lang').addEventListener('change', function () {
		switchLangs(this.value as Langs)
	})

	paramId('i_favicon').addEventListener('input', function (this: HTMLInputElement) {
		favicon(this.value, true)
	})

	paramId('i_favicon').addEventListener('change', function () {
		paramId('i_favicon').blur()
	})

	paramId('i_tabtitle').addEventListener('input', function () {
		tabTitle(this.value, true)
	})

	paramId('i_tabtitle').addEventListener('change', function () {
		paramId('i_tabtitle').blur()
	})

	paramId('i_dark').addEventListener('change', function () {
		darkmode(this.value as 'auto' | 'system' | 'enable' | 'disable', true)
	})

	paramId('i_settingshide').addEventListener('change', function () {
		hideElements({ settingsicon: this.checked }, { isEvent: true })
	})

	//
	// Quick links

	paramId('i_quicklinks').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['quicklinks', this.checked] })
	})

	paramId('i_addlink-url').addEventListener('input', function (this) {
		paramId('addlink-inputs').classList.toggle('valid', paramId('addlink-inputs')?.checkValidity())
	})

	paramId('addlink-inputs').addEventListener('submit', function (this, event) {
		paramId('addlink-inputs').classList.remove('valid')
		quickLinks(undefined, { addLink: true })
		event.preventDefault()
	})

	paramId('i_syncbookmarks').addEventListener('change', function (this) {
		syncNewBookmarks(undefined, this.checked)
	})

	paramId('i_linktabs').addEventListener('change', function (this) {
		quickLinks(undefined, { tab: this.checked })
	})

	paramId('i_linknewtab').addEventListener('change', function (this) {
		quickLinks(undefined, { newtab: this.checked })
	})

	paramId('i_linkstyle').addEventListener('change', function (this) {
		quickLinks(undefined, { style: this.value })
	})

	paramId('i_row').addEventListener('input', function (this) {
		quickLinks(undefined, { row: this.value })
	})

	paramId('b_importbookmarks').addEventListener('click', linksImport)

	//
	// Backgrounds

	paramId('i_type').addEventListener('change', function (this: HTMLInputElement) {
		selectBackgroundType(this.value)
	})

	paramId('i_freq').addEventListener('change', function (this: HTMLInputElement) {
		updateBackgroundOption({ freq: this.value })
	})

	paramId('i_refresh').addEventListener('click', function (this: HTMLInputElement) {
		updateBackgroundOption({ refresh: this.children[0] as HTMLSpanElement })
	})

	paramId('i_collection').addEventListener('change', function (this: HTMLInputElement) {
		unsplashBackgrounds(undefined, { collection: stringMaxSize(this.value, 256) })
	})

	//
	// Custom backgrounds

	paramId('i_bgfile').addEventListener('change', function (this: HTMLInputElement) {
		localBackgrounds({ newfile: this.files })
	})

	paramId('b_thumbnail-more').addEventListener('click', function (this: HTMLInputElement) {
		localBackgrounds({ showing: 'more' })
	})

	paramId('b_thumbnail-all').addEventListener('click', function (this: HTMLInputElement) {
		localBackgrounds({ showing: 'all' })
	})

	paramId('i_blur').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter({ blur: parseFloat(this.value), isEvent: true })
	})

	paramId('i_bright').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter({ brightness: parseFloat(this.value), isEvent: true })
	})

	//
	// Time and date

	paramId('i_time').addEventListener('change', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['time', this.checked] })
	})

	paramId('i_analog').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { analog: this.checked })
	})

	paramId('i_seconds').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { seconds: this.checked })
	})

	paramId('i_clockface').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { face: this.value })
	})

	paramId('i_clockstyle').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { style: this.value })
	})

	paramId('i_clocksize').addEventListener('input', function (this: HTMLInputElement) {
		clock(undefined, { size: parseFloat(this.value) })
	})

	paramId('i_ampm').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { ampm: this.checked })
	})

	paramId('i_timezone').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { timezone: this.value })
	})

	paramId('i_dateformat').addEventListener('change', function (this) {
		clock(undefined, { dateformat: this.value })
	})

	paramId('i_timehide').addEventListener('change', function (this: HTMLInputElement) {
		hideElements({ clock: this.value === 'clock', date: this.value === 'date' }, { isEvent: true })
	})

	//
	// Weather

	paramId('i_main').addEventListener('change', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['main', this.checked] })
	})

	paramId('i_city').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { city: this.value })
	})

	paramId('i_geol').addEventListener('change', function (this: HTMLInputElement) {
		inputThrottle(this, 1200)
		weather(undefined, { geol: this.value })
	})

	paramId('i_units').addEventListener('change', function (this: HTMLInputElement) {
		inputThrottle(this, 1200)
		weather(undefined, { units: this.value })
	})

	paramId('i_forecast').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { forecast: this.value })
	})

	paramId('i_temp').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { temp: this.value })
	})

	paramId('i_moreinfo').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { moreinfo: this.value })
	})

	paramId('i_provider').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { provider: this.value })
		this.blur()
	})

	paramId('i_weatherhide').addEventListener('change', function (this: HTMLInputElement) {
		let weatherdesc = this.value === 'disabled' || this.value === 'desc'
		let weathericon = this.value === 'disabled' || this.value === 'icon'
		hideElements({ weatherdesc, weathericon }, { isEvent: true })
		weather(undefined, { unhide: true })
	})

	paramId('i_greethide').addEventListener('change', function () {
		hideElements({ greetings: !this.checked }, { isEvent: true })
	})

	paramId('i_greeting').addEventListener('input', function () {
		clock(undefined, { greeting: stringMaxSize(this.value, 32) })
	})

	paramId('i_greeting').addEventListener('change', function () {
		paramId('i_greeting').blur()
	})

	//
	// Notes

	paramId('i_notes').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['notes', this.checked] })
	})

	paramId('i_notesalign').addEventListener('change', function (this: HTMLInputElement) {
		notes(undefined, { is: 'align', value: this.value })
	})

	paramId('i_noteswidth').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { is: 'width', value: this.value })
	})

	paramId('i_notesopacity').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { is: 'opacity', value: this.value })
	})

	//
	// Searchbar

	paramId('i_sb').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['searchbar', this.checked] })
	})

	paramId('i_sbengine').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(undefined, { engine: this.value })
	})

	paramId('i_sbopacity').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(undefined, { opacity: this.value })
	})

	paramId('i_sbrequest').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(undefined, { request: this })
	})

	paramId('i_sbnewtab').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(undefined, { newtab: this.checked })
	})

	paramId('i_sbsuggestions').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(undefined, { suggestions: this.checked })
	})

	paramId('i_sbplaceholder').addEventListener('keyup', function () {
		searchbar(undefined, { placeholder: this.value })
	})

	paramId('i_sbplaceholder').addEventListener('change', function () {
		paramId('i_sbplaceholder').blur()
	})

	//
	// Quotes

	paramId('i_quotes').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['quotes', this.checked] })
	})

	paramId('i_qtfreq').addEventListener('change', function () {
		quotes(undefined, { frequency: this.value })
	})

	paramId('i_qttype').addEventListener('change', function () {
		quotes(undefined, { type: this.value })
	})

	paramId('i_qtrefresh').addEventListener('click', function () {
		inputThrottle(this)
		turnRefreshButton(this.children[0] as HTMLSpanElement, true)
		quotes(undefined, { refresh: true })
	})

	paramId('i_qtauthor').addEventListener('change', function () {
		quotes(undefined, { author: this.checked })
	})

	paramId('i_qtlist').addEventListener('change', function () {
		quotes(undefined, { userlist: this.value })
	})

	//
	// Custom fonts

	paramId('i_customfont').addEventListener('focus', function () {
		customFont(undefined, { autocomplete: true })
	})

	paramId('i_customfont').addEventListener('change', function () {
		customFont(undefined, { family: this.value })
	})

	paramId('i_customfont').addEventListener('beforeinput', function (this, e) {
		if (this.value === '' && e.inputType === 'deleteContentBackward') {
			customFont(undefined, { family: '' })
		}
	})

	paramId('i_weight').addEventListener('input', function () {
		customFont(undefined, { weight: this.value })
	})

	paramId('i_size').addEventListener('input', function () {
		customFont(undefined, { size: this.value })
	})

	paramId('i_textshadow').addEventListener('input', function () {
		textShadow(undefined, parseFloat(this.value))
	})

	//
	// Page layout

	paramId('b_editmove').addEventListener('click', function () {
		moveElements(undefined, { toggle: true })
	})

	paramId('b_resetlayout').addEventListener('click', function () {
		moveElements(undefined, { reset: true })
	})

	for (const button of paramId('grid-layout').querySelectorAll<HTMLButtonElement>('button')) {
		button.addEventListener('click', () => {
			moveElements(undefined, { layout: button.dataset.layout || '' })
		})
	}

	paramId('i_pagewidth').addEventListener('input', function () {
		pageControl({ width: parseInt(this.value) }, true)
	})

	paramId('i_pagegap').addEventListener('input', function () {
		pageControl({ gap: parseFloat(this.value) }, true)
	})

	paramId('i_pagewidth').addEventListener('touchstart', () => moveElements(undefined, { overlay: true }), { passive: true })
	paramId('i_pagewidth').addEventListener('mousedown', () => moveElements(undefined, { overlay: true }))
	paramId('i_pagewidth').addEventListener('touchend', () => moveElements(undefined, { overlay: false }))
	paramId('i_pagewidth').addEventListener('mouseup', () => moveElements(undefined, { overlay: false }))

	//
	// Custom Style

	paramId('cssEditor').addEventListener('keyup', function (this: Element, ev: Event) {
		customCss(undefined, { styling: (ev.target as HTMLInputElement).value })
	})

	//
	// Updates

	paramId('i_announce').addEventListener('change', function (this) {
		interfacePopup(undefined, { announce: this.value })
	})

	//
	// Settings managment

	paramId('s_export').addEventListener('click', function () {
		toggleSettingsManagement(false)
	})

	paramId('s_import').addEventListener('click', function () {
		toggleSettingsManagement(true)
	})

	paramId('b_exportfile').addEventListener('click', function () {
		exportAsFile()
	})

	paramId('b_exportcopy').addEventListener('click', function (this) {
		copyImportText(this)
	})

	paramId('i_importfile').addEventListener('change', function (this) {
		importAsFile(this)
	})

	paramId('i_importtext').addEventListener('keyup', function (this) {
		importAsText(this.value)
	})

	paramId('b_resetconf').addEventListener('click', function () {
		paramsReset('conf')
	})

	paramId('b_resetyes').addEventListener('click', function () {
		paramsReset('yes')
	})

	paramId('b_resetno').addEventListener('click', function () {
		paramsReset('no')
	})

	paramId('b_importtext').addEventListener('click', function () {
		const val = (document.getElementById('i_importtext') as HTMLInputElement).value
		paramsImport(parse<Partial<Sync.Storage>>(val) ?? {})
	})

	//
	// Other

	// Reduces opacity to better see interface appearance changes
	if (IS_MOBILE) {
		const touchHandler = (touch: boolean) => document.getElementById('settings')?.classList.toggle('see-through', touch)
		document.querySelectorAll("input[type='range'").forEach((input: Element) => {
			input.addEventListener('touchstart', () => touchHandler(true), { passive: true })
			input.addEventListener('touchend', () => touchHandler(false), { passive: true })
		})
	}

	paramClasses('uploadContainer').forEach(function (uploadContainer: Element) {
		const toggleDrag = () => uploadContainer.classList.toggle('dragover')
		const input = uploadContainer.querySelector('input[type="file"')

		input?.addEventListener('dragenter', toggleDrag)
		input?.addEventListener('dragleave', toggleDrag)
		input?.addEventListener('drop', toggleDrag)
	})

	document.querySelectorAll('.tooltip').forEach((elem: Element) => {
		elem.addEventListener('click', function () {
			const cl = [...elem.classList].filter((c) => c.startsWith('tt'))[0] // get tt class
			document.querySelector('.tooltiptext.' + cl)?.classList.toggle('shown') // toggle tt text
		})
	})
}

function initSettingsEvents() {
	const domsettings = document.getElementById('settings')
	const domsuggestions = document.getElementById('sb-suggestions')
	const isOnline = PLATFORM === 'online'
	let isMousingDownOnInput = false

	// On settings changes, update export code
	const storageUpdate = () => updateExportJSON()
	const unloadUpdate = () => chrome.storage.onChanged.removeListener(storageUpdate)

	if (isOnline) {
		window.addEventListener('storage', storageUpdate)
	} else {
		chrome.storage.onChanged.addListener(storageUpdate)
		window.addEventListener('beforeunload', unloadUpdate, { once: true })
	}

	document.body.addEventListener('mousedown', detectTargetAsInputs)
	document.getElementById('skiptosettings')?.addEventListener('click', skipToSettings)
	document.getElementById('showSettings')?.addEventListener('click', toggleSettingsMenu)

	window.addEventListener('keydown', async function (e) {
		const linksFolderOpen = document.getElementById('linkblocks')?.classList.contains('in-folder')

		if (e.altKey && e.code === 'KeyS') {
			console.clear()
			console.log(localStorage)
			console.log(await storage.sync.get())
		}

		if (e.code === 'Escape') {
			if (domsuggestions?.classList.contains('shown')) {
				domsuggestions?.classList.remove('shown')
				return
			}

			if (!linksFolderOpen) {
				toggleSettingsMenu()
				return
			}
		}

		if (e.code === 'Tab') {
			document.body.classList.toggle('tabbing', true)
			return
		}
	})

	document.body.addEventListener('click', function (e) {
		if (isMousingDownOnInput) {
			return
		}

		const path = e.composedPath() ?? [document.body]
		const pathIds = path.map((el) => (el as HTMLElement).id)
		const isContextmenuOpen = document.querySelector<HTMLDialogElement>('#editlink')?.open
		const areSettingsShown = domsettings?.classList.contains('shown')
		const isInFolder = document.getElementById('linkblocks')?.dataset.folderid
		const onBody = (path[0] as HTMLElement).tagName === 'BODY'
		const onInterface = pathIds.includes('interface')

		if (document.body.classList.contains('tabbing')) {
			document.body?.classList.toggle('tabbing', false)
		}

		if ((onBody || onInterface) && areSettingsShown) {
			toggleSettingsMenu()
		}
	})

	function detectTargetAsInputs(event: Event) {
		const path = event.composedPath() as Element[]
		const tagName = path[0]?.tagName ?? ''
		isMousingDownOnInput = ['TEXTAREA', 'INPUT'].includes(tagName)
	}

	function skipToSettings() {
		toggleSettingsMenu()
		domsettings?.scrollTo({ top: 0 })

		setTimeout(() => {
			const showall = document.getElementById('i_showall') as HTMLButtonElement
			showall.focus()
		}, 10)
	}
}

//
//
//

function toggleSettingsMenu() {
	const domsettings = document.getElementById('settings')
	const domshowsettings = document.getElementById('showSettings')
	const dominterface = document.getElementById('interface')
	const domedit = document.getElementById('editlink')
	const isClosed = domsettings?.classList.contains('shown') === false

	domsettings?.classList.toggle('init', false)
	domsettings?.classList.toggle('shown', isClosed)
	domedit?.classList.toggle('pushed', isClosed)
	dominterface?.classList.toggle('pushed', isClosed)
	domshowsettings?.classList.toggle('shown', isClosed)

	domsettings?.style.removeProperty('transform')
	domsettings?.style.removeProperty('transition')
}

function changelogControl(settingsDom: HTMLElement) {
	const domshowsettings = document.querySelector('#showSettings')
	const domchangelog = settingsDom.querySelector('#changelogContainer')

	if (!domchangelog) return

	domchangelog.classList.toggle('shown', true)
	domshowsettings?.classList.toggle('hasUpdated', true)

	const dismiss = () => {
		domshowsettings?.classList.toggle('hasUpdated', false)
		domchangelog.className = 'dismissed'
		localStorage.removeItem('hasUpdated')
	}

	const loglink = settingsDom.querySelector('#link') as HTMLAnchorElement
	const logdismiss = settingsDom.querySelector('#log_dismiss') as HTMLButtonElement

	loglink.onclick = () => dismiss()
	logdismiss.onclick = () => dismiss()
}

function translatePlaceholders() {
	const cases = [
		['i_title', 'Name'],
		['i_greeting', 'Name'],
		['i_tabtitle', 'New tab'],
		['i_sbrequest', 'Search query: %s'],
		['i_sbplaceholder', 'Search'],
		['cssEditor', 'Type in your custom CSS'],
		['i_importtext', 'or paste as text'],
	]

	for (const [id, text] of cases) {
		document.getElementById(id)?.setAttribute('placeholder', tradThis(text))
	}
}

async function switchLangs(nextLang: Langs) {
	await toggleTraduction(nextLang)

	storage.sync.set({ lang: nextLang })
	storage.local.remove('quotesCache')

	document.documentElement.setAttribute('lang', nextLang)

	const data = await storage.sync.get()
	const local = await storage.local.get(['quotesCache', 'userQuoteSelection', 'lastWeather'])

	data.lang = nextLang
	clock(data)
	weather({ sync: data })
	quotes({ sync: data, local })
	tabTitle(data.tabtitle)
	notes(data.notes)
	customFont(undefined, { lang: true })
	settingsFooter()
	translatePlaceholders()
}

function showall(val: boolean, event: boolean) {
	document.getElementById('settings')?.classList.toggle('all', val)

	if (event) {
		storage.sync.set({ showall: val })
	}
}

async function selectBackgroundType(cat: string) {
	document.getElementById('local_options')?.classList.toggle('shown', cat === 'local')
	document.getElementById('unsplash_options')?.classList.toggle('shown', cat === 'unsplash')

	if (cat === 'local') {
		localBackgrounds({ settings: document.getElementById('settings') as HTMLElement })
		setTimeout(() => localBackgrounds(), 100)
	}

	if (cat === 'unsplash') {
		const data = await storage.sync.get()
		const local = await storage.local.get('unsplashCache')

		if (!data.unsplash) return

		document.querySelector<HTMLSelectElement>('#i_freq')!.value = data.unsplash.every || 'hour'
		document.getElementById('creditContainer')?.classList.toggle('shown', true)
		setTimeout(
			() =>
				unsplashBackgrounds({
					unsplash: data.unsplash,
					cache: local.unsplashCache,
				}),
			100
		)
	}

	storage.sync.set({ background_type: cat })
}

function settingsFooter() {
	const one = document.querySelector<HTMLAnchorElement>('#signature-one')
	const two = document.querySelector<HTMLAnchorElement>('#signature-two')
	const donate = document.getElementById('donate')
	const version = document.getElementById('version')
	const rand = Math.random() > 0.5

	if (one && two) {
		one.href = rand ? 'https://victr.me/' : 'https://tahoe.be/'
		two.href = rand ? 'https://tahoe.be/' : 'https://victr.me/'
		one.textContent = rand ? 'Victor Azevedo' : 'Tahoe Beetschen'
		two.textContent = rand ? 'Tahoe Beetschen' : 'Victor Azevedo'
	}

	if (version) {
		version.textContent = SYNC_DEFAULT.about.version
	}

	if (SYSTEM_OS === 'ios' || PLATFORM === 'safari') {
		donate?.remove()
	}
}

//
//	Inputs tab accessibility
//

function controlOptionsTabFocus(settingsDom: HTMLElement) {
	optionsTabIndex(settingsDom)

	for (const option of settingsDom.querySelectorAll('.opt-hider')) {
		option.addEventListener('input', function () {
			setTimeout(() => optionsTabIndex(settingsDom), 10)
		})
	}
}

function optionsTabIndex(settingsDom: HTMLElement) {
	const id = <T>(s: string): T | null => settingsDom.querySelector(`#${s}`) as T | null
	const isAllSettings = id<HTMLInputElement>('i_showall')?.checked

	const toggleTabindex = (parent: string, on: boolean = true) => {
		settingsDom?.querySelectorAll(`${parent} :is(input,  select,  button,  a, textarea)`).forEach((dom) => {
			on ? dom.removeAttribute('tabindex') : dom.setAttribute('tabindex', '-1')
		})
	}

	// If showall, start by enabling .as fields
	if (isAllSettings) {
		toggleTabindex('.as', true)
	}

	// Then control if widgets are on or off
	settingsDom.querySelectorAll('.dropdown').forEach((dom) => {
		toggleTabindex('#' + dom.id, dom?.classList.contains('shown'))
	})

	// Disable all "all" settings if off
	if (isAllSettings === false) {
		toggleTabindex('.as', false)
	}

	// Toggle tooltips
	settingsDom.querySelectorAll('.tooltiptext').forEach((dom) => {
		toggleTabindex('.' + dom.classList[1], dom?.classList.contains('shown'))
	})

	// Toggle in-widgets hidden options
	toggleTabindex('#analog_options', id<Element>('analog_options')?.classList.contains('shown'))
	toggleTabindex('#digital_options', id<Element>('digital_options')?.classList.contains('shown'))
	toggleTabindex('#searchbar_request', id<Element>('searchbar_request')?.classList.contains('shown'))
	toggleTabindex('#weather_provider', id<Element>('weather_provider')?.classList.contains('shown'))
	toggleTabindex('#quotes_userlist', id<Element>('quotes_userlist')?.classList.contains('shown'))
	toggleTabindex('#import', id<Element>('import')?.classList.contains('shown'))
	toggleTabindex('#export', id<Element>('export')?.classList.contains('shown'))
	toggleTabindex('#sett_city', id<HTMLInputElement>('i_geol')?.checked === false)
}

//
// 	Mobile settings drawer bar
//

function settingsDrawerBar() {
	const drawerDragDebounce = debounce(() => {
		;(document.getElementById('settings-footer') as HTMLDivElement).style.removeProperty('padding')
		drawerDragEvents()
	}, 600)

	window.addEventListener('resize', () => {
		drawerDragDebounce()

		// removes transition to prevent weird movement when changing to mobile styling
		// /!\ this is dependent on toggleSettingsMenu() to remove inline styling /!\
		if (!document.getElementById('settings')?.style.transition) {
			document.getElementById('settings')?.setAttribute('style', 'transition: none')
		}
	})

	drawerDragEvents()
}

function drawerDragEvents() {
	const settingsDom = document.getElementById('settings') as HTMLElement
	let firstPos = 0
	let startTouchY = 0

	function dragStart(e: Event) {
		e.preventDefault()

		// Get mouse / touch y position
		if (e.type === 'mousedown') startTouchY = (e as MouseEvent).clientY
		if (e.type === 'touchstart') startTouchY = (e as TouchEvent).touches[0].clientY

		// First time dragging, sets maximum y pos at which to block
		if (firstPos === 0) firstPos = startTouchY

		// Scrollbar padding control on windows & android
		if (SYSTEM_OS.match(/windows|android/)) {
			settingsDom.style.width = `calc(100% - 10px)`
			settingsDom.style.paddingRight = `10px`
		}

		// prevent scroll when dragging
		settingsDom.style.overflow = `clip`

		// Add mouse / touch moves events
		window.addEventListener('touchmove', dragMove)
		window.addEventListener('mousemove', dragMove)
	}

	function dragMove(e: Event) {
		let clientY: number = 0

		// Get mouse / touch y position
		if (e.type === 'mousemove') clientY = (e as MouseEvent).clientY
		if (e.type === 'touchmove') clientY = (e as TouchEvent).touches[0].clientY

		// element is below max height: move
		if (clientY > 60) {
			settingsDom.style.transform = `translateY(-${window.innerHeight + 30 - clientY}px)`
			settingsDom.style.transition = `transform .0s`
		}
	}

	function dragEnd(e: Event) {
		let clientY: number = 0

		// Get mouse / touch y position
		if (e.type === 'mouseup' || e.type === 'mouseleave') clientY = (e as MouseEvent).clientY
		if (e.type === 'touchend') clientY = (e as TouchEvent).changedTouches[0].clientY

		// Remove move events
		window.removeEventListener('touchmove', dragMove)
		window.removeEventListener('mousemove', dragMove)

		// reset mouse / touch pos
		startTouchY = 0

		settingsDom.style.removeProperty('padding')
		settingsDom.style.removeProperty('width')
		settingsDom.style.removeProperty('overflow')

		// Add bottom padding to see bottom of settings
		const signaturedom = document.querySelector('.signature') as HTMLDivElement
		signaturedom.style.paddingBottom = clientY + 60 + 'px'

		// small enough ? close settings
		if (clientY > window.innerHeight - 100) {
			toggleSettingsMenu()
		}
	}

	const dragzone = settingsDom.querySelector('#mobile-drag-zone')
	dragzone?.addEventListener('touchstart', dragStart, { passive: false })
	dragzone?.addEventListener('mousedown', dragStart)
	dragzone?.addEventListener('touchend', dragEnd, { passive: false })
	dragzone?.addEventListener('mouseup', dragEnd)

	document.body?.addEventListener('mouseleave', (e) => {
		if (settingsDom?.classList.contains('shown') && window.innerWidth < 600) {
			dragEnd(e)
		}
	})
}

//
//	Settings management
//

function toggleSettingsManagement(toggled: boolean) {
	document.getElementById('export')?.classList.toggle('shown', !toggled)
	document.getElementById('import')?.classList.toggle('shown', toggled)
	document.querySelector('.importexport-tabs')?.classList.toggle('toggled', toggled)
}

async function copyImportText(target: HTMLElement) {
	try {
		const area = document.getElementById('area_export') as HTMLInputElement
		await navigator.clipboard.writeText(area.value)
		target.textContent = tradThis('Copied')
		setTimeout(() => {
			const domimport = document.getElementById('b_exportcopy')
			if (domimport) {
				domimport.textContent = tradThis('Copy text')
			}
		}, 1000)
	} catch (err) {
		console.error('Failed to copy: ', err)
	}
}

async function exportAsFile() {
	const a = document.getElementById('downloadfile')
	if (!a) return

	const date = new Date()
	const data = ((await storage.sync.get()) as Sync.Storage) ?? {}
	const zero = (n: number) => (n.toString().length === 1 ? '0' + n : n.toString())
	const YYYYMMDD = date.toISOString().slice(0, 10)
	const HHMMSS = `${zero(date.getHours())}_${zero(date.getMinutes())}_${zero(date.getSeconds())}`

	const bytes = new TextEncoder().encode(orderedStringify(data))
	const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' })
	const href = URL.createObjectURL(blob)

	a.setAttribute('href', href)
	a.setAttribute('tabindex', '-1')
	a.setAttribute('download', `bonjourr-${data?.about?.version} ${YYYYMMDD} ${HHMMSS}.json`)
	a.click()
}

function importAsText(string: string) {
	const importtext = document.getElementById('b_importtext')

	try {
		parse(string)
		importtext?.removeAttribute('disabled')
	} catch (error) {
		importtext?.setAttribute('disabled', '')
	}
}

function importAsFile(target: HTMLInputElement) {
	function decodeExportFile(str: string): Partial<Sync.Storage> {
		let result = {}

		try {
			// Tries to decode base64 from previous versions
			result = parse<Partial<Sync.Storage>>(atob(str)) ?? {}
		} catch {
			try {
				// If base64 failed, parse raw string
				result = parse<Partial<Sync.Storage>>(str) ?? {}
			} catch (error) {
				// If all failed, return empty object
				result = {}
			}
		}

		return result
	}

	if (!target.files || (target.files && target.files.length === 0)) {
		return
	}

	const file = target.files[0]
	const reader = new FileReader()

	reader.onload = () => {
		if (typeof reader.result !== 'string') return false

		const importData = decodeExportFile(reader.result)

		// data has at least one valid key from default sync storage => import
		if (Object.keys(SYNC_DEFAULT).filter((key) => key in importData).length > 0) {
			paramsImport(importData as Sync.Storage)
		}
	}
	reader.readAsText(file)
}

async function paramsImport(toImport: Partial<Sync.Storage>) {
	try {
		let data = await storage.sync.get()
		data = filterImports(data, toImport)

		storage.sync.clear()
		storage.sync.set(data)
		fadeOut()
	} catch (e) {
		console.log(e)
	}
}

function paramsReset(action: 'yes' | 'no' | 'conf') {
	if (action === 'yes') {
		storage.sync.clear()
		storage.local.clear()

		setTimeout(() => {
			storage.sync.set({ ...getSyncDefaults() })
			storage.local.set({ ...LOCAL_DEFAULT })
			fadeOut()
		}, 50)

		return
	}

	document.getElementById('reset_first')?.classList.toggle('shown', action === 'no')
	document.getElementById('reset_conf')?.classList.toggle('shown', action === 'conf')
}

export async function updateExportJSON() {
	const input = document.getElementById('area_export') as HTMLInputElement

	document.getElementById('importtext')?.setAttribute('disabled', '') // because cannot export same settings

	const data = await storage.sync.get()
	data.about.browser = PLATFORM

	input.value = orderedStringify(data)
}

function fadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.click()
	dominterface.style.transition = 'opacity .4s'
	setTimeout(() => (dominterface.style.opacity = '0'))
	setTimeout(() => location.reload(), 400)
}

//
//	Helpers
//

function paramId(str: string) {
	return document.getElementById(str) as HTMLInputElement
}

function paramClasses(str: string) {
	return document.querySelectorAll(`.${str}`)!
}

function setCheckbox(id: string, cat: boolean) {
	const checkbox = paramId(id) as HTMLInputElement
	checkbox.checked = cat
}

function setInput(id: string, val: string | number) {
	const input = paramId(id) as HTMLInputElement
	input.value = typeof val === 'string' ? val : val?.toString()
}
