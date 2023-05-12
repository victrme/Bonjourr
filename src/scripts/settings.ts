import { Sync } from './types/sync'

import storage from './storage'
import notes from './features/notes'
import quotes from './features/quotes'
import weather from './features/weather'
import unsplash from './features/unsplash'
import searchbar from './features/searchbar'
import customFont from './features/fonts'
import quickLinks from './features/links'
import hideElements from './features/hide'
import moveElements from './features/move'
import localBackgrounds from './features/localbackgrounds'

import throttle from './utils/throttle'
import debounce from './utils/debounce'
import filterImports from './utils/filterImports'
import stringifyOrder from './utils/stringifyOrder'
import { traduction, tradThis, toggleTraduction } from './utils/translations'

import {
	$,
	has,
	clas,
	inputThrottle,
	detectPlatform,
	closeEditLink,
	mobilecheck,
	stringMaxSize,
	deleteBrowserStorage,
	getBrowserStorage,
	turnRefreshButton,
	testOS,
	langList,
	syncDefaults,
} from './utils'

import {
	toggleWidgetsDisplay,
	backgroundFilter,
	clock,
	customCss,
	darkmode,
	favicon,
	linksImport,
	tabTitle,
	textShadow,
	pageWidth,
} from './index'
import parse from './utils/JSONparse'

type Langs = keyof typeof langList

