import { darkmode, favicon, pageControl, tabTitle, textShadow } from './features/others.ts'
import { initSupportersSettingsNotif, supportersNotifications } from './features/supporters.ts'
import { customFont, fontIsAvailableInSubset, systemfont } from './features/fonts.ts'
import { backgroundUpdate, initBackgroundOptions, toggleMuteStatus } from './features/backgrounds/index.ts'
import { changeGroupTitle, initGroups } from './features/links/groups.ts'
import { synchronization } from './features/synchronization/index.ts'
import { interfacePopup } from './features/popup.ts'
import { moveElements } from './features/move/index.ts'
import { hideElements } from './features/hide.ts'
import { linksImport } from './features/links/bookmarks.ts'
import { quickLinks } from './features/links/index.ts'
import { searchbar } from './features/searchbar.ts'
import { weather } from './features/weather/index.ts'
import { quotes } from './features/quotes.ts'
import { notes } from './features/notes.ts'
import { clock } from './features/clock/index.ts'
import { pomodoro, setModeGlider } from './features/pomodoro.ts'
import { togglePomodoroFocus } from './features/pomodoro.ts'
import { openSettingsButtonEvent } from './features/contextmenu.ts'

import { colorInput, fadeOut, inputThrottle, turnRefreshButton, webkitRangeTrackColor } from './shared/dom.ts'
import { BROWSER, IS_MOBILE, PLATFORM, SYNC_DEFAULT } from './defaults.ts'
import { toggleTraduction, tradThis, traduction } from './utils/translations.ts'
import { settingsNotifications } from './utils/notifications.ts'
import { getPermissions } from './utils/permissions.ts'
import { opacityFromHex } from './shared/generic.ts'
import { loadCallbacks } from './utils/onsettingsload.ts'
import { onclickdown } from 'clickdown/mod'
import { filterData } from './compatibility/apply.ts'
import { stringify } from './utils/stringify.ts'
import { debounce } from './utils/debounce.ts'
import { langList } from './langs.ts'
import { storage } from './storage.ts'
import { parse } from './utils/parse.ts'

import type { Langs } from '../types/shared.ts'
import type { Sync } from '../types/sync.ts'
import type { Local } from '../types/local.ts'

// Initialization

let settingsInitSync: Sync
let settingsInitLocal: Local

export function settingsInit(sync: Sync, local: Local) {
	const showsettings = document.getElementById('show-settings')

	settingsInitSync = sync
	settingsInitLocal = local

	document.addEventListener('updateSettingsBeforeInit', (e) => {
		settingsInitSync = (e as CustomEvent).detail
	})

	document.body?.addEventListener('keydown', settingsInitEvent)
	showsettings?.addEventListener('pointerdown', settingsInitEvent)

	const openSettingsButtonsFromContextMenu = document.body.querySelectorAll<HTMLButtonElement>(
		`[data-action="openTheseSettings"]`,
	)

	openSettingsButtonsFromContextMenu.forEach((btn) => {
		btn?.addEventListener('pointerdown', settingsInitEvent)
	})
}

function settingsInitEvent(event: Event) {
	const showsettings = document.getElementById('show-settings')
	const settings = document.getElementById('settings')

	// 1. When to load settings

	const settingsAreHidden = settings?.classList.contains('hidden')
	const isLeftClick = (event as PointerEvent)?.button === 0
	const isEscape = (event as KeyboardEvent)?.code === 'Escape'
	const canOpenSettings = settingsAreHidden && (isEscape || isLeftClick)

	if (!canOpenSettings) {
		return
	}

	// 2. To apply now

	const local = settingsInitLocal
	const sync = settingsInitSync

	settings?.removeAttribute('style')
	settings?.classList.remove('hidden')
	document.dispatchEvent(new Event('settings'))

	document.addEventListener(
		'toggle-settings',
		((e: CustomEvent) => {
			settingsToggle(e)
		}) as EventListener,
	)

	// if init by touch, opens settings right away
	if ((event as PointerEvent).pointerType === 'touch') {
		// tricks the browser into thinking it's not the same event that inits and opens
		setTimeout(() => {
			// when requesting specific settings section
			if ((event.target as HTMLElement).getAttribute('data-attribute')) {
				openSettingsButtonEvent(event)
			} else {
				document.dispatchEvent(new CustomEvent('toggle-settings'))
			}
		}, 0)
	}

	document.body?.removeEventListener('keydown', settingsInitEvent)
	showsettings?.removeEventListener('pointerdown', settingsInitEvent)

	showall(sync.showall, false)
	traduction(settings, sync.lang)
	translatePlaceholders()
	initBackgroundOptions(sync, local)
	initSupportersSettingsNotif(sync)
	initOptionsValues(sync, local)
	initOptionsEvents()
	settingsFooter()

	// 3. Can be deferred

	setTimeout(() => {
		initWorldClocksAndTimezone(sync)
		updateSettingsJson(sync)
		updateSettingsEvent()
		translateAriaLabels()
		settingsDrawerBar()
		loadCallbacks()

		settings?.classList.remove('init')
	}, 500)
}

function settingsToggle(event?: CustomEvent) {
	const domshowsettings = document.getElementById('show-settings')
	const dominterface = document.getElementById('interface')
	const domsettings = document.getElementById('settings')
	const domedit = document.getElementById('editlink')
	const isClosed = domsettings?.classList.contains('shown') === false

	const scrollTo = event?.detail?.scrollTo ?? false
	const target = domsettings?.querySelector(scrollTo)

	// scrolls requested section into view
	if (target && domsettings) {
		// starts scrolling only once the settings have been rendered (otherwise starts full animation again even if unnecessary)
		requestAnimationFrame(() => {
			setTimeout(() => {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}, 0)
		})
	}

	// prevents closing if a scrollTo has been requested
	if (!isClosed && scrollTo) return

	domsettings?.classList.toggle('shown', isClosed)
	domedit?.classList.toggle('pushed', isClosed)
	dominterface?.classList.toggle('pushed', isClosed)
	domshowsettings?.classList.toggle('shown', isClosed)

	domsettings?.style.removeProperty('transform')
	domsettings?.style.removeProperty('transition')
	document.dispatchEvent(new Event('close-edit'))
}

