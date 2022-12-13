import debounce from 'lodash.debounce'
import throttle from 'lodash.throttle'

import { dict, langList } from './lang'
import { Sync } from './types/sync'
import { Local } from './types/local'

import storage from './storage'

import {
	$,
	has,
	clas,
	tradThis,
	bundleLinks,
	inputThrottle,
	detectPlatform,
	closeEditLink,
	mobilecheck,
	randomString,
	stringMaxSize,
	deleteBrowserStorage,
	translateNotesText,
	getBrowserStorage,
	turnRefreshButton,
	testOS,
	syncDefaults,
} from './utils'

import {
	backgroundFilter,
	notes,
	clock,
	customCss,
	customFont,
	darkmode,
	favicon,
	hideElem,
	linksImport,
	localBackgrounds,
	modifyWeightOptions,
	quickLinks,
	quotes,
	safeFont,
	searchbar,
	tabTitle,
	textShadow,
	traduction,
	unsplash,
	weather,
} from './index'

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

	initInput('i_blur', data.background_blur?.toString() || 15)
	initInput('i_bright', data.background_bright?.toString() || 0.8)
	initInput('cssEditor', data.css || '')
	initInput('i_row', data.linksrow || 8)
	initInput('i_linkstyle', data.linkstyle || 'default')
	initInput('i_type', data.background_type || 'dynamic')
	initInput('i_freq', whichFreq || whichFreqDefault)
	initInput('i_dark', data.dark || 'system')
	initInput('i_favicon', data.favicon || '')
	initInput('i_tabtitle', data.tabtitle || '')
	initInput('i_greeting', data.greeting || '')
	initInput('i_textshadow', data.textShadow?.toString() || 0.2)
	initInput('i_notesopacity', data.notes?.opacity || 0.1)
	initInput('i_notesalign', data.notes?.align || 'left')
	initInput('i_textshadow', data.textShadow || 0.2)
	initInput('i_sbengine', data.searchbar?.engine || 'google')
	initInput('i_sbopacity', data.searchbar?.opacity || 0.1)
	initInput('i_sbrequest', data.searchbar?.request || '')
	initInput('i_qtfreq', data.quotes?.frequency || 'day')
	initInput('i_qttype', data.quotes?.type || 'classic')
	initInput('i_qtlist', JSON.stringify(data.quotes?.customList) || '')
	initInput('i_clockface', data.clock?.face || 'none')
	initInput('i_timezone', data.clock?.timezone || 'auto')
	initInput('i_collection', data.dynamic?.collection || '')
	initInput('i_ccode', data.weather?.ccode || 'US')
	initInput('i_forecast', data.weather?.forecast || 'auto')
	initInput('i_temp', data.weather?.temperature || 'actual')
	initInput('i_customfont', data.font?.family || '')
	initInput('i_weight', data.font?.weight || '300')
	initInput('i_size', data.font?.size || (mobilecheck() ? 11 : 14))

	initCheckbox('i_showall', data.showall)
	initCheckbox('i_quicklinks', data.quicklinks)
	initCheckbox('i_linknewtab', data.linknewtab)
	initCheckbox('i_usdate', data.usdate)
	initCheckbox('i_geol', typeof data.weather?.location !== 'boolean')
	initCheckbox('i_units', data.weather?.unit === 'imperial' || false)
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

	// quick links
	clas(paramId('quicklinks_options'), data.quicklinks, 'shown')

	// Hide elems
	hideElem(null, { is: 'buttons', buttonList: settingsDom.querySelectorAll<HTMLButtonElement>('#hideelem button') })

	// Font family default
	safeFont(settingsDom)

	// Fetches font list if font is not default
	// to prevent forced reflow when appending to visible datalist dom
	if (data.font?.family !== '') customFont(null, { is: 'autocomplete', elem: settingsDom })

	// Font weight
	if (data.font?.availWeights?.length > 0) modifyWeightOptions(data.font.availWeights, settingsDom)

	// Backgrounds options init
	if (data.background_type === 'custom') {
		paramId('custom').setAttribute('style', 'display: block')
		settingsDom.querySelector('.as_collection')?.setAttribute('style', 'display: none')
		localBackgrounds(null, { is: 'thumbnail', settings: settingsDom })
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

	// Text field display settings
	clas(paramId('notes_options'), data.notes?.on || false, 'shown')

	// Searchbar display settings
	clas(paramId('searchbar_options'), data.searchbar?.on, 'shown')
	clas(paramId('searchbar_request'), data.searchbar?.engine === 'custom', 'shown')

	// CSS height control
	if (data.cssHeight) {
		paramId('cssEditor').setAttribute('style', 'height: ' + data.cssHeight + 'px')
	}

	// Quotes option display
	clas(paramId('quotes_options'), data.quotes?.on, 'shown')

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

	paramId('i_greeting').addEventListener('keyup', function () {
		clock(null, { is: 'greeting', value: stringMaxSize(this.value, 32) })
	})

	paramId('i_favicon').addEventListener('input', function () {
		favicon(null, this)
	})

	paramId('i_tabtitle').addEventListener('input', function () {
		tabTitle(null, this)
	})

	paramId('i_dark').addEventListener('change', function () {
		darkmode(this.value as 'auto' | 'system' | 'enable' | 'disable', true)
	})

	paramId('hideelem')
		.querySelectorAll('button')
		.forEach((elem: HTMLButtonElement) => {
			elem.onclick = function () {
				elem.classList.toggle('clicked')
				hideElem(null, { is: 'hide', button: elem })
			}
		})

	//
	// Quick links

	paramId('i_quicklinks').addEventListener('change', function (this: HTMLInputElement) {
		quickLinks(null, { is: 'toggle', checked: this.checked })
	})

	const submitLinkFunc = throttle(() => quickLinks(null, { is: 'add' }), 1200)

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
		quickLinks(null, { is: 'newtab', checked: input.checked })
	}

	paramId('i_linkstyle').onchange = (e) => {
		const input = e.currentTarget as HTMLInputElement
		quickLinks(null, { is: 'style', value: input.value })
	}

	paramId('i_row').oninput = function (e: Event) {
		const input = e.currentTarget as HTMLInputElement
		quickLinks(null, { is: 'row', value: input.value })
	}

	paramId('b_importbookmarks').onclick = linksImport

	//
	// Dynamic backgrounds

	paramId('i_type').addEventListener('change', function (this: HTMLInputElement) {
		selectBackgroundType(this.value)
	})

	paramId('i_freq').addEventListener('change', function (this: HTMLInputElement) {
		const i_type = paramId('i_type') as HTMLInputElement

		if (i_type.value === 'custom') storage.sync.set({ custom_every: this.value })
		else unsplash(null, { is: 'every', value: this.value })
	})

	paramId('i_refresh').addEventListener('click', function (this: HTMLInputElement) {
		const i_type = paramId('i_type') as HTMLInputElement

		if (this.children[0]) {
			const arrow = this.children[0] as HTMLSpanElement
			const event = { is: 'refresh', button: arrow }

			i_type.value === 'custom' ? localBackgrounds(null, event) : unsplash(null, event)
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
		localBackgrounds(null, { is: 'newfile', file: this.files || undefined })
	})

	paramId('i_blur').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter('blur', { blur: parseFloat(this.value) }, true)
	})

	paramId('i_bright').addEventListener('input', function (this: HTMLInputElement) {
		backgroundFilter('bright', { bright: parseFloat(this.value) }, true)
	})

	//
	// Time and date

	paramId('i_analog').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'analog', checked: this.checked })
	})

	paramId('i_seconds').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'seconds', checked: this.checked })
	})

	paramId('i_clockface').addEventListener('change', function (this: HTMLInputElement) {
		clock(null, { is: 'face', value: this.value })
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

	//
	// Text field

	paramId('i_notes').addEventListener('change', function (this: HTMLInputElement) {
		notes(null, { is: 'toggle', value: this.checked.toString() })
	})

	paramId('i_notesalign').addEventListener('change', function (this: HTMLInputElement) {
		notes(null, { is: 'align', value: this.value })
	})

	paramId('i_notesopacity').addEventListener('input', function (this: HTMLInputElement) {
		notes(null, { is: 'opacity', value: this.value })
	})

	//
	// Searchbar

	paramId('i_sb').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, 'searchbar', this)
	})

	paramId('i_sbengine').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, 'engine', this)
	})

	paramId('i_sbopacity').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(null, 'opacity', this)
	})

	paramId('i_sbrequest').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, 'request', this)
	})

	paramId('i_sbnewtab').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(null, 'newtab', this)
	})

	//
	// Quotes

	paramId('i_quotes').addEventListener('change', function () {
		quotes(null, { is: 'toggle', checked: this.checked })
	})

	paramId('i_qtfreq').addEventListener('change', function () {
		quotes(null, { is: 'frequency', value: this.value })
	})

	paramId('i_qttype').addEventListener('change', function () {
		quotes(null, { is: 'type', value: this.value })
	})

	paramId('i_qtrefresh').addEventListener('click', function () {
		inputThrottle(this)
		turnRefreshButton(this.children[0] as HTMLSpanElement, true)
		quotes(null, { is: 'refresh' })
	})

	paramId('i_qtauthor').addEventListener('change', function () {
		quotes(null, { is: 'author', checked: this.checked })
	})

	paramId('i_qtlist').addEventListener('change', function () {
		quotes(null, { is: 'customlist', value: this.value })
	})

	//
	// Custom fonts

	// Fetches font list only on focus (if font family is default)
	paramId('i_customfont').addEventListener('focus', function () {
		if (settingsDom.querySelector('#dl_fontfamily')?.childElementCount === 0) {
			customFont(null, { is: 'autocomplete', elem: settingsDom })
		}
	})

	paramId('i_customfont').addEventListener('change', function () {
		customFont(null, { is: 'family', value: this.value })
	})

	paramId('i_weight').addEventListener('input', function () {
		customFont(null, { is: 'weight', value: this.value })
	})

	paramId('i_size').addEventListener('input', function () {
		customFont(null, { is: 'size', value: this.value })
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
		paramsImport(JSON.parse(($('i_importtext') as HTMLInputElement).value))
	})

	//
	// A11y tabbing inputs control
	// Expensive way to toggle all inputs tabindex on "params hiding actions" in settings
	const allHidingInputs =
		'#i_showall, .tooltip, #i_quicklinks, #i_geol, #i_notes, #i_sb, #i_sbengine, #i_quotes, #s_export, #s_import'

	function controlInputTabbability() {
		const toggleTabindex = (parent: string, on: boolean) => {
			settingsDom?.querySelectorAll(`${parent} :is(input,  select,  button,  a, textarea)`).forEach((dom) => {
				on ? dom.removeAttribute('tabindex') : dom.setAttribute('tabindex', '-1')
			})
		}

		const isAllSettings = paramId('i_showall').checked

		if (isAllSettings) {
			toggleTabindex('.as', true) // If showall, start by enabling .as fields
		}

		settingsDom // Then control if features are on or off
			.querySelectorAll('#quicklinks_options, #searchbar_options, #quotes_options, #notes_options')
			.forEach((dom) => toggleTabindex('#' + dom.id, has(dom, 'shown')))

		if (isAllSettings === false) {
			toggleTabindex('.as', false) // Disable all "all" settings if off
		}

		settingsDom.querySelectorAll('.tooltiptext').forEach((dom) => {
			toggleTabindex('.' + dom.classList[1], has(dom, 'shown'))
		})

		toggleTabindex('#searchbar_request', has(paramId('searchbar_request'), 'shown'))
		toggleTabindex('#sett_city', paramId('i_geol').checked === false)
		toggleTabindex('#import', has(paramId('import'), 'shown'))
		toggleTabindex('#export', has(paramId('export'), 'shown'))

		// File export downloader is never tabbable
		paramId('downloadfile').setAttribute('tabindex', '-1')
	}

	// On startup
	controlInputTabbability()

	// Add event to specified inputs
	settingsDom.querySelectorAll(allHidingInputs).forEach((dom) => {
		dom.addEventListener('click', () => setTimeout(() => controlInputTabbability(), 10))
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

	function exportAsFile() {
		const a = $('downloadfile')
		if (!a) return

		storage.sync.get(null, (data) => {
			const bytes = new TextEncoder().encode(JSON.stringify(data))
			const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' })

			a.setAttribute('href', URL.createObjectURL(blob))
			a.setAttribute('download', `bonjourrExport-${data?.about?.version}-${randomString(6)}.json`)
			a.click()
		})
	}

	function importAsText(string: string) {
		try {
			JSON.parse(string)
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
				result = JSON.parse(atob(str))
			} catch {
				try {
					// If base64 failed, parse raw string
					result = JSON.parse(str)
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
		['#cssEditor', 'Type in your custom CSS'],
		['#i_importtext', 'or paste as text'],
	]

	cases.forEach(([domId, text]) => {
		const input = settingsDom.querySelector(domId) as HTMLInputElement
		input.setAttribute('placeholder', tradThis(text))
	})
}

function switchLangs(nextLang: Langs) {
	function langSwitchTranslation(langs: { current: Langs; next: Langs }) {
		// On 'en' lang, get the dict key, not one of its values
		// create dict like object to parse through
		// switchDict is: {{'hello': 'bonjour'}, {'this is a test': 'ceci est un test'} ...}

		const getLangList = (l: Langs) => {
			return l === 'en' ? Object.keys(dict) : Object.values(dict).map((t) => t[l])
		}

		const { current, next } = langs
		const nextList = getLangList(next)
		const currentList = getLangList(current)
		let switchDict: Record<string, string> = {}

		currentList.forEach((curr, i) => (switchDict[curr] = nextList[i]))

		document.querySelectorAll('.trn').forEach((trn) => {
			if (typeof trn.textContent === 'string') {
				trn.textContent = switchDict[trn.textContent]
			}
		})
	}

	// This forces lang="" tag to be a valid lang code
	function isValidLang(val: string): val is Langs {
		return Object.keys(langList).includes(val)
	}

	const htmllang = document.documentElement.getAttribute('lang') || 'en'
	const langs = {
		current: isValidLang(htmllang) ? htmllang : 'en',
		next: nextLang,
	}

	sessionStorage.lang = nextLang // Session pour le weather
	storage.sync.set({ lang: nextLang })
	document.documentElement.setAttribute('lang', nextLang)

	storage.sync.get(null, (data) => {
		data.lang = nextLang
		langSwitchTranslation(langs)
		translatePlaceholders($('settings'))
		weather(data as Sync)
		clock(data as Sync)

		if (data.notes?.text) {
			const value = translateNotesText(nextLang, langs.current, data.notes.text)
			document.querySelector<HTMLInputElement>('#notes_editor')!.value = value
			notes(null, { is: 'change', value })
		}

		if (data.quotes?.type === 'classic') {
			localStorage.removeItem('nextQuote')
			localStorage.removeItem('currentQuote')
			quotes(data as Sync)
		}
	})
}

function showall(val: boolean, event: boolean, settingsDom?: HTMLElement) {
	if (event) storage.sync.set({ showall: val })

	const settings = settingsDom || $('settings')
	clas(settings, val, 'all')
}

function selectBackgroundType(cat: string) {
	function toggleType(sync: Sync, local: Local) {
		$('custom')?.setAttribute('style', `display: ${cat === 'custom' ? 'block' : 'none'}`)
		document.querySelector('.as_collection')?.setAttribute('style', `display: ${cat === 'custom' ? 'none' : 'block'}`)

		// Only apply fade out/in if there are local backgrounds
		// No local ? no reason to fade to black or show no thumbnails
		// Just stick to unsplash

		if (cat === 'custom' && local.selectedId !== '') {
			localBackgrounds(null, { is: 'thumbnail', settings: $('settings') || undefined })
			setTimeout(
				() =>
					localBackgrounds({
						every: sync.custom_every,
						time: sync.custom_time,
					}),
				400
			)
		}

		if (cat === 'dynamic') {
			clas($('creditContainer'), true, 'shown')

			if (local.selectedId !== '') {
				setTimeout(() => unsplash(sync), 400)
			}
		}

		const c_every = sync.custom_every || 'pause'
		const d_every = sync.dynamic.every || 'hour'

		$('i_freq')?.setAttribute('value', cat === 'custom' ? c_every : d_every) // Setting frequence input

		storage.sync.set({ background_type: cat })
	}

	storage.local.get('selectedId', (local) => {
		storage.sync.get(['custom_every', 'custom_time', 'dynamic'], (sync) => {
			toggleType(sync as Sync, local as Local)
		})
	})
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
	dominterface.style.opacity = '0'
	setTimeout(() => location.reload(), 400)
}

function paramsImport(dataToImport: Sync) {
	try {
		// Load all sync & dynamicCache
		storage.sync.get(null, (sync) => {
			storage.local.get('dynamicCache', (local) => {
				//
				const newImport = dataToImport

				// Remove user collection cache if collection change
				if (sync.dynamic && newImport.dynamic) {
					if (sync.dynamic?.collection !== newImport.dynamic?.collection) {
						local.dynamicCache.user = []
					}
				}

				// Delete current links on imports containing links somewhere
				// to avoid duplicates
				if ((newImport.links as [])?.length > 0 || bundleLinks(newImport)?.length > 0) {
					bundleLinks(sync as Sync).forEach((elem: Link) => {
						delete sync[elem._id]
					})
				}

				sync = { ...sync, ...newImport }

				// full import on Online is through "import" field // Must clear, if not, it can add legacy data
				storage.sync.clear()
				storage.sync.set(sync, () => storage.local.set(local))

				sessionStorage.isImport = true // to separate import and new version startup

				fadeOut()
			})
		})
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

	clas($('reset_first'), action === 'no', 'shown')
	clas($('reset_conf'), action === 'conf', 'shown')
}

export function updateExportJSON(settingsDom?: HTMLElement) {
	if (!settingsDom && !$('settings')) {
		return false
	}

	const dom = settingsDom || $('settings')
	const input = dom?.querySelector('#area_export') as HTMLInputElement

	dom?.querySelector('#importtext')?.setAttribute('disabled', '') // because cannot export same settings

	storage.sync.get(null, (data) => {
		if (data.weather && data.weather.lastCall) delete data.weather.lastCall
		if (data.weather && data.weather.forecastLastCall) delete data.weather.forecastLastCall
		data.about.browser = detectPlatform()

		const prettified = JSON.stringify(data, null, '\t')

		input.value = prettified
	})
}

export function settingsInit(data: Sync) {
	function settingsCreator(html: string) {
		const domshowsettings = $('showSettings')
		const dominterface = $('interface')
		const domedit = $('editlink')

		const parser = new DOMParser()
		const settingsDom = document.createElement('aside')
		const contentList = [...parser.parseFromString(html, 'text/html').body.childNodes]

		settingsDom.id = 'settings'
		settingsDom.setAttribute('class', 'init')
		contentList.forEach((elem) => settingsDom.appendChild(elem))

		traduction(settingsDom, data.lang)
		signature(settingsDom)
		initParams(data, settingsDom)
		showall(data.showall, false, settingsDom)

		document.body.appendChild(settingsDom) // Apply to body

		//
		// Events
		//

		// On settings changes, update export code
		detectPlatform() === 'online'
			? (window.onstorage = () => updateExportJSON())
			: chrome.storage.onChanged.addListener(() => updateExportJSON())

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
			if (e.composedPath().filter((d) => (d as HTMLElement).id === 'linkblocks').length > 0) {
				return // Do nothing if links are clicked
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

		window.addEventListener('resize', (e) => {
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