function initParams(data: Sync, settingsDom: HTMLElement) {
	//
	if (settingsDom == null) {
		return
	}

	const paramId = (str: string) => settingsDom.querySelector('#' + str) as HTMLInputElement
	const paramClasses = (str: string) => settingsDom.querySelectorAll('.' + str)!

	const initCheckbox = (id: string, cat: boolean) => {
		;(paramId(id) as HTMLInputElement).checked = cat ? true : false
	}

	const initInput = (id: string, val: string | number) => {
		const input = paramId(id) as HTMLInputElement
		input.value = typeof val === 'string' ? val : val.toString()
	}

	// 1.10.0 custom background slideshow
	const whichFreq = data.background_type === 'custom' ? data.custom_every : data.dynamic?.every || 'hour'
	const whichFreqDefault = data.background_type === 'custom' ? 'pause' : 'hour'
	const userQuotes = !data.quotes?.userlist?.[0] ? undefined : data.quotes?.userlist

	initInput('i_blur', data.background_blur ?? 15)
	initInput('i_bright', data.background_bright ?? 0.8)
	initInput('cssEditor', data.css || '')
	initInput('i_row', data.linksrow || 8)
	initInput('i_linkstyle', data.linkstyle || 'default')
	initInput('i_type', data.background_type || 'dynamic')
	initInput('i_freq', whichFreq || whichFreqDefault)
	initInput('i_dark', data.dark || 'system')
	initInput('i_favicon', data.favicon || '')
	initInput('i_tabtitle', data.tabtitle || '')
	initInput('i_pagewidth', data.pagewidth || 1600)
	initInput('i_greeting', data.greeting || '')
	initInput('i_textshadow', data.textShadow ?? 0.2)
	initInput('i_noteswidth', data.notes?.width || 50)
	initInput('i_notesopacity', data.notes?.opacity.toString() || 0.1)
	initInput('i_notesalign', data.notes?.align || 'left')
	initInput('i_sbengine', data.searchbar?.engine || 'google')
	initInput('i_sbplaceholder', data.searchbar?.placeholder || '')
	initInput('i_sbopacity', data.searchbar?.opacity ?? 0.1)
	initInput('i_sbrequest', data.searchbar?.request || '')
	initInput('i_qtfreq', data.quotes?.frequency || 'day')
	initInput('i_qttype', data.quotes?.type || 'classic')
	initInput('i_qtlist', JSON.stringify(userQuotes) || '')
	initInput('i_clockface', data.clock?.face || 'none')
	initInput('i_clockstyle', data.clock?.style || 'round')
	initInput('i_timezone', data.clock?.timezone || 'auto')
	initInput('i_collection', data.dynamic?.collection || '')
	initInput('i_ccode', data.weather?.ccode || 'US')
	initInput('i_forecast', data.weather?.forecast || 'auto')
	initInput('i_temp', data.weather?.temperature || 'actual')
	initInput('i_moreinfo', data.weather?.moreinfo || 'none')
	initInput('i_provider', data.weather?.provider || '')
	initInput('i_customfont', data.font?.family || '')
	initInput('i_weight', data.font?.weight || '300')
	initInput('i_size', data.font?.size || (mobilecheck() ? 11 : 14))

	initCheckbox('i_showall', data.showall)
	initCheckbox('i_settingshide', data.hide?.settingsicon || false)
	initCheckbox('i_quicklinks', data.quicklinks)
	initCheckbox('i_linknewtab', data.linknewtab)
	initCheckbox('i_time', data.time)
	initCheckbox('i_usdate', data.usdate)
	initCheckbox('i_main', data.main)
	initCheckbox('i_geol', typeof data.weather?.location !== 'boolean')
	initCheckbox('i_units', data.weather?.unit === 'imperial' || false)
	initCheckbox('i_greethide', !data.hide?.greetings ?? true)
	initCheckbox('i_notes', data.notes?.on || false)
	initCheckbox('i_sb', data.searchbar?.on || false)
	initCheckbox('i_quotes', data.quotes?.on || false)
	initCheckbox('i_ampm', data.clock?.ampm || false)
	initCheckbox('i_sbnewtab', data.searchbar?.newtab || false)
	initCheckbox('i_qtauthor', data.quotes?.author || false)
	initCheckbox('i_seconds', data.clock?.seconds || false)
	initCheckbox('i_analog', data.clock?.analog || false)

	// Input translation
	translatePlaceholders(settingsDom)

	// Change edit tips on mobile
	if (mobilecheck()) {
		settingsDom.querySelector('.tooltiptext .instructions')!.textContent = tradThis(
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

	initInput('i_lang', data.lang || 'en') // must be init after children appening

	// Activate changelog
	if (localStorage.hasUpdated === 'true') {
		changelogControl(settingsDom)
	}

	// No bookmarks import on safari || online
	if (detectPlatform() === 'safari' || detectPlatform() === 'online') {
		paramId('b_importbookmarks').setAttribute('style', 'display: none')
	}

	// Activate feature options
	clas(paramId('time_options'), data.time, 'shown')
	clas(paramId('main_options'), data.main, 'shown')
	clas(paramId('weather_provider'), data.weather?.moreinfo === 'custom', 'shown')
	clas(paramId('quicklinks_options'), data.quicklinks, 'shown')
	clas(paramId('notes_options'), data.notes?.on || false, 'shown')
	clas(paramId('searchbar_options'), data.searchbar?.on, 'shown')
	clas(paramId('searchbar_request'), data.searchbar?.engine === 'custom', 'shown')
	clas(paramId('quotes_options'), data.quotes?.on, 'shown')

	// Page layout
	settingsDom.querySelectorAll<HTMLButtonElement>('#grid-layout button').forEach((b) => {
		clas(b, b.dataset.layout === (data.move?.selection || 'single'), 'selected')
	})

	// Disables double and triple layouts on mobile
	if (window.innerWidth < 600 && 'ontouchstart' in window) {
		settingsDom.querySelector('#grid-layout button[data-layout="double"]')?.setAttribute('disabled', '')
		settingsDom.querySelector('#grid-layout button[data-layout="triple"]')?.setAttribute('disabled', '')
	}

	// Time & main hide elems
	;(function initHideInputs() {
		const { clock, date, weatherdesc, weathericon } = data.hide || {}
		let time = !clock && !date ? 'all' : clock ? 'clock' : 'date'
		let weather = weatherdesc && weathericon ? 'disabled' : weatherdesc ? 'desc' : weathericon ? 'icon' : 'all'
		initInput('i_timehide', time)
		initInput('i_weatherhide', weather)
	})()

	// Custom Fonts
	customFont(data.font, { initsettings: settingsDom })

	// Backgrounds options init
	if (data.background_type === 'custom') {
		paramId('custom').setAttribute('style', 'display: block')
		settingsDom.querySelector('.as_collection')?.setAttribute('style', 'display: none')
		localBackgrounds({ thumbnail: settingsDom })
	}

	//weather settings
	const i_geol = paramId('i_geol') as HTMLInputElement
	if (data.weather && Object.keys(data.weather).length > 0) {
		const isGeolocation = data.weather?.location?.length > 0
		let cityName = data.weather?.city || 'City'
		paramId('i_city').setAttribute('placeholder', cityName)

		clas(paramId('sett_city'), isGeolocation, 'hidden')
		i_geol.checked = isGeolocation
	} else {
		clas(paramId('sett_city'), true, 'hidden')
		i_geol.checked = true
	}

	// CSS height control
	if (data.cssHeight) {
		paramId('cssEditor').setAttribute('style', 'height: ' + data.cssHeight + 'px')
	}

	// Quotes option display
	clas(paramId('quotes_options'), data.quotes?.on, 'shown')
	clas(paramId('quotes_userlist'), data.quotes?.type === 'user', 'shown')

	updateExportJSON(settingsDom)

	//
	//
	// Events
	//
	//

	// Pressing "Enter" removes focus from input to indicate change
	const enterBlurs = (elem: HTMLInputElement) => {
		elem.onkeyup = (e: KeyboardEvent) => {
			e.key === 'Enter' ? (e.target as HTMLElement).blur() : ''
		}
	}

	enterBlurs(paramId('i_favicon'))
	enterBlurs(paramId('i_tabtitle'))
	enterBlurs(paramId('i_greeting'))
	enterBlurs(paramId('i_sbplaceholder'))

	//general

	paramClasses('uploadContainer').forEach(function (uploadContainer: Element) {
		const toggleDrag = () => uploadContainer.classList.toggle('dragover')
		const input = uploadContainer.querySelector('input[type="file"')

		input?.addEventListener('dragenter', toggleDrag)
		input?.addEventListener('dragleave', toggleDrag)
		input?.addEventListener('drop', toggleDrag)
	})

	// Change edit tips on mobile
	if (mobilecheck()) {
		const instr = settingsDom.querySelector('.tooltiptext .instructions')
		if (instr) instr.textContent = tradThis(`Edit your Quick Links by long-pressing the icon.`)
	}

	settingsDom.querySelectorAll('.tooltip').forEach((elem: Element) => {
		elem.addEventListener('click', function () {
			const cl = [...elem.classList].filter((c) => c.startsWith('tt'))[0] // get tt class
			settingsDom.querySelector('.tooltiptext.' + cl)?.classList.toggle('shown') // toggle tt text
		})
	})

	// Reduces opacity to better see interface appearance changes
	if (mobilecheck()) {
		const touchHandler = (start: boolean) => (settingsDom.style.opacity = start ? '0.2' : '1')
		const rangeInputs = settingsDom.querySelectorAll("input[type='range'")

		rangeInputs.forEach((input: Element) => {
			input.addEventListener('touchstart', () => touchHandler(true), { passive: true })
			input.addEventListener('touchend', () => touchHandler(false), { passive: true })
		})
	}

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

	paramId('i_tabtitle').addEventListener('input', function () {
		tabTitle(this.value, true)
	})

	paramId('i_dark').addEventListener('change', function () {
		darkmode(this.value as 'auto' | 'system' | 'enable' | 'disable', true)
	})

	paramId('b_editmove').addEventListener('click', function () {
		moveElements(null, { toggle: true })
	})

	paramId('b_resetlayout').addEventListener('click', function () {
		moveElements(null, { reset: true })
	})

	paramId('grid-layout')
		.querySelectorAll<HTMLButtonElement>('button')
		.forEach((btn) => {
			btn.addEventListener('click', () => {
				moveElements(null, { layout: btn.dataset.layout || '' })
			})
		})

	paramId('i_settingshide').addEventListener('change', function () {
		hideElements({ settingsicon: this.checked }, { isEvent: true })
	})

	paramId('i_pagewidth').addEventListener('touchstart', () => moveElements(null, { overlay: true }))
	paramId('i_pagewidth').addEventListener('mousedown', () => moveElements(null, { overlay: true }))
	paramId('i_pagewidth').addEventListener('touchend', () => moveElements(null, { overlay: false }))
	paramId('i_pagewidth').addEventListener('mouseup', () => moveElements(null, { overlay: false }))

	paramId('i_pagewidth').addEventListener('input', function () {
		pageWidth(parseInt(this.value), true)
	})

	//
	// Quick links

	paramId('i_quicklinks').addEventListener('click', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ quicklinks: this.checked }, true)
	})

	const submitLinkFunc = throttle(() => quickLinks(null, { add: true }), 1200)

	paramId('i_title').onkeyup = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			submitLinkFunc()
		}
	}

	paramId('i_url').onkeyup = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			submitLinkFunc()
		}
	}

	paramId('submitlink').addEventListener('click', (e) => {
		submitLinkFunc()
		inputThrottle(e.target as HTMLInputElement, 1200)
	})

	paramId('i_linknewtab').onchange = (e) => {
		const input = e.currentTarget as HTMLInputElement
		quickLinks(null, { newtab: input.checked })
	}

	paramId('i_linkstyle').onchange = (e) => {
		const input = e.currentTarget as HTMLInputElement
		quickLinks(null, { style: input.value })
	}

	paramId('i_row').oninput = function (e: Event) {
		const input = e.currentTarget as HTMLInputElement
		quickLinks(null, { row: input.value })
	}

	paramId('b_importbookmarks').onclick = linksImport

	//
	// Dynamic backgrounds

	paramId('i_type').addEventListener('change', function (this: HTMLInputElement) {
		selectBackgroundType(this.value)
	})

	paramId('i_freq').addEventListener('change', function (this: HTMLInputElement) {
		const i_type = paramId('i_type') as HTMLInputElement
		const isCustom = i_type.value === 'custom'

		if (isCustom) {
			localBackgrounds({ freq: this.value })
		} else {
			unsplash(null, { is: 'every', value: this.value })
		}
	})

	paramId('i_refresh').addEventListener('click', function (this: HTMLInputElement) {
		const i_type = paramId('i_type') as HTMLInputElement

		if (this.children[0]) {
			const arrow = this.children[0] as HTMLSpanElement
			const isCustom = i_type.value === 'custom'

			if (isCustom) {
				localBackgrounds({ refresh: arrow })
			} else {
				unsplash(null, { is: 'refresh', button: arrow })
			}
		}

		inputThrottle(this)
	})

	paramId('i_collection').addEventListener('change', function (this: HTMLInputElement) {
		unsplash(null, { is: 'collection', value: stringMaxSize(this.value, 256) })
		this.blur()
	})

	//
	// Custom backgrounds

	paramId('i_bgfile').addEventListener('change', function (this: HTMLInputElement) {
		localBackgrounds({ newfile: this.files || undefined })
	})

	paramId('i_blur').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter('blur', { blur: parseFloat(this.value) }, true)
	})

	paramId('i_bright').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter('bright', { bright: parseFloat(this.value) }, true)
	})

	//
	// Time and date

	paramId('i_time').addEventListener('change', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ time: this.checked }, true)
	})

	paramId('i_analog').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'analog', checked: this.checked })
	})

	paramId('i_seconds').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'seconds', checked: this.checked })
	})

	paramId('i_clockface').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'face', value: this.value })
	})

	paramId('i_clockstyle').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'style', value: this.value })
	})

	paramId('i_ampm').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'ampm', checked: this.checked })
	})

	paramId('i_timezone').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'timezone', value: this.value })
	})

	paramId('i_usdate').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'usdate', checked: this.checked })
	})

	paramId('i_timehide').addEventListener('change', function (this: HTMLInputElement) {
		hideElements({ clock: this.value === 'clock', date: this.value === 'date' }, { isEvent: true })
	})

	//
	// Weather

	const weatherDebounce = debounce(() => weather(null, { is: 'city' }), 1600)

	paramId('i_city').onkeyup = (e: KeyboardEvent) => {
		weatherDebounce()

		if (e.code === 'Enter') {
			weather(null, { is: 'city' })
			weatherDebounce.cancel()
		}
	}

	paramId('i_main').addEventListener('change', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ main: this.checked }, true)
	})

	paramId('i_geol').addEventListener('change', function (this: HTMLInputElement) {
		inputThrottle(this, 1200)
		weather(null, { is: 'geol', checked: this.checked, elem: this })
	})

	paramId('i_units').addEventListener('change', function (this: HTMLInputElement) {
		inputThrottle(this, 1200)
		weather(null, { is: 'units', checked: this.checked })
	})

	paramId('i_forecast').addEventListener('change', function (this: HTMLInputElement) {
		weather(null, { is: 'forecast', value: this.value })
	})

	paramId('i_temp').addEventListener('change', function (this: HTMLInputElement) {
		weather(null, { is: 'temp', value: this.value })
	})

	paramId('i_moreinfo').addEventListener('change', function (this: HTMLInputElement) {
		weather(null, { is: 'moreinfo', value: this.value })
	})

	paramId('i_provider').addEventListener('change', function (this: HTMLInputElement) {
		weather(null, { is: 'provider', value: this.value })
		this.blur()
	})

	paramId('i_weatherhide').addEventListener('change', function (this: HTMLInputElement) {
		let weatherdesc = this.value === 'disabled' || this.value === 'desc'
		let weathericon = this.value === 'disabled' || this.value === 'icon'
		hideElements({ weatherdesc, weathericon }, { isEvent: true })
		weather(null, { is: 'unhide', value: this.value })
	})

	paramId('i_greethide').addEventListener('change', function () {
		hideElements({ greetings: !this.checked }, { isEvent: true })
	})

	paramId('i_greeting').addEventListener('keyup', function () {
		clock(null, { is: 'greeting', value: stringMaxSize(this.value, 32) })
	})

	//
	// Notes

	paramId('i_notes').addEventListener('click', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ notes: this.checked }, true)
	})

	paramId('i_notesalign').addEventListener('change', function (this: HTMLInputElement) {
		notes(null, { is: 'align', value: this.value })
	})

	paramId('i_noteswidth').addEventListener('input', function (this: HTMLInputElement) {
		notes(null, { is: 'width', value: this.value })
	})

	paramId('i_notesopacity').addEventListener('input', function (this: HTMLInputElement) {
		notes(null, { is: 'opacity', value: this.value })
	})

	//
	// Searchbar

	paramId('i_sb').addEventListener('click', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ searchbar: this.checked }, true)
	})

	paramId('i_sbengine').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, { engine: this.value })
	})

	paramId('i_sbopacity').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(null, { opacity: this.value })
	})

	paramId('i_sbrequest').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, { request: this })
	})

	paramId('i_sbnewtab').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, { newtab: this.checked })
	})

	paramId('i_sbplaceholder').addEventListener('keyup', function () {
		searchbar(null, { placeholder: this.value })
	})

	//
	// Quotes

	paramId('i_quotes').addEventListener('click', function (this: HTMLInputElement) {
		toggleWidgetsDisplay({ quotes: this.checked }, true)
	})

	paramId('i_qtfreq').addEventListener('change', function () {
		quotes(null, { frequency: this.value })
	})

	paramId('i_qttype').addEventListener('change', function () {
		quotes(null, { type: this.value })
	})

	paramId('i_qtrefresh').addEventListener('click', function () {
		inputThrottle(this)
		turnRefreshButton(this.children[0] as HTMLSpanElement, true)
		quotes(null, { refresh: true })
	})

	paramId('i_qtauthor').addEventListener('change', function () {
		quotes(null, { author: this.checked })
	})

	paramId('i_qtlist').addEventListener('change', function () {
		quotes(null, { userlist: this.value })
	})

	//
	// Custom fonts

	// Fetches font list only on focus (if font family is default)
	paramId('i_customfont').addEventListener('focus', function () {
		if (settingsDom.querySelector('#dl_fontfamily')?.childElementCount === 0) {
			customFont(null, { autocomplete: settingsDom })
		}
	})

	paramId('i_customfont').addEventListener('change', function () {
		customFont(null, { family: this.value })
	})

	paramId('i_weight').addEventListener('input', function () {
		customFont(null, { weight: this.value })
	})

	paramId('i_size').addEventListener('input', function () {
		customFont(null, { size: this.value })
	})

	paramId('i_textshadow').addEventListener('input', function () {
		textShadow(null, parseFloat(this.value))
	})

	//
	// Custom Style

	paramId('cssEditor').addEventListener('keyup', function (this: Element, ev: Event) {
		customCss(null, { is: 'styling', val: (ev.target as HTMLInputElement).value })
	})

	cssInputSize(paramId('cssEditor'))

	//
	// Settings managment

	const { exportAsFile, copyImportText, importAsText, importAsFile } = settingsMgmt()

	const toggleSettingsMgmt = (toggled: boolean) => {
		clas(paramId('export'), !toggled, 'shown')
		clas(paramId('import'), toggled, 'shown')
		clas(paramClasses('tabs')[0], toggled, 'toggled')
	}

	paramId('s_export').addEventListener('click', () => toggleSettingsMgmt(false))
	paramId('s_import').addEventListener('click', () => toggleSettingsMgmt(true))
	paramId('b_exportfile').addEventListener('click', () => exportAsFile())
	paramId('b_exportcopy').addEventListener('click', (e) => copyImportText(e.target as HTMLButtonElement))
	paramId('i_importfile').addEventListener('change', (e) => importAsFile(e.target as HTMLInputElement))
	paramId('i_importtext').addEventListener('keyup', (e) => importAsText((e.target as HTMLInputElement).value))
	paramId('b_resetconf').addEventListener('click', () => paramsReset('conf'))
	paramId('b_resetyes').addEventListener('click', () => paramsReset('yes'))
	paramId('b_resetno').addEventListener('click', () => paramsReset('no'))
	paramId('b_importtext').addEventListener('click', function () {
		paramsImport(parse(($('i_importtext') as HTMLInputElement).value))
	})

	//
	// A11y tabbing inputs control
	// Expensive way to toggle all inputs tabindex on "params hiding actions" in settings
	function optionsTabIndex() {
		const isAllSettings = paramId('i_showall').checked

		const toggleTabindex = (parent: string, on: boolean) => {
			settingsDom?.querySelectorAll(`${parent} :is(input,  select,  button,  a, textarea)`).forEach((dom) => {
				on ? dom.removeAttribute('tabindex') : dom.setAttribute('tabindex', '-1')
			})
		}

		// If showall, start by enabling .as fields
		if (isAllSettings) {
			toggleTabindex('.as', true)
		}

		// Then control if widgets are on or off
		settingsDom.querySelectorAll('widget-option').forEach((dom) => {
			toggleTabindex('#' + dom.id, has(dom, 'shown'))
		})

		// Disable all "all" settings if off
		if (isAllSettings === false) {
			toggleTabindex('.as', false)
		}

		// Toggle tooltips
		settingsDom.querySelectorAll('.tooltiptext').forEach((dom) => {
			toggleTabindex('.' + dom.classList[1], has(dom, 'shown'))
		})

		// Toggle in-widgets hidden options
		toggleTabindex('#searchbar_request', has(paramId('searchbar_request'), 'shown'))
		toggleTabindex('#weather_provider', has(paramId('weather_provider'), 'shown'))
		toggleTabindex('#quotes_userlist', has(paramId('quotes_userlist'), 'shown'))
		toggleTabindex('#sett_city', paramId('i_geol').checked === false)
		toggleTabindex('#import', has(paramId('import'), 'shown'))
		toggleTabindex('#export', has(paramId('export'), 'shown'))

		// File export downloader is never tabbable
		paramId('downloadfile').setAttribute('tabindex', '-1')
	}

	// On startup
	optionsTabIndex()

	// Add event to specified inputs
	settingsDom.querySelectorAll('.opt-hider').forEach((dom) => {
		dom.addEventListener('input', () => setTimeout(() => optionsTabIndex(), 10))
	})
}