function initOptionsValues(data: Sync, local: Local) {
	const domsettings = document.getElementById('settings') as HTMLElement
	const userQuotes = data.quotes?.userlist?.[0] ? data.quotes?.userlist : undefined

	setInput('i_blur', data.backgrounds.blur ?? 15)
	setInput('i_bright', data.backgrounds.bright ?? 0.8)
	setInput('i_fadein', data.backgrounds.fadein ?? 400)
	setInput('i_row', data.linksrow || 8)
	setInput('i_icon_radius', data.linkiconradius || 1.1)
	setInput('i_linkstyle', data.linkstyle || 'default')
	setInput('i_type', data.backgrounds.type || 'images')
	setInput('i_freq', data.backgrounds?.frequency || 'hour')
	setInput('i_dark', data.dark || 'system')
	setInput('i_favicon', data.favicon ?? '')
	setInput('i_tabtitle', data.tabtitle ?? '')
	setInput('i_solid-background', data.backgrounds.color ?? '#185A63')
	setInput('i_texture', data.backgrounds.texture.type ?? 'none')
	setInput('i_texture-size', data.backgrounds.texture.size ?? '220')
	setInput('i_texture-opacity', data.backgrounds.texture.opacity ?? '0.1')
	setInput('i_texture-color', data.backgrounds.texture.color ?? '#ffffff')
	setInput('i_pagewidth', data.pagewidth || 1600)
	setInput('i_pagegap', data.pagegap ?? 1)
	setInput('i_dateformat', data.dateformat || 'eu')
	setInput('i_greeting', data.greeting ?? '')
	setInput('i_greetmorning', data.greetingscustom?.morning ?? '')
	setInput('i_greetafternoon', data.greetingscustom?.afternoon ?? '')
	setInput('i_greetevening', data.greetingscustom?.evening ?? '')
	setInput('i_greetnight', data.greetingscustom?.night ?? '')
	setInput('i_textshadow', data.textShadow ?? 0.2)
	setInput('i_noteswidth', data.notes?.width || 50)
	setInput('i_notes-opacity', opacityFromHex(data.notes?.background ?? '#fff2'))
	setInput('i_notesalign', data.notes?.align || 'left')
	setInput('i_sbengine', data.searchbar?.engine || 'google')
	setInput('i_sbplaceholder', data.searchbar?.placeholder || '')
	setInput('i_sb-opacity', opacityFromHex(data.searchbar?.background ?? '#fff2'))
	setInput('i_sbwidth', data.searchbar?.width ?? 30)
	setInput('i_sbrequest', data.searchbar?.request || '')
	setInput('i_qtfreq', data.quotes?.frequency || 'day')
	setInput('i_qttype', data.quotes?.type || 'classic')
	setInput('i_qtlist', userQuotes ?? '')
	setInput('i_qturl', data.quotes?.url ?? '')
	setInput('i_clockface', data.analogstyle?.face || 'none')
	setInput('i_clockhands', data.analogstyle?.hands || 'none')
	setInput('i_clockshape', data.analogstyle?.shape || 'round')
	setInput('i_analog-border-opacity', opacityFromHex(data.analogstyle?.border ?? '#ffff'))
	setInput('i_analog-background-opacity', opacityFromHex(data.analogstyle?.background ?? '#fff2'))
	setInput('i_ampm_position', data.clock.ampmposition || 'top-left')
	setInput('i_clocksize', data.clock?.size ?? 5)
	setInput('i_greetsize', data.greetingsize ?? 3)
	setInput('i_greetmode', data.greetingsmode ?? 'auto')
	setInput('i_timezone', data.clock?.timezone || 'auto')
	setInput('i_geol', data.weather?.geolocation || 'approximate')
	setInput('i_units', data.weather?.unit ?? 'metric')
	setInput('i_forecast', data.weather?.forecast || 'auto')
	setInput('i_temp', data.weather?.temperature || 'actual')
	setInput('i_moreinfo', data.weather?.moreinfo || 'none')
	setInput('i_provider', data.weather?.provider ?? '')
	setInput('i_weight', data.font?.weight || '300')
	setInput('i_size', data.font?.size || (IS_MOBILE ? '11' : '14'))
	setInput('i_announce', data.announcements ?? 'major')
	setInput('i_synctype', local.syncType ?? (PLATFORM === 'online' ? 'off' : 'browser'))
	setInput('i_pmdr_break', data.pomodoro.timeFor.break / 60)
	setInput('i_pmdr_pomodoro', data.pomodoro.timeFor.pomodoro / 60)
	setInput('i_pmdr_longbreak', data.pomodoro.timeFor.longbreak / 60)

	setFormInput('i_city', local.lastWeather?.approximation?.city ?? 'Paris', data.weather.city)
	setFormInput('i_customfont', systemfont.placeholder, data.font?.family)
	setFormInput('i_gistsync', 'github_pat_XX000X00X', local?.gistToken)
	setFormInput('i_urlsync', 'https://pastebin.com/raw/y7XhhiDs', local?.distantUrl)

	setCheckbox('i_showall', data.showall)
	setCheckbox('i_settingshide', data.hide?.settingsicon ?? false)
	setCheckbox('i_background-mute-videos', data.backgrounds.mute ?? true)
	setCheckbox('i_quicklinks', data.quicklinks)
	setCheckbox('i_linkgroups', data?.linkgroups?.on)
	setCheckbox('i_linknewtab', data.linknewtab)
	setCheckbox('i_time', data.time)
	setCheckbox('i_analog', data.clock?.analog ?? false)
	setCheckbox('i_seconds', data.clock?.seconds ?? false)
	setCheckbox('i_worldclocks', data.clock?.worldclocks ?? false)
	setCheckbox('i_main', data.main)
	setCheckbox('i_greethide', !data.hide?.greetings)
	setCheckbox('i_notes', data.notes?.on ?? false)
	setCheckbox('i_sb', data.searchbar?.on ?? false)
	setCheckbox('i_quotes', data.quotes?.on ?? false)
	setCheckbox('i_pomodoro', data.pomodoro?.on ?? false)
	setCheckbox('i_pmdr_sound', data.pomodoro?.sound ?? true)
	setCheckbox('i_ampm', data.clock?.ampm ?? false)
	setCheckbox('i_ampm-label', data.clock?.ampmlabel ?? false)
	setCheckbox('i_sbsuggestions', data.searchbar?.suggestions ?? true)
	setCheckbox('i_sbnewtab', data.searchbar?.newtab ?? false)
	setCheckbox('i_qtauthor', data.quotes?.author ?? false)
	setCheckbox('i_supporters_notif', data.supporters?.enabled ?? true)

	colorInput('solid-background', data.backgrounds.color)
	colorInput('texture-color', data.backgrounds.texture.color ?? '#ffffff')

	paramId('i_notes-shade')?.classList.toggle('on', (data.notes?.background ?? '#fff').includes('#000'))
	paramId('i_sb-shade')?.classList.toggle('on', (data.searchbar?.background ?? '#fff').includes('#000'))
	paramId('i_analog-border-shade')?.classList.toggle('on', (data.analogstyle?.border ?? '#fff').includes('#000'))
	paramId('i_analog-background-shade')?.classList.toggle(
		'on',
		(data.analogstyle?.background ?? '#fff').includes('#000'),
	)

	// Change edit tips on mobile
	if (IS_MOBILE) {
		const tooltiptext = domsettings.querySelector('.tooltiptext .instructions')
		const text = tradThis('Edit your Quick Links by long-pressing the icon.')

		if (tooltiptext) {
			tooltiptext.textContent = text
		}
	}

	// inserts languages in select
	const langInput = paramId('i_lang')

	for (const [code, title] of Object.entries(langList)) {
		const option = document.createElement('option')
		option.value = code
		option.text = title
		langInput.appendChild(option)
	}

	// must be init after children appening
	setInput('i_lang', data.lang || 'en')

	// Activate feature options
	paramId('time_options')?.classList.toggle('shown', data.time)
	paramId('analog_options')?.classList.toggle('shown', data.clock.analog && data.showall)
	paramId('greetings_options')?.classList.toggle('shown', !data.hide?.greetings)
	paramId('greetingscustom_options')?.classList.toggle('shown', data.greetingsmode === 'custom')
	paramId('digital_options')?.classList.toggle('shown', !data.clock.analog)
	paramId('ampm_label')?.classList.toggle('shown', data.clock.ampm)
	paramId('ampm_position')?.classList.toggle('shown', data.clock.ampmlabel)
	paramId('worldclocks_options')?.classList.toggle('shown', data.clock.worldclocks)
	paramId('main_options')?.classList.toggle('shown', data.main)
	paramId('weather_provider')?.classList.toggle('shown', data.weather?.moreinfo === 'custom')
	paramId('quicklinks_options')?.classList.toggle('shown', data.quicklinks)
	paramId('pomodoro_options')?.classList.toggle('shown', data.pomodoro.on)
	paramId('notes_options')?.classList.toggle('shown', data.notes?.on)
	paramId('searchbar_options')?.classList.toggle('shown', data.searchbar?.on)
	paramId('searchbar_request')?.classList.toggle('shown', data.searchbar?.engine === 'custom')
	paramId('quotes_options')?.classList.toggle('shown', data.quotes?.on)

	// Page layout
	const gridLayoutButtons = domsettings.querySelectorAll<HTMLButtonElement>('#grid-layout button')
	const selectedLayout = data.move?.selection || 'single'

	for (const button of gridLayoutButtons) {
		button?.classList.toggle('selected', button.dataset.layout === selectedLayout)
	}

	// Link show title
	paramId('b_showtitles').classList.toggle('on', data?.linktitles ?? true)
	paramId('b_showbackgrounds').classList.toggle('on', data?.linkbackgrounds ?? true)

	// Time & main hide elems
	const disableWeather = data.hide?.weatherdesc && data.hide?.weathericon
	const descOnly = data.hide?.weatherdesc
	const iconOnly = data.hide?.weathericon
	const dateOnly = data.hide?.clock
	const clockOnly = data.hide?.date
	let hideTime = 'all'
	let hideWeather = 'all'

	if (dateOnly) {
		hideTime = 'date'
	} else if (clockOnly) {
		hideTime = 'clock'
	}

	if (disableWeather) {
		hideWeather = 'disabled'
	} else if (descOnly) {
		hideWeather = 'desc'
	} else if (iconOnly) {
		hideWeather = 'icon'
	}

	setInput('i_timehide', hideTime)
	setInput('i_weatherhide', hideWeather)

	// Quotes option display
	paramId('quotes_options')?.classList.toggle('shown', data.quotes?.on)
	paramId('quotes_userlist')?.classList.toggle('shown', data.quotes?.type === 'user')
	paramId('quotes_url')?.classList.toggle('shown', data.quotes?.type === 'url')

	const settingsForms = document.querySelectorAll<HTMLFormElement>('#settings form')

	for (const form of settingsForms) {
		const inputs = form.querySelectorAll<HTMLInputElement>('input')

		for (const input of inputs) {
			input.addEventListener('input', () => {
				form.classList.toggle('valid', form.checkValidity())
			})
		}
	}

	// Change Sync name based on browser
	const browserSyncOption = document.querySelector<HTMLElement>("#i_synctype option[value='browser']")

	if (browserSyncOption) {
		if (PLATFORM === 'firefox') {
			browserSyncOption.textContent = 'Firefox Sync'
		} else if (PLATFORM === 'chrome' && BROWSER === 'edge') {
			browserSyncOption.textContent = 'Edge Sync'
		} else if (PLATFORM === 'chrome') {
			browserSyncOption.textContent = 'Chrome Sync'
		} else if (PLATFORM === 'safari') {
			browserSyncOption.textContent = 'Safari'
		} else {
			browserSyncOption.textContent = tradThis('Automatic')
		}
	}

	// supportersNotifications(data?.supporters);

	// required for the range input's track color separation to work in webkit browsers
	// yes, it blows.
	for (const input of document.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
		webkitRangeTrackColor(input)

		input.addEventListener('input', () => {
			input.style.setProperty('--value', input.value)
		})
	}
}

