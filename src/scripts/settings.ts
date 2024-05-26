import clock from './features/clock'
import notes from './features/notes'
import quotes from './features/quotes'
import weather from './features/weather'
import searchbar from './features/searchbar'
import quickLinks from './features/links'
import hideElements from './features/hide'
import moveElements from './features/move'
import interfacePopup from './features/popup'
import localBackgrounds from './features/backgrounds/local'
import unsplashBackgrounds from './features/backgrounds/unsplash'
import storage, { getSyncDefaults } from './storage'
import linksImport, { syncNewBookmarks } from './features/links/bookmarks'
import customFont, { fontIsAvailableInSubset } from './features/fonts'
import { backgroundFilter, updateBackgroundOption } from './features/backgrounds'
import { darkmode, favicon, tabTitle, textShadow, pageControl } from './features/others'

import langList from './langs'
import parse from './utils/parse'
import debounce from './utils/debounce'
import filterImports from './utils/filterimports'
import orderedStringify from './utils/orderedstringify'
import { loadCallbacks } from './utils/onsettingsload'
import { traduction, tradThis, toggleTraduction } from './utils/translations'
import { SYSTEM_OS, IS_MOBILE, PLATFORM, SYNC_DEFAULT, LOCAL_DEFAULT } from './defaults'
import { getHTMLTemplate, inputThrottle, stringMaxSize, turnRefreshButton } from './utils'

import type { Langs } from '../types/langs'

export async function settingsPreload() {
	const domshowsettings = document.getElementById('show-settings')
	const innerHtml = await (await fetch('settings.html')).text()
	const outerHtml = `<aside id="settings" class="init">${innerHtml}</aside>`
	const template = document.querySelector<HTMLTemplateElement>('#settings-template')

	if (template) {
		template.innerHTML = outerHtml
	}

	domshowsettings?.addEventListener('mouseenter', triggerSettingsInit)
	domshowsettings?.addEventListener('pointerdown', triggerSettingsInit)
	document.body.addEventListener('keydown', triggerSettingsInit)

	function triggerSettingsInit(event: Event) {
		const keyboard = (event as KeyboardEvent)?.code === 'Escape'
		const pointer = event?.type.includes('key') === false

		if (keyboard || pointer) {
			domshowsettings?.removeEventListener('mouseenter', triggerSettingsInit)
			domshowsettings?.removeEventListener('pointerdown', triggerSettingsInit)
			document.body.removeEventListener('keydown', triggerSettingsInit)
			settingsInit()
		}
	}
}

export async function settingsInit() {
	if (document.getElementById('settings')) return

	const data = await storage.sync.get()
	const settingsDom = getHTMLTemplate<HTMLElement>('settings-template', '#settings')

	document.body.appendChild(settingsDom)

	traduction(settingsDom, data.lang)
	showall(data.showall, false)
	initOptionsValues(data)
	initOptionsEvents()
	updateSettingsJSON(data)
	updateSettingsEvent()
	settingsDrawerBar()
	settingsFooter()
	loadCallbacks()

	document.dispatchEvent(new Event('settings'))
	document.addEventListener('toggle-settings', settingsToggle)
}

function settingsToggle() {
	const domsettings = document.getElementById('settings')
	const domshowsettings = document.getElementById('show-settings')
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
	document.dispatchEvent(new Event('close-edit'))
}

function initOptionsValues(data: Sync.Storage) {
	const domsettings = document.getElementById('settings') as HTMLElement
	const userQuotes = !data.quotes?.userlist?.[0] ? undefined : data.quotes?.userlist

	setInput('i_blur', data.background_blur ?? 15)
	setInput('i_bright', data.background_bright ?? 0.8)
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
	setInput('i_sbwidth', data.searchbar?.width ?? 30)
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
	setInput('i_announce', data.announcements ?? 'major')

	setCheckbox('i_showall', data.showall)
	setCheckbox('i_settingshide', data.hide?.settingsicon ?? false)
	setCheckbox('i_quicklinks', data.quicklinks)
	setCheckbox('i_linkgroups', data?.linkgroups?.on || false)
	setCheckbox('i_linknewtab', data.linknewtab)
	setCheckbox('i_time', data.time)
	setCheckbox('i_main', data.main)
	setCheckbox('i_greethide', !data.hide?.greetings)
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

	// Link show title
	paramId('b_showtitles').classList.toggle('on', data?.linktitles ?? true)

	paramId('b_showbackgrounds').classList.toggle('on', data?.linkbackgrounds ?? true)

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

	// Quotes option display
	paramId('quotes_options')?.classList.toggle('shown', data.quotes?.on)
	paramId('quotes_userlist')?.classList.toggle('shown', data.quotes?.type === 'user')

	document.querySelectorAll<HTMLFormElement>('#settings form').forEach((form) => {
		form.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
			input.addEventListener('input', () => form.classList.toggle('valid', form.checkValidity()))
		})
	})
}