function settingsMgmt() {
	async function copyImportText(target: HTMLButtonElement) {
		try {
			const area = $('area_export') as HTMLInputElement
			await navigator.clipboard.writeText(area.value)
			target.textContent = tradThis('Copied')
			setTimeout(() => {
				const domimport = $('b_exportcopy')
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

		const data = ((await storage.get()) as Sync) ?? {}
		const zero = (n: number) => (n.toString().length === 1 ? '0' + n : n.toString())

		const bytes = new TextEncoder().encode(stringifyOrder(data))
		const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' })
		const date = new Date()
		const YYYYMMDD = date.toISOString().slice(0, 10)
		const HHMMSS = `${zero(date.getHours())}_${zero(date.getMinutes())}_${zero(date.getSeconds())}`

		a.setAttribute('href', URL.createObjectURL(blob))
		a.setAttribute('download', `bonjourr-${data?.about?.version} ${YYYYMMDD} ${HHMMSS}.json`)
		a.click()
	}

	function importAsText(string: string) {
		try {
			parse(string)
			$('b_importtext')?.removeAttribute('disabled')
		} catch (error) {
			$('b_importtext')?.setAttribute('disabled', '')
		}
	}

	function importAsFile(target: HTMLInputElement) {
		function decodeExportFile(str: string) {
			let result = {}

			try {
				// Tries to decode base64 from previous versions
				result = parse(atob(str))
			} catch {
				try {
					// If base64 failed, parse raw string
					result = parse(str)
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
			if (Object.keys(syncDefaults).filter((key) => key in importData).length > 0) {
				paramsImport(importData as Sync)
			}
		}
		reader.readAsText(file)
	}

	return { exportAsFile, copyImportText, importAsText, importAsFile }
}

function cssInputSize(param: Element) {
	setTimeout(() => {
		const cssResize = new ResizeObserver((e) => {
			const rect = e[0].contentRect
			customCss(null, { is: 'resize', val: rect.height + rect.top * 2 })
		})
		cssResize.observe(param)
	}, 400)
}

function changelogControl(settingsDom: HTMLElement) {
	const domshowsettings = document.querySelector('#showSettings')
	const domchangelog = settingsDom.querySelector('#changelogContainer')

	if (!domchangelog) return

	clas(domchangelog, true, 'shown')
	clas(domshowsettings, true, 'hasUpdated')

	const dismiss = () => {
		clas(domshowsettings, false, 'hasUpdated')
		domchangelog.className = 'dismissed'
		localStorage.removeItem('hasUpdated')
	}

	const loglink = settingsDom.querySelector('#link') as HTMLAnchorElement
	const logdismiss = settingsDom.querySelector('#log_dismiss') as HTMLButtonElement

	loglink.onclick = () => dismiss()
	logdismiss.onclick = () => dismiss()
}

function translatePlaceholders(settingsDom: HTMLElement | null) {
	if (!settingsDom) {
		return
	}

	const cases = [
		['#i_title', 'Name'],
		['#i_greeting', 'Name'],
		['#i_tabtitle', 'New tab'],
		['#i_sbrequest', 'Search query: %s'],
		['#i_sbplaceholder', 'Search'],
		['#cssEditor', 'Type in your custom CSS'],
		['#i_importtext', 'or paste as text'],
	]

	for (const [id, text] of cases) {
		settingsDom.querySelector(id)?.setAttribute('placeholder', tradThis(text))
	}
}

async function switchLangs(nextLang: Langs) {
	await toggleTraduction(nextLang)

	sessionStorage.lang = nextLang // Session pour le weather
	storage.set({ lang: nextLang })
	document.documentElement.setAttribute('lang', nextLang)

	const data = ((await storage.get()) as Sync) ?? {}
	data.lang = nextLang
	weather(data)
	clock(data)
	quotes(data)
	notes(data.notes || null)
	translatePlaceholders(document.getElementById('settings'))
}

function showall(val: boolean, event: boolean, settingsDom?: HTMLElement) {
	if (event) storage.set({ showall: val })

	const settings = settingsDom || $('settings')
	clas(settings, val, 'all')
}

async function selectBackgroundType(cat: string) {
	$('custom')?.setAttribute('style', `display: ${cat === 'custom' ? 'block' : 'none'}`)
	document.querySelector('.as_collection')?.setAttribute('style', `display: ${cat === 'custom' ? 'none' : 'block'}`)

	if (cat === 'custom') {
		localBackgrounds({ thumbnail: document.getElementById('settings') as HTMLElement })
		setTimeout(() => localBackgrounds(), 100)
	}

	if (cat === 'dynamic') {
		const { dynamic } = ((await storage.get()) as Sync) ?? {}
		if (!dynamic) return

		document.querySelector<HTMLSelectElement>('#i_freq')!.value = dynamic.every || 'hour'
		document.getElementById('creditContainer')?.classList.toggle('shown', true)
		setTimeout(() => unsplash(dynamic), 100)
	}

	storage.set({ background_type: cat })
}

function signature(dom: HTMLElement) {
	const spans = dom.querySelectorAll<HTMLSpanElement>('#rand span')
	const as = dom.querySelectorAll<HTMLAnchorElement>('#rand a')
	const us = [
		{ href: 'https://victr.me/', name: 'Victor Azevedo' },
		{ href: 'https://tahoe.be/', name: 'Tahoe Beetschen' },
	]

	if (Math.random() > 0.5) us.reverse()

	spans[0].textContent = `${tradThis('by')} `
	spans[1].textContent = ` & `

	as.forEach((a, i) => {
		a.href = us[i].href
		a.textContent = us[i].name
	})

	const version = dom.querySelector('.version a')
	if (version) version.textContent = syncDefaults.about.version

	// Remove donate text on safari because apple is evil
	if (testOS.ios || detectPlatform() === 'safari') dom.querySelector('#rdv_website')?.remove()
}

function fadeOut() {
	const dominterface = $('interface')!
	dominterface.click()
	dominterface.style.transition = 'opacity .4s'
	setTimeout(() => (dominterface.style.opacity = '0'))
	setTimeout(() => location.reload(), 400)
}

async function paramsImport(toImport: Sync) {
	try {
		// Load all sync & dynamicCache
		let data = ((await storage.get()) as Sync) ?? {}

		// Remove user collection cache if collection change
		// if (sync.dynamic && toImport.dynamic) {
		// 	if (sync.dynamic?.collection !== toImport.dynamic?.collection) {
		// 		local.dynamicCache.user = []
		// 	}
		// }

		data = { ...filterImports(data, toImport) }

		storage.clear()
		storage.set(data, () => fadeOut())
	} catch (e) {
		console.log(e)
	}
}

function paramsReset(action: 'yes' | 'no' | 'conf') {
	if (action === 'yes') {
		deleteBrowserStorage()
		fadeOut()
		return
	}

	document.getElementById('reset_first')?.classList.toggle('shown', action === 'no')
	document.getElementById('reset_conf')?.classList.toggle('shown', action === 'conf')
}

export async function updateExportJSON(settingsDom: HTMLElement) {
	const input = settingsDom.querySelector('#area_export') as HTMLInputElement

	settingsDom.querySelector('#importtext')?.setAttribute('disabled', '') // because cannot export same settings

	const data = ((await storage.get()) as Sync) ?? {}

	if (data?.weather?.lastCall) delete data.weather.lastCall
	data.about.browser = detectPlatform()

	input.value = stringifyOrder(data)
}

export function settingsInit(data: Sync) {
	function settingsCreator(html: string) {
		const domshowsettings = $('showSettings')
		const dominterface = $('interface')
		const domedit = $('editlink')

		const parser = new DOMParser()
		const settingsDom = document.createElement('aside')
		const contentList = parser.parseFromString(html, 'text/html').body.childNodes

		settingsDom.id = 'settings'
		settingsDom.setAttribute('class', 'init')
		Object.values(contentList).forEach((elem) => settingsDom.appendChild(elem))

		traduction(settingsDom, data.lang)
		signature(settingsDom)
		initParams(data, settingsDom)
		showall(data.showall, false, settingsDom)

		document.body.appendChild(settingsDom) // Apply to body

		//
		// Events
		//

		// On settings changes, update export code
		const isOnline = detectPlatform() === 'online'
		const storageUpdate = () => updateExportJSON($('settings') as HTMLElement)
		const unloadUpdate = () => chrome.storage.onChanged.removeListener(storageUpdate)

		if (isOnline) {
			window.addEventListener('storage', storageUpdate)
		} else {
			chrome.storage.onChanged.addListener(storageUpdate)
			window.addEventListener('beforeunload', unloadUpdate, { once: true })
		}

		function toggleDisplay(dom: HTMLElement) {
			const isClosed = !has(dom, 'shown')

			clas(dom, false, 'init')
			clas(dom, isClosed, 'shown')

			clas(domshowsettings, isClosed, 'shown')
			clas(domedit, isClosed, 'pushed')

			clas(dominterface, isClosed, 'pushed')
			settingsDom.style.removeProperty('transform')
			settingsDom.style.removeProperty('transition')
		}

		$('skiptosettings')?.addEventListener('click', function () {
			toggleDisplay(settingsDom)
			settingsDom.scrollTo({ top: 0 })

			setTimeout(() => {
				const showall = settingsDom.querySelector('#i_showall') as HTMLButtonElement
				showall.focus()
			}, 10)
		})

		domshowsettings?.addEventListener('click', function () {
			toggleDisplay(settingsDom)
		})

		document.onkeydown = function (e) {
			if (e.altKey && e.code === 'KeyS') {
				getBrowserStorage()
			}

			if (e.code === 'Escape') {
				has($('editlink'), 'shown') ? closeEditLink() : toggleDisplay(settingsDom) // Opens menu when pressing "Escape"
				return
			}

			if (e.code === 'Tab') {
				clas(document.body, true, 'tabbing') // Shows input outline when using tab
				return
			}

			if ($('error') && e.ctrlKey) {
				return // do nothing if pressing ctrl or if there's an error message
			}
		}

		window.addEventListener('click', function (e) {
			const path = e.composedPath()
			const clicksOnEdit = path.filter((d: EventTarget) => (d as HTMLElement).id === 'editlink').length > 0

			if (!clicksOnEdit && has($('editlink'), 'shown')) {
				closeEditLink() // hides edit menu
			}
		})

		dominterface?.addEventListener('click', function (e) {
			const pathIds = e.composedPath().map((d) => (d as HTMLElement).id)
			if (pathIds.includes('linkblocks') || pathIds.includes('element-mover')) {
				return // Do nothing if links or element mover are clicked
			}

			if (document.body.classList.contains('tabbing')) {
				clas(document.body, false, 'tabbing') // Removes tabbing class on click
			}

			// Close menu when clicking anywhere on interface
			if (has(settingsDom, 'shown')) {
				toggleDisplay(settingsDom)
			}
		})

		//
		// Mobile settings height control

		function responsiveSettingsHeightDrag() {
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
				if (testOS.windows || testOS.android) {
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
					toggleDisplay(settingsDom)
				}
			}

			settingsDom.querySelector('#mobile-drag-zone')?.addEventListener('touchstart', dragStart)
			settingsDom.querySelector('#mobile-drag-zone')?.addEventListener('mousedown', dragStart)
			settingsDom.querySelector('#mobile-drag-zone')?.addEventListener('touchend', dragEnd)
			settingsDom.querySelector('#mobile-drag-zone')?.addEventListener('mouseup', dragEnd)

			document.body?.addEventListener('mouseleave', (e) => {
				if (has(settingsDom, 'shown') && window.innerWidth < 600) {
					dragEnd(e)
				}
			})
		}

		const DrawerDragDebounce = debounce(() => {
			;(document.querySelector('.signature') as HTMLDivElement).style.removeProperty('padding')
			responsiveSettingsHeightDrag()
		}, 600)

		window.addEventListener('resize', () => {
			DrawerDragDebounce()

			// removes transition to prevent weird movement when changing to mobile styling
			// /!\ this is dependent on toggleDisplay() to remove inline styling /!\
			if (!settingsDom.style.transition) {
				settingsDom.style.transition = 'none'
			}
		})

		responsiveSettingsHeightDrag()
	}

	fetch('settings.html').then((resp) => resp.text().then(settingsCreator))
}