function initOptionsEvents() {
	onclickdown(paramId('b_accept-permissions'), async () => {
		await getPermissions('topSites', 'bookmarks')

		const sync = await storage.sync.get()
		const local = await storage.local.get()
		quickLinks({ sync, local })
		setTimeout(() => initGroups(sync), 10)

		settingsNotifications({ 'accept-permissions': false })
	})

	// General

	onclickdown(paramId('i_showall'), (_, target) => {
		showall(target.checked, true)
	})

	paramId('i_lang').addEventListener('change', function () {
		switchLangs(this.value as Langs)
	})

	paramId('i_favicon').addEventListener('input', function (this: HTMLInputElement) {
		favicon(this.value, true)
	})

	paramId('i_favicon').addEventListener('change', function () {
		this.blur()
	})

	paramId('i_tabtitle').addEventListener('input', function () {
		tabTitle(this.value, true)
	})

	paramId('i_tabtitle').addEventListener('change', function () {
		this.blur()
	})

	paramId('i_dark').addEventListener('change', function () {
		darkmode(this.value as 'auto' | 'system' | 'enable' | 'disable', true)
	})

	onclickdown(paramId('i_settingshide'), (_, target) => {
		hideElements({ settingsicon: target.checked }, { isEvent: true })
	})

	// Quick links

	onclickdown(paramId('i_quicklinks'), (_, target) => {
		moveElements(undefined, { widget: ['quicklinks', target.checked] })
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
		this.classList.remove('valid')
	})

	onclickdown(paramId('i_linkgroups'), (_, target) => {
		quickLinks(undefined, { groups: target.checked })
	})

	onclickdown(paramId('i_linknewtab'), (_, target) => {
		quickLinks(undefined, { newtab: target.checked })
	})

	paramId('i_linkstyle').addEventListener('change', function (this) {
		quickLinks(undefined, { styles: { style: this.value } })
	})

	onclickdown(paramId('b_showtitles'), (_, target) => {
		quickLinks(undefined, {
			styles: { titles: !target.classList.contains('on') },
		})
	})

	onclickdown(paramId('b_showbackgrounds'), (_, target) => {
		quickLinks(undefined, {
			styles: { backgrounds: !target.classList.contains('on') },
		})
	})

	paramId('i_row').addEventListener('input', function (this) {
		quickLinks(undefined, { row: this.value })
	})

	paramId('i_icon_radius').addEventListener('input', function (this) {
		quickLinks(undefined, { iconradius: this.value })
	})

	onclickdown(paramId('b_importbookmarks'), async () => {
		await getPermissions('topSites', 'bookmarks')
		linksImport()
	})

	// Backgrounds

	paramId('i_type').addEventListener('change', function (this: HTMLInputElement) {
		backgroundUpdate({ type: this.value })
	})

	paramId('b_solid-background').addEventListener('click', function () {
		paramId('i_solid-background').click()
	})

	paramId('i_solid-background').addEventListener('input', function () {
		backgroundUpdate({ color: this.value })
	})

	paramId('i_background-provider').addEventListener('input', function () {
		backgroundUpdate({ provider: this.value })
	})

	paramId('f_background-user-coll').addEventListener('submit', function (this, event: SubmitEvent) {
		backgroundUpdate({ query: event })
		event.preventDefault()
	})

	paramId('f_background-user-search').addEventListener('submit', function (this, event: SubmitEvent) {
		backgroundUpdate({ query: event })
		event.preventDefault()
	})

	paramId('i_freq').addEventListener('change', function (this: HTMLInputElement) {
		backgroundUpdate({ freq: this.value })
	})

	onclickdown(paramId('i_refresh'), (event) => {
		backgroundUpdate({ refresh: event })
	})

	paramId('i_background-upload').addEventListener('change', function (this: HTMLInputElement) {
		backgroundUpdate({ files: this.files })
	})

	onclickdown(paramId('b_background-urls'), () => {
		backgroundUpdate({ urlsapply: true })
	})

	onclickdown(paramId('i_background-mute-videos'), (_, target) => {
		toggleMuteStatus(target.checked)
		backgroundUpdate({ mute: target.checked })
	})

	// Background filters

	paramId('i_texture').addEventListener('change', function (this: HTMLInputElement) {
		backgroundUpdate({ texture: this.value })
	})

	paramId('b_texture-color').addEventListener('click', function () {
		paramId('i_texture-color').click()
	})

	paramId('i_texture-color').addEventListener('input', function () {
		backgroundUpdate({ texturecolor: this.value })
	})

	paramId('i_texture-size').addEventListener('input', function (this: HTMLInputElement) {
		backgroundUpdate({ texturesize: this.value })
	})

	paramId('i_texture-opacity').addEventListener('input', function (this: HTMLInputElement) {
		backgroundUpdate({ textureopacity: this.value })
	})

	paramId('i_blur').addEventListener('pointerdown', function (this: HTMLInputElement) {
		backgroundUpdate({ blurenter: true })
	})

	paramId('i_blur').addEventListener('input', function (this: HTMLInputElement) {
		backgroundUpdate({ blur: this.value })
	})

	paramId('i_bright').addEventListener('input', function (this: HTMLInputElement) {
		backgroundUpdate({ bright: this.value })
	})

	paramId('i_fadein').addEventListener('input', function (this: HTMLInputElement) {
		backgroundUpdate({ fadein: this.value })
	})

	// Time and date

	onclickdown(paramId('i_time'), (_, target) => {
		moveElements(undefined, { widget: ['time', target.checked] })
	})

	onclickdown(paramId('i_analog'), (_, target) => {
		clock(undefined, { analog: target.checked })
	})

	onclickdown(paramId('i_seconds'), (_, target) => {
		clock(undefined, { seconds: target.checked })
	})

	onclickdown(paramId('i_worldclocks'), (_, target) => {
		paramId('worldclocks_options')?.classList.toggle('shown', target.checked)
		clock(undefined, { worldclocks: target.checked })
	})

	paramId('i_clockface').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { face: this.value })
	})

	paramId('i_clockhands').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { hands: this.value })
	})

	paramId('i_analog-border-opacity').addEventListener('input', function (this: HTMLInputElement) {
		clock(undefined, { border: 'opacity' })
	})

	paramId('i_analog-background-opacity').addEventListener('input', function (this: HTMLInputElement) {
		clock(undefined, { background: 'opacity' })
	})

	paramId('i_analog-border-shade').addEventListener('click', () => {
		clock(undefined, { border: 'shade' })
	})

	paramId('i_analog-background-shade').addEventListener('click', () => {
		clock(undefined, { background: 'shade' })
	})

	paramId('i_clockshape').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { shape: this.value })
	})

	paramId('i_clocksize').addEventListener('input', function (this: HTMLInputElement) {
		clock(undefined, { size: Number.parseFloat(this.value) })
	})

	onclickdown(paramId('i_ampm'), (_, target) => {
		clock(undefined, { ampm: target.checked })

		// shows/hides ampm_label option
		paramId('ampm_label')?.classList.toggle('shown', target.checked)
	})

	onclickdown(paramId('i_ampm-label'), (_, target) => {
		clock(undefined, { ampmlabel: target.checked })

		// shows/hides ampm_position option
		paramId('ampm_position')?.classList.toggle('shown', target.checked)
	})

	paramId('i_ampm_position').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { ampmposition: this.value })
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

	onclickdown(paramId('i_main'), (_, target) => {
		moveElements(undefined, { widget: ['main', target.checked] })
	})

	paramId('i_geol').addEventListener('change', function (this: HTMLInputElement) {
		weather(undefined, { geol: this?.value })
	})

	paramId('i_city').addEventListener('input', function (this: HTMLInputElement, event: Event) {
		weather(undefined, { suggestions: event })
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
		const weatherdesc = this.value === 'disabled' || this.value === 'desc'
		const weathericon = this.value === 'disabled' || this.value === 'icon'
		hideElements({ weatherdesc, weathericon }, { isEvent: true })
		weather(undefined, { unhide: true })
	})

	onclickdown(paramId('i_greethide'), (_, target) => {
		document.getElementById('greetings_options')?.classList.toggle('shown', target.checked)
		hideElements({ greetings: !target.checked }, { isEvent: true })
	})

	// Greetings

	paramId('i_greeting').addEventListener('input', function () {
		clock(undefined, { greeting: this.value })
	})

	paramId('i_greeting').addEventListener('change', () => {
		paramId('i_greeting').blur()
	})

	paramId('i_greetsize').addEventListener('input', function (this: HTMLInputElement) {
		clock(undefined, { greetingsize: this.value })
	})

	paramId('i_greetmode').addEventListener('change', function (this: HTMLInputElement) {
		clock(undefined, { greetingsmode: this.value })
	})

	paramId(`i_greetmorning`).addEventListener('input', function () {
		clock(undefined, { greetingscustom: { morning: this.value } })
	})
	paramId(`i_greetafternoon`).addEventListener('input', function () {
		clock(undefined, { greetingscustom: { afternoon: this.value } })
	})
	paramId(`i_greetevening`).addEventListener('input', function () {
		clock(undefined, { greetingscustom: { evening: this.value } })
	})
	paramId(`i_greetnight`).addEventListener('input', function () {
		clock(undefined, { greetingscustom: { night: this.value } })
	})

	paramId(`i_greetmorning`).addEventListener('change', () => {
		paramId(`i_greetmorning`).blur()
	})
	paramId(`i_greetafternoon`).addEventListener('change', () => {
		paramId(`i_greetafternoon`).blur()
	})
	paramId(`i_greetevening`).addEventListener('change', () => {
		paramId(`i_greetevening`).blur()
	})
	paramId(`i_greetnight`).addEventListener('change', () => {
		paramId(`i_greetnight`).blur()
	})

	// Notes

	onclickdown(paramId('i_notes'), (_, target) => {
		moveElements(undefined, { widget: ['notes', target.checked] })
	})

	paramId('i_notesalign').addEventListener('change', function (this: HTMLInputElement) {
		notes(undefined, { align: this.value })
	})

	paramId('i_noteswidth').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { width: this.value })
	})

	paramId('i_notes-opacity').addEventListener('input', function (this: HTMLInputElement) {
		notes(undefined, { background: true })
	})

	onclickdown(paramId('i_notes-shade'), () => {
		notes(undefined, { background: true })
	})

	// Searchbar

	onclickdown(paramId('i_sb'), (_, target) => {
		moveElements(undefined, { widget: ['searchbar', target.checked] })
		getPermissions('search')
	})

	paramId('i_sbengine').addEventListener('change', function (this: HTMLInputElement) {
		searchbar(undefined, { engine: this.value })
	})

	paramId('i_sb-opacity').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(undefined, { background: true })
	})

	paramId('i_sb-shade').addEventListener('click', () => {
		searchbar(undefined, { background: true })
	})

	paramId('i_sbwidth').addEventListener('input', function (this: HTMLInputElement) {
		searchbar(undefined, { width: this.value })
	})

	paramId('f_sbrequest').addEventListener('submit', function (this, event: SubmitEvent) {
		searchbar(undefined, { request: true })
		event.preventDefault()
	})

	onclickdown(paramId('i_sbnewtab'), (_, target) => {
		searchbar(undefined, { newtab: target.checked })
	})

	onclickdown(paramId('i_sbsuggestions'), (_, target) => {
		searchbar(undefined, { suggestions: target.checked })
	})

	paramId('i_sbplaceholder').addEventListener('keyup', function () {
		searchbar(undefined, { placeholder: this.value })
	})

	paramId('i_sbplaceholder').addEventListener('change', () => {
		paramId('i_sbplaceholder').blur()
	})

	// Quotes

	onclickdown(paramId('i_quotes'), (_, target) => {
		moveElements(undefined, { widget: ['quotes', target.checked] })
	})

	paramId('i_qtfreq').addEventListener('change', function () {
		quotes(undefined, { frequency: this.value })
	})

	paramId('i_qttype').addEventListener('change', function () {
		quotes(undefined, { type: this.value })
	})

	onclickdown(paramId('i_qtrefresh'), (event, target) => {
		inputThrottle(target)
		turnRefreshButton(event, true)
		quotes(undefined, { refresh: true })
	})

	onclickdown(paramId('i_qtauthor'), (_, target) => {
		quotes(undefined, { author: target.checked })
	})

	paramId('i_qtlist').addEventListener('change', function () {
		quotes(undefined, { userlist: this.value })
	})

	paramId('f_qturl').addEventListener('submit', function (this, event: SubmitEvent) {
		event.preventDefault()

		quotes(undefined, { url: paramId('i_qturl').value })
	})

	// Pomodoro

	onclickdown(paramId('i_pomodoro'), (_, target) => {
		moveElements(undefined, { widget: ['pomodoro', target.checked] })

		const glider = document.querySelector('#pomodoro_container .glider') as HTMLDivElement
		if (glider.style.width === '0px') {
			// mode glider needs pomodoro to be rendered to know the button sizes, so delay is required
			setTimeout(() => {
				setModeGlider()
			}, 333)
		}
	})

	onclickdown(paramId('i_pmdr_sound'), (_, target) => {
		pomodoro(undefined, { sound: target.checked })
	})

	paramId('i_pmdr_alarms').addEventListener('change', function () {
		pomodoro(undefined, { alarm: this.value })
	})

	paramId('i_pmdr_volume').addEventListener('input', function () {
		pomodoro(undefined, { volume: Number(this.value) })
	})

	paramId('i_pmdr_pomodoro').addEventListener('input', function () {
		pomodoro(undefined, { timeFor: { pomodoro: Number(this.value) } })
	})

	paramId('i_pmdr_break').addEventListener('input', function () {
		pomodoro(undefined, { timeFor: { break: Number(this.value) } })
	})

	paramId('i_pmdr_longbreak').addEventListener('input', function () {
		pomodoro(undefined, { timeFor: { longbreak: Number(this.value) } })
	})

	// paramId('i_pmdr_pomodoro').addEventListener('change', () => {
	// 	paramId('i_pmdr_pomodoro').blur()
	// })
	// paramId('i_pmdr_break').addEventListener('change', () => {
	// 	paramId('i_pmdr_break').blur()
	// })
	// paramId('i_pmdr_longbreak').addEventListener('change', () => {
	// 	paramId('i_pmdr_longbreak').blur()
	// })

	// Custom fonts

	paramId('i_customfont').addEventListener('pointerenter', () => {
		customFont(undefined, { autocomplete: true })
	})

	paramId('f_customfont').addEventListener('submit', (event) => {
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
		textShadow(undefined, Number.parseFloat(this.value))
	})

	// Page layout

	onclickdown(paramId('b_editmove'), () => {
		togglePomodoroFocus(false)

		moveElements(undefined, {
			toggle: !document.getElementById('interface')?.classList.contains('move-edit'),
		})
	})

	paramId('i_pagecolumns').addEventListener('change', function () {
		moveElements(undefined, { layout: this.value, toggle: true })
	})

	paramId('i_pagewidth').addEventListener('input', function () {
		pageControl({ width: Number.parseInt(this.value) }, true)
	})

	paramId('i_pagegap').addEventListener('input', function () {
		pageControl({ gap: Number.parseFloat(this.value) }, true)
	})

	paramId('i_pagewidth').addEventListener('touchstart', () => moveElements(undefined, { overlay: true }), {
		passive: true,
	})
	paramId('i_pagewidth').addEventListener('mousedown', () => moveElements(undefined, { overlay: true }))
	paramId('i_pagewidth').addEventListener('touchend', () => moveElements(undefined, { overlay: false }))
	paramId('i_pagewidth').addEventListener('mouseup', () => moveElements(undefined, { overlay: false }))

	// Updates

	paramId('i_announce').addEventListener('change', function (this) {
		interfacePopup(undefined, { announcements: this.value })
	})

	onclickdown(paramId('i_supporters_notif'), (_, target) => {
		supportersNotifications(undefined, { enabled: target.checked })
	})

	// Sync

	paramId('i_synctype').addEventListener('change', function (this) {
		synchronization(undefined, { type: this.value })
	})

	paramId('f_gistsync').addEventListener('submit', function (this, event) {
		event.preventDefault()
		synchronization(undefined, { gistToken: paramId('i_gistsync').value })
	})

	paramId('f_urlsync').addEventListener('submit', function (this, event) {
		event.preventDefault()
		synchronization(undefined, { url: paramId('i_urlsync').value })
	})

	onclickdown(paramId('b_storage-persist'), async () => {
		const persists = await navigator.storage.persist()
		synchronization(undefined, { firefoxPersist: persists })
	})

	onclickdown(paramId('b_gistup'), () => {
		synchronization(undefined, { up: true })
	})

	onclickdown(paramId('b_gistdown'), () => {
		synchronization(undefined, { down: true })
	})

	onclickdown(paramId('b_urldown'), () => {
		synchronization(undefined, { down: true })
	})

	// Settings managment

	paramId('settings-managment').addEventListener('dragenter', () => {
		paramId('settings-managment').classList.add('dragging-file')
	})

	paramId('file-import').addEventListener('dragleave', () => {
		paramId('settings-managment').classList.remove('dragging-file')
	})

	paramId('b_file-load').addEventListener('click', function (this) {
		paramId('file-import')?.click()
	})

	paramId('b_file-save').addEventListener('click', () => {
		saveImportFile()
	})

	paramId('file-import').addEventListener('change', function (this) {
		loadImportFile(this)
	})

	paramId('b_settings-copy').addEventListener('click', () => {
		copySettings()
	})

	paramId('settings-data').addEventListener('input', (event) => {
		toggleSettingsChangesButtons(event.type)
	})

	paramId('settings-data').addEventListener('focus', (event) => {
		toggleSettingsChangesButtons(event.type)
	})

	paramId('settings-data').addEventListener('blur', (event) => {
		toggleSettingsChangesButtons(event.type)
	})

	onclickdown(paramId('b_settings-cancel'), () => {
		toggleSettingsChangesButtons('cancel')
	})

	onclickdown(paramId('b_settings-apply'), () => {
		const val = paramId('settings-data').value
		importSettings(parse<Partial<Sync>>(val) ?? {})
	})

	onclickdown(paramId('b_reset-first'), () => {
		resetSettings('first')
	})

	onclickdown(paramId('b_reset-apply'), () => {
		resetSettings('yes')
	})

	onclickdown(paramId('b_reset-cancel'), () => {
		resetSettings('no')
	})

	// Other

	if (IS_MOBILE) {
		const rangeInputs = document.querySelectorAll<HTMLInputElement>("input[type='range'")

		const reduceSettingsOpacity = (event: TouchEvent) => {
			document.getElementById('settings')?.classList.toggle('see-through', event.type === 'touchstart')
		}

		for (const input of rangeInputs) {
			input.addEventListener('touchstart', reduceSettingsOpacity, { passive: true })
			input.addEventListener('touchend', reduceSettingsOpacity, { passive: true })
		}
	}

	// TODO: drag event not working ?
	const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')

	for (const input of fileInputs) {
		const toggleDrag = (_: DragEvent) => {
			input.classList.toggle('dragover')
		}

		input?.addEventListener('dragenter', toggleDrag)
		input?.addEventListener('dragleave', toggleDrag)
		input?.addEventListener('drop', toggleDrag)
	}

	const tooltips = document.querySelectorAll<HTMLElement>('.tooltip')

	for (const tooltip of tooltips) {
		onclickdown(tooltip, () => {
			const classes = [...tooltip.classList]
			const ttclass = classes.filter((cl) => cl.startsWith('tt'))[0]
			const tttext = document.querySelector(`.tooltiptext.${ttclass}`)

			tttext?.classList.toggle('shown')
		})
	}

	const splitRangeButtons = document.querySelectorAll<HTMLButtonElement>('.split-range button')

	for (const button of splitRangeButtons) {
		onclickdown(button, () => {
			button.classList.toggle('on')
		})
	}
}