function initOptionsEvents() {
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

	// Quick links

	paramId('i_quicklinks').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['quicklinks', this.checked] })
	})

	paramId('f_addlink').addEventListener('submit', function (this, event: SubmitEvent) {
		event.preventDefault()

		quickLinks(undefined, {
			addLinks: [
				{
					title: paramId('i_addlink-title').value,
					url: paramId('i_addlink-url').value,
				},
			],
		})

		paramId('i_addlink-url').value = ''
		paramId('i_addlink-title').value = ''
	})

	paramId('i_linkgroups').addEventListener('change', function (this) {
		quickLinks(undefined, { groups: this.checked })
	})

	paramId('i_linknewtab').addEventListener('change', function (this) {
		quickLinks(undefined, { newtab: this.checked })
	})

	paramId('i_linkstyle').addEventListener('change', function (this) {
		quickLinks(undefined, { styles: { style: this.value } })
	})

	paramId('b_showtitles').addEventListener('click', function (this) {
		quickLinks(undefined, { styles: { titles: !this.classList.contains('on') } })
	})

	paramId('b_showbackgrounds').addEventListener('click', function (this) {
		quickLinks(undefined, { styles: { backgrounds: !this.classList.contains('on') } })
	})

	paramId('i_row').addEventListener('input', function (this) {
		quickLinks(undefined, { row: this.value })
	})

	paramId('b_importbookmarks').addEventListener('click', linksImport)

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

	paramId('f_collection').addEventListener('submit', function (this, event) {
		event.preventDefault()
		unsplashBackgrounds(undefined, {
			collection: stringMaxSize(paramId('i_collection').value, 256),
		})
	})

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

	// Weather

	paramId('i_main').addEventListener('change', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['main', this.checked] })
	})

	paramId('i_geol').addEventListener('change', function (this: HTMLInputElement, event) {
		weather(undefined, { geol: this?.value })
	})

	paramId('i_city').addEventListener('input', function (this: HTMLInputElement) {
		document.getElementById('f_location')?.classList.toggle('valid', this.value.length > 2)
	})

	paramId('f_location').addEventListener('submit', function (this, event: SubmitEvent) {
		weather(undefined, { city: true })
		event.preventDefault()
	})

	paramId('i_units').addEventListener('change', function (this: HTMLInputElement) {
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

	// Notes

	paramId('i_notes').addEventListener('click', function (this: HTMLInputElement) {
		moveElements(undefined, { widget: ['notes', this.checked] })
	})

	paramId('i_notesalign').addEventListener('change', function (this: HTMLInputElement) {
		notes(undefined, { align: this.value })
	})

	paramId('i_noteswidth').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { width: this.value })
	})

	paramId('i_notesopacity').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { opacity: this.value })
	})

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

	paramId('i_sbwidth').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(undefined, { width: this.value })
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

	// Custom fonts

	paramId('i_customfont').addEventListener('pointerenter', function () {
		customFont(undefined, { autocomplete: true })
	})

	paramId('f_customfont').addEventListener('submit', function (event) {
		customFont(undefined, { family: paramId('i_customfont').value })
		event.preventDefault()
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

	// Updates

	paramId('i_announce').addEventListener('change', function (this) {
		interfacePopup(undefined, { announcements: this.value })
	})

	// Settings managment

	paramId('settings-managment').addEventListener('dragenter', function () {
		paramId('settings-managment').classList.add('dragging-file')
	})

	paramId('file-import').addEventListener('dragleave', function () {
		paramId('settings-managment').classList.remove('dragging-file')
	})

	paramId('b_file-load').addEventListener('click', function (this) {
		paramId('file-import')?.click()
	})

	paramId('b_file-save').addEventListener('click', function () {
		saveImportFile()
	})

	paramId('file-import').addEventListener('change', function (this) {
		loadImportFile(this)
	})

	paramId('b_settings-copy').addEventListener('click', function (this) {
		copySettings(this)
	})

	paramId('settings-data').addEventListener('input', function () {
		toggleSettingsChangesButtons('input')
	})

	paramId('b_settings-cancel').addEventListener('click', function () {
		toggleSettingsChangesButtons('cancel')
	})

	paramId('b_settings-apply').addEventListener('click', function () {
		const val = paramId('settings-data').value
		importSettings(parse<Partial<Sync.Storage>>(val) ?? {})
	})

	paramId('b_reset-first').addEventListener('click', function () {
		resetSettings('first')
	})

	paramId('b_reset-apply').addEventListener('click', function () {
		resetSettings('yes')
	})

	paramId('b_reset-cancel').addEventListener('click', function () {
		resetSettings('no')
	})

	// Other

	if (IS_MOBILE) {
		// Reduces opacity to better see interface appearance changes
		const touchHandler = (touch: boolean) => document.getElementById('settings')?.classList.toggle('see-through', touch)
		document.querySelectorAll("input[type='range'").forEach((input: Element) => {
			input.addEventListener('touchstart', () => touchHandler(true), { passive: true })
			input.addEventListener('touchend', () => touchHandler(false), { passive: true })
		})
	}

	// TODO: drag event not working ?
	document.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => {
		const toggleDrag = (_: DragEvent) => {
			input.classList.toggle('dragover')
		}

		input?.addEventListener('dragenter', toggleDrag)
		input?.addEventListener('dragleave', toggleDrag)
		input?.addEventListener('drop', toggleDrag)
	})

	document.querySelectorAll<HTMLElement>('.tooltip').forEach((elem) => {
		elem.addEventListener('click', function () {
			const cl = [...elem.classList].filter((c) => c.startsWith('tt'))[0] // get tt class
			document.querySelector('.tooltiptext.' + cl)?.classList.toggle('shown') // toggle tt text
		})
	})
}

function translatePlaceholders() {
	const cases = [
		['i_title', 'Name'],
		['i_greeting', 'Name'],
		['i_tabtitle', 'New tab'],
		['i_sbrequest', 'Search query: %s'],
		['i_sbplaceholder', 'Search'],
		['css-editor-textarea', 'Type in your custom CSS'],
		['i_importtext', 'or paste as text'],
		['i_addlink-title', 'Title'],
		['i_addlink-url', 'example.com'],
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

	if (local?.lastWeather) {
		local.lastWeather.timestamp = 0
		local.lastWeather.forecasted_timestamp = 0
	}

	data.lang = nextLang
	clock(data)
	weather({ sync: data, lastWeather: local.lastWeather })
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
		document.getElementById('credit-container')?.classList.toggle('shown', true)
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
}

// 	Mobile settings drawer bar

function settingsDrawerBar() {
	const drawerDragDebounce = debounce(() => {
		;(document.getElementById('settings-footer') as HTMLDivElement).style.removeProperty('padding')
		drawerDragEvents()
	}, 600)

	window.addEventListener('resize', () => {
		drawerDragDebounce()

		// removes transition to prevent weird movement when changing to mobile styling
		// /!\ this is dependent on settingsToggle() to remove inline styling /!\
		if (!document.getElementById('settings')?.style.transition) {
			document.getElementById('settings')?.setAttribute('style', 'transition: none')
		}
	})

	drawerDragEvents()
}

function drawerDragEvents() {
	const mobileDragZone = document.getElementById('mobile-drag-zone') as HTMLElement
	const settingsDom = document.getElementById('settings') as HTMLElement
	const dragZoneHeight = mobileDragZone.getBoundingClientRect().height
	let settingsVh = -75
	let firstPos = 0
	let startTouchY = 0

	mobileDragZone?.addEventListener('touchstart', dragStart, { passive: false })
	mobileDragZone?.addEventListener('pointerdown', dragStart, { passive: false })

	function dragStart(e: Event) {
		e.preventDefault()

		// Get mouse / touch y position
		if (e.type === 'pointerdown') startTouchY = (e as MouseEvent).clientY
		if (e.type === 'touchstart') startTouchY = (e as TouchEvent).touches[0].clientY

		// First time dragging, sets maximum y pos at which to block
		if (firstPos === 0) firstPos = startTouchY

		// Add mouse / touch moves events
		window.addEventListener('touchmove', dragMove)
		window.addEventListener('pointermove', dragMove)
		document.body.addEventListener('touchend', dragEnd)
		document.body.addEventListener('pointerup', dragEnd)
	}

	function dragMove(e: Event) {
		let clientY: number = 0

		// Get mouse / touch y position
		if (e.type === 'pointermove') clientY = (e as MouseEvent).clientY
		if (e.type === 'touchmove') clientY = (e as TouchEvent).touches[0].clientY

		// element is below max height: move
		if (clientY > 60) {
			const touchPosition = clientY - dragZoneHeight / 2
			const inverseHeight = 100 - (touchPosition / window.innerHeight) * 100

			settingsVh = +inverseHeight.toFixed(2)
			settingsDom.style.transform = `translateY(-${settingsVh}dvh)`
			settingsDom.style.transition = `transform .0s`
		}
	}

	function dragEnd(e: Event) {
		let clientY: number = 0

		// Get mouse / touch y position
		if (e.type === 'pointerup') clientY = (e as MouseEvent).clientY
		if (e.type === 'touchend') clientY = (e as TouchEvent).changedTouches[0].clientY

		window.removeEventListener('touchmove', dragMove)
		window.removeEventListener('pointermove', dragMove)
		document.body.removeEventListener('touchend', dragEnd)
		document.body.removeEventListener('pointerup', dragEnd)

		startTouchY = 0

		const footer = document.getElementById('settings-footer') as HTMLDivElement
		footer.style.paddingBottom = 100 - Math.abs(settingsVh) + 'dvh'

		settingsDom.style.removeProperty('padding')
		settingsDom.style.removeProperty('width')
		settingsDom.style.removeProperty('overflow')

		// small enough ? close settings
		if (clientY > window.innerHeight - 100) {
			settingsToggle()
		}
	}
}

//	Settings management

async function copySettings(target: HTMLElement) {
	try {
		const pre = document.getElementById('settings-data')
		await navigator.clipboard.writeText(pre?.textContent ?? '{}')
		target.textContent = tradThis('Copied')
		setTimeout(() => {
			const domimport = document.getElementById('b_settings-copy')
			if (domimport) {
				domimport.textContent = tradThis('Copy')
			}
		}, 1000)
	} catch (err) {
		console.error('Failed to copy: ', err)
	}
}

async function saveImportFile() {
	const a = document.getElementById('file-download')
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

function loadImportFile(target: HTMLInputElement) {
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
			importSettings(importData as Sync.Storage)
		}
	}
	reader.readAsText(file)
}