function initWorldClocksAndTimezone(data: Sync) {
	const template = document.getElementById('timezones-select-template') as HTMLTemplateElement
	const citiesSelector = 'input[name="worldclock-city"]'
	const timezonesSelector = '.worldclocks-item select'
	const cities = document.querySelectorAll<HTMLSelectElement>(citiesSelector)
	const timezone = document.querySelector<HTMLSelectElement>('#i_timezone')
	const timezones = document.querySelectorAll<HTMLSelectElement>(timezonesSelector)
	const zones = ['Europe/Paris', 'America/Sao_Paulo', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata']

	// 1. Add options to selects

	for (const select of timezones) {
		select.appendChild(template.content.cloneNode(true))
	}

	if (timezone) {
		timezone.appendChild(template.content.cloneNode(true))
	}

	// 2. Add events & values

	cities?.forEach((input, i) => {
		input.addEventListener('input', () => {
			clock(undefined, { world: { index: i, region: input.value } })
		})

		if (data.worldclocks[i]) {
			input.value = data.worldclocks[i].region
		}
	})

	timezones?.forEach((select, i) => {
		select.addEventListener('change', (event: Event) => {
			const select = event.target as HTMLSelectElement
			const timezone = select.value
			clock(undefined, { world: { index: i, timezone: timezone } })
		})

		select.value = data.worldclocks[i]?.timezone ?? zones[i]
	})

	if (timezone) {
		timezone.value = data.clock.timezone
	}
}

function translatePlaceholders() {
	const cases = [
		['i_title', 'Name'],
		['i_greeting', 'Name'],
		['i_greetmorning', 'Hello, $name!'],
		['i_greetafternoon', 'Good afternoon'],
		['i_greetevening', 'Good evening'],
		['i_greetnight', 'Good night'],
		['i_tabtitle', 'New tab'],
		['i_sbrequest', 'Search query: %s'],
		['i_sbplaceholder', 'Search'],
		['css-editor-textarea', 'Type in your custom CSS'],
		['i_importtext', 'or paste as text'],
		['i_addlink-title', 'Title'],
		['i_addlink-url', 'example.com'],
		['i_qtlist', 'Author, Your quote.\nAuthor, Your second quote.'],
	]

	for (const [id, text] of cases) {
		document.getElementById(id)?.setAttribute('placeholder', tradThis(text))
	}
}

function translateAriaLabels() {
	for (const element of document.querySelectorAll('[title]')) {
		const title = element.getAttribute('title') ?? ''

		element.setAttribute('title', tradThis(title))
		element.setAttribute('aria-label', tradThis(title))
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
	changeGroupTitle({ old: '', new: '' }, data)
	weather({ sync: data, lastWeather: local.lastWeather })
	quotes({ sync: data, local })
	tabTitle(data.tabtitle)
	notes(data.notes)
	customFont(undefined, { lang: true })
	settingsFooter()
	translatePlaceholders()
	translateAriaLabels()
	supportersNotifications(undefined, { translate: true })
	setModeGlider()
}

function showall(val: boolean, event: boolean) {
	document.getElementById('settings')?.classList.toggle('all', val)

	if (event) {
		storage.sync.set({ showall: val })
	}
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

	globalThis.addEventListener('resize', () => {
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
	let settingsVh = -75
	let firstPos = 0
	let startTouchY = 0

	mobileDragZone?.addEventListener('touchstart', dragStart, {
		passive: false,
	})
	mobileDragZone?.addEventListener('pointerdown', dragStart, {
		passive: false,
	})

	function dragStart(e: Event) {
		e.preventDefault()

		// prevents touchEvent and pointerEvent from firing at the same time
		if (settingsDom.classList.contains('dragging-mobile-settings')) {
			return
		}

		// Get mouse / touch y position
		if (e.type === 'pointerdown') {
			startTouchY = (e as MouseEvent).clientY
		}
		if (e.type === 'touchstart') {
			startTouchY = (e as TouchEvent).touches[0].clientY
		}

		// First time dragging, sets maximum y pos at which to block
		if (firstPos === 0) {
			firstPos = startTouchY
		}

		// Add mouse / touch moves events
		globalThis.addEventListener('touchmove', dragMove)
		globalThis.addEventListener('pointermove', dragMove)
		document.body.addEventListener('touchend', dragEnd)
		document.body.addEventListener('pointerup', dragEnd)

		document.body.classList.add('dragging-mobile-settings')
	}

	function dragMove(e: Event) {
		let clientY = 0

		// Get mouse / touch y position
		if (e.type === 'pointermove') {
			clientY = (e as MouseEvent).clientY
		}
		if (e.type === 'touchmove') {
			clientY = (e as TouchEvent).touches[0].clientY
		}

		// element is below max height: move
		if (clientY > 60) {
			const touchPosition = clientY - 25
			const inverseHeight = 100 - (touchPosition / globalThis.innerHeight) * 100

			settingsVh = +inverseHeight.toFixed(2)
			settingsDom.style.transform = `translateY(-${settingsVh}dvh)`
			settingsDom.style.transition = 'transform .0s'
		}
	}

	function dragEnd(e: Event) {
		let clientY = 0

		// Get mouse / touch y position
		if (e.type === 'pointerup') {
			clientY = (e as MouseEvent).clientY
		}
		if (e.type === 'touchend') {
			clientY = (e as TouchEvent).changedTouches[0].clientY
		}

		globalThis.removeEventListener('touchmove', dragMove)
		globalThis.removeEventListener('pointermove', dragMove)
		document.body.removeEventListener('touchend', dragEnd)
		document.body.removeEventListener('pointerup', dragEnd)

		startTouchY = 0

		const footer = document.getElementById('settings-footer') as HTMLDivElement
		footer.style.paddingBottom = `${100 - Math.abs(settingsVh)}dvh`

		settingsDom.style.removeProperty('padding')
		settingsDom.style.removeProperty('width')
		settingsDom.style.removeProperty('overflow')
		settingsDom.classList.remove('dragging')

		// small enough ? close settings
		if (clientY > globalThis.innerHeight - 100) {
			settingsToggle()
		}
	}
}

//	Settings management

function copySettings() {
	const copybtn = document.querySelector('#b_settings-copy span')
	const pre = document.getElementById('settings-data')

	try {
		navigator.clipboard.writeText(pre?.textContent ?? '{}')

		if (copybtn) {
			copybtn.textContent = tradThis('Copied!')
			setTimeout(() => {
				copybtn.textContent = tradThis('Copy')
			}, 1000)
		}
	} catch (_error) {
		// ...
	}
}

async function saveImportFile() {
	const a = document.getElementById('file-download')

	if (!a) {
		return
	}

	const date = new Date()
	const data = ((await storage.sync.get()) as Sync) ?? {}
	const zero = (n: number) => (n.toString().length === 1 ? `0${n}` : n.toString())
	const yyyymmdd = date.toISOString().slice(0, 10)
	const hhmmss = `${zero(date.getHours())}_${zero(date.getMinutes())}_${zero(date.getSeconds())}`

	const bytes = new TextEncoder().encode(stringify(data))
	const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' })
	const href = URL.createObjectURL(blob)

	a.setAttribute('href', href)
	a.setAttribute('tabindex', '-1')
	a.setAttribute('download', `bonjourr-${data?.about?.version} ${yyyymmdd} ${hhmmss}.json`)
	a.click()
}

function loadImportFile(target: HTMLInputElement) {
	function decodeExportFile(str: string): Partial<Sync> {
		let result = {}

		try {
			// Tries to decode base64 from previous versions
			result = parse<Partial<Sync>>(atob(str)) ?? {}
		} catch {
			try {
				// If base64 failed, parse raw string
				result = parse<Partial<Sync>>(str) ?? {}
			} catch (_) {
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
		if (typeof reader.result !== 'string') {
			return false
		}

		const importData = decodeExportFile(reader.result)

		// data has at least one valid key from default sync storage => import
		if (Object.keys(SYNC_DEFAULT).filter((key) => key in importData).length > 0) {
			importSettings(importData as Sync)
		}
	}
	reader.readAsText(file)
}

async function importSettings(imported: Partial<Sync>) {
	try {
		let data = await storage.sync.get()

		// #308 - verify font subset before importing
		if (imported?.font?.system === false) {
			const family = imported?.font?.family
			const lang = imported?.lang
			const correctSubset = await fontIsAvailableInSubset(lang, family)

			if (correctSubset === false) {
				imported.font.family = ''
			}
		}

		if (imported?.searchbar?.on) {
			getPermissions('search')
		}

		data = filterData('import', data, imported)

		storage.sync.clear()
		storage.sync.set(data)
		fadeOut()
	} catch (_) {
		// ...
	}
}

function resetSettings(action: 'yes' | 'no' | 'first') {
	if (action === 'yes') {
		storage.clearall().then(fadeOut)
		return
	}

	document.getElementById('reset-first')?.classList.toggle('shown', action === 'no')
	document.getElementById('reset-conf')?.classList.toggle('shown', action === 'first')
}

export function updateSettingsJson(data?: Sync) {
	try {
		data ? updateTextArea(data) : storage.sync.get().then(updateTextArea)
	} catch (err) {
		console.warn(err)
	}

	function updateTextArea(data: Sync) {
		const pre = document.getElementById('settings-data')

		if (pre && data.about) {
			const orderedJson = stringify(data)
			data.about.browser = PLATFORM
			pre.textContent = orderedJson
		}
	}
}

function updateSettingsEvent() {
	// On settings changes, update export code
	// beforeunload stuff because of this issue: https://github.com/victrme/Bonjourr/issues/194
	const storageUpdate = () => updateSettingsJson()
	const removeListener = () => chrome.storage.onChanged.removeListener(storageUpdate)

	if (PLATFORM === 'online') {
		globalThis.addEventListener('storage', storageUpdate)
	} else {
		chrome.storage.onChanged.addListener(storageUpdate)
		globalThis.addEventListener('beforeunload', removeListener, { once: true })
	}
}

async function toggleSettingsChangesButtons(action: string) {
	const textarea = paramId('settings-data')
	const data = await storage.sync.get()
	let hasChanges = false

	if (action === 'input') {
		const current = stringify(data)
		let user = ''

		try {
			user = stringify(JSON.parse(textarea.value ?? '{}') as Sync)
		} catch (_) {
			//
		}

		hasChanges = user.length > 2 && current !== user

		if (hasChanges) {
			paramId('b_settings-apply')?.removeAttribute('disabled')
		} else {
			paramId('b_settings-apply')?.setAttribute('disabled', '')
		}
	}

	if (action === 'cancel') {
		textarea.value = stringify(data)
		hasChanges = false
	}

	if (action === 'focus') {
		paramId('settings-files-options')?.classList.add('hidden')
		paramId('settings-changes-options')?.classList.remove('hidden')
	}

	if (action === 'blur') {
		paramId('settings-changes-options')?.classList.add('hidden')
		paramId('settings-files-options')?.classList.remove('hidden')
	}
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

function setFormInput(id: string, defaults: string, value?: string) {
	const input = paramId(id) as HTMLInputElement

	if (value) {
		input.value = value
		input.setAttribute('placeholder', value)
	} else {
		input.setAttribute('placeholder', defaults)
	}
}