async function importSettings(toImport: Partial<Sync.Storage>) {
	try {
		let data = await storage.sync.get()

		// #308 - verify font subset before importing
		if (toImport?.font?.system === false) {
			const family = toImport?.font?.family
			const lang = toImport?.lang
			const correctSubset = await fontIsAvailableInSubset(lang, family)

			if (correctSubset === false) {
				toImport.font.family = ''
			}
		}

		data = filterImports(data, toImport)

		storage.sync.clear()
		storage.sync.set(data)
		fadeOut()
	} catch (e) {
		console.log(e)
	}
}

function resetSettings(action: 'yes' | 'no' | 'first') {
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

	document.getElementById('reset-first')?.classList.toggle('shown', action === 'no')
	document.getElementById('reset-conf')?.classList.toggle('shown', action === 'first')
}

export function updateSettingsJSON(data?: Sync.Storage) {
	data ? updateTextArea(data) : storage.sync.get().then(updateTextArea)

	function updateTextArea(data: Sync.Storage) {
		const pre = document.getElementById('settings-data')

		if (pre) {
			data.about.browser = PLATFORM
			pre.textContent = orderedStringify(data)
		}
	}
}

function updateSettingsEvent() {
	// On settings changes, update export code
	// beforeunload stuff because of this issue: https://github.com/victrme/Bonjourr/issues/194
	const storageUpdate = () => updateSettingsJSON()
	const removeListener = () => chrome.storage.onChanged.removeListener(storageUpdate)

	if (PLATFORM === 'online') {
		window.addEventListener('storage', storageUpdate)
	} else {
		chrome.storage.onChanged.addListener(storageUpdate)
		window.addEventListener('beforeunload', removeListener, { once: true })
	}
}

async function toggleSettingsChangesButtons(action: 'input' | 'cancel') {
	const textarea = paramId('settings-data')
	const data = await storage.sync.get()
	let hasChanges = false

	if (action === 'input') {
		const current = orderedStringify(data)
		const user = orderedStringify(JSON.parse(textarea.value) ?? {})
		hasChanges = user.length > 2 && current !== user
	}

	if (action === 'cancel') {
		textarea.value = orderedStringify(data)
		hasChanges = false
	}

	if (hasChanges) {
		paramId('settings-changes')?.classList.toggle('changes', true)
		paramId('b_settings-apply')?.removeAttribute('disabled')
	} else {
		paramId('settings-changes')?.classList.remove('changes')
		paramId('b_settings-apply')?.setAttribute('disabled', '')
	}
}

function fadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.click()
	dominterface.style.transition = 'opacity .4s'
	setTimeout(() => (dominterface.style.opacity = '0'))
	setTimeout(() => location.reload(), 400)
}

//	Helpers

function paramId(str: string) {
	return document.getElementById(str) as HTMLInputElement
}

function setCheckbox(id: string, cat: boolean) {
	const checkbox = paramId(id) as HTMLInputElement
	checkbox.checked = cat
}

function setInput(id: string, val: string | number) {
	const input = paramId(id) as HTMLInputElement
	input.value = typeof val === 'string' ? val : val?.toString()
}
