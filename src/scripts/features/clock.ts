import { hexColorFromSplitRange } from '../shared/dom.ts'
import { setUserDate, userDate } from '../shared/time.ts'
import { getLang, tradThis } from '../utils/translations.ts'
import { displayInterface } from '../shared/display.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { eventDebounce } from '../utils/debounce.ts'
import { stringMaxSize } from '../shared/generic.ts'
import { getVnCalendar } from '../dependencies/vietnamese-calendar.ts'
import { SYNC_DEFAULT } from '../defaults.ts'
import { storage } from '../storage.ts'

import type { AnalogStyle, Clock, Sync, WorldClock } from '../../types/sync.ts'

type DateFormat = Sync['dateformat']

type ClockUpdate = {
	ampm?: boolean
	ampmlabel?: boolean
	ampmposition?: string
	analog?: boolean
	seconds?: boolean
	dateformat?: string
	greeting?: string
	greetingsize?: string
	greetingsmode?: string
	greetings_custom_strings?: {
		morning?: string;
		afternoon?: string;
		evening?: string;
		night?: string;
	}
	timezone?: string
	shape?: string
	face?: string
	hands?: string
	size?: number
	border?: 'opacity' | 'shade'
	background?: 'opacity' | 'shade'
	worldclocks?: boolean
	world?: { index: number; region?: string; timezone?: string }
}

const defaultAnalogStyle: AnalogStyle = {
	face: 'none',
	hands: 'modern',
	shape: 'round',
	border: '#ffff',
	background: '#fff2',
}

const sinogramRegex = /zh-CN|zh-HK|ja/
const defaultTimezones = ['Europe/Paris', 'America/Sao_Paulo', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata']
const defaultRegions = ['Paris', 'New York', 'Tokyo', 'Lisbon', 'Los Angeles']
const oneInFive = Math.random() > 0.8 ? 1 : 0
let numberWidths = [1]
let clockInterval: number

export function clock(init?: Sync, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	const clock = init?.clock ?? { ...SYNC_DEFAULT.clock }
	const world = init?.worldclocks ?? { ...SYNC_DEFAULT.worldclocks }

	try {
		startClock(clock, world, init?.greeting || '', init?.dateformat || 'eu')
		greetingSize(init?.greetingsize)
		analogStyle(init?.analogstyle)
		clockSize(clock.size)
		displayInterface('clock')
		onSettingsLoad(toggleWorldClocksOptions)
	} catch (err) {
		console.info(err)
	}
}

//	Update

async function clockUpdate(update: ClockUpdate) {
	const data = await storage.sync.get()
	const analogstyle = data.analogstyle ?? structuredClone(defaultAnalogStyle)

	if (update.analog !== undefined) {
		document.getElementById('analog_options')?.classList.toggle('shown', update.analog)
		document.getElementById('digital_options')?.classList.toggle('shown', !update.analog)
	}

	if (isDateFormat(update.dateformat)) {
		data.dateformat = update.dateformat
		storage.sync.set({ dateformat: update.dateformat })
	}

	if (update.greeting !== undefined) {
		data.greeting = stringMaxSize(update.greeting, 64)
		greetings(data.greeting)
		storage.sync.set({ greeting: data.greeting })
	}

	if (update.greetingsize !== undefined) {
		greetingSize(update.greetingsize)
		storage.sync.set({ greetingsize: update.greetingsize })
	}

	if (update.greetings_custom_strings !== undefined) {
		storage.sync.set({ greetings_custom_strings: { 
			...data.greetings_custom_strings, ...update.greetings_custom_strings 
		}})
	}

	if (update.greetingsmode !== undefined) {
		// greetingSize(update.greetingsize)
		storage.sync.set({ greetingsmode: update.greetingsmode as 'auto' | 'custom' })
	}

	if (isHands(update.hands)) {
		analogstyle.hands = update.hands
	}

	if (isShape(update.shape)) {
		analogstyle.shape = update.shape
	}

	if (isFace(update.face)) {
		analogstyle.face = update.face
	}

	if (update.background || update.border) {
		const option = update.background ? 'background' : 'border'

		analogstyle[option] = hexColorFromSplitRange(`#analog-${option}-range`)
		analogStyle(analogstyle)

		if (update?.[option] === 'opacity') {
			eventDebounce({ analogstyle })
		}
		if (update?.[option] === 'shade') {
			storage.sync.set({ analogstyle })
		}

		return
	}

	if (update.worldclocks !== undefined) {
		data.clock.worldclocks = update.worldclocks
		toggleTimezoneOptions(data)
	}

	if (update.world !== undefined) {
		const index = update.world.index
		const baseclock = { region: defaultRegions[index], timezone: defaultTimezones[index] }
		const worldclock = data.worldclocks?.[index] ?? baseclock
		const { region, timezone } = update.world

		if (region !== undefined) {
			worldclock.region = region
		}
		if (timezone !== undefined) {
			worldclock.timezone = timezone
		}

		data.worldclocks[index] = worldclock
		toggleWorldClocksOptions()
		toggleTimezoneOptions(data)
	}

	data.clock = {
		ampm: update.ampm ?? data.clock.ampm,
		size: update.size ?? data.clock.size,
		analog: update.analog ?? data.clock.analog,
		seconds: update.seconds ?? data.clock.seconds,
		timezone: update.timezone ?? data.clock.timezone,
		ampmlabel: update.ampmlabel ?? data.clock.ampmlabel,
		ampmposition: isAmpmPosition(update.ampmposition) ? update.ampmposition : data.clock.ampmposition,
		worldclocks: update.worldclocks ?? data.clock.worldclocks,
	}

	storage.sync.set({
		clock: data.clock,
		worldclocks: data.worldclocks,
		analogstyle: analogstyle,
		dateformat: data.dateformat,
	})

	startClock(data.clock, data.worldclocks, data.greeting, data.dateformat)
	analogStyle(data.analogstyle)
	clockSize(data.clock.size)
}

function analogStyle(style: AnalogStyle = structuredClone(defaultAnalogStyle)) {
	const { face, shape, hands } = style

	const time = document.getElementById('time') as HTMLElement
	const spans = document.querySelectorAll<HTMLSpanElement>('.analog .analog-face span')

	const backgroundAlpha = Number.parseInt(style.background.slice(4), 16)
	const isWhiteOpaque = style.background?.includes('fff') && backgroundAlpha > 7
	const isTransparent = backgroundAlpha === 0

	let faceNumbers = ['12', '3', '6', '9']
	const lang = getLang()

	if (lang === 'am') {
		faceNumbers = ['Գ', 'Զ', 'Թ', 'ԺԲ']
	} else if (lang === 'ar') {
		faceNumbers = ['٣', '٦', '٩', '١٢']
	} else if (lang === 'fa') {
		faceNumbers = ['۳', '۶', '۹', '۱۲']
	} else if (lang.match(sinogramRegex)) {
		faceNumbers = ['三', '六', '九', '十二']
	}

	spans.forEach((span, i) => {
		if (face === 'roman') {
			span.textContent = ['XII', 'III', 'VI', 'IX'][i % 4]
		} else if (face === 'marks') {
			span.textContent = ['│', '―', '│', '―'][i % 4]
		} else if (face === 'number') {
			span.textContent = faceNumbers[i % 4]
		} else {
			span.textContent = ''
		}
	})

	time.dataset.face = face === 'swiss' || face === 'braun' ? face : ''
	time.dataset.shape = shape || ''
	time.dataset.hands = hands || ''

	time.classList.toggle('transparent', isTransparent)
	time.classList.toggle('white-opaque', isWhiteOpaque)

	time.style.setProperty('--analog-border', style.border)
	time.style.setProperty('--analog-background', style.background)
}

function clockSize(size = 5) {
	document.documentElement.style.setProperty('--clock-size', `${size.toString()}em`)
}

function greetingSize(size = '3') {
	document.documentElement.style.setProperty('--greeting-size', `${size}em`)
}

//	Clock

function startClock(clock: Clock, world: WorldClock[], greeting: string, dateformat: DateFormat) {
	document.getElementById('time')?.classList.toggle('is-analog', clock.analog)
	document.getElementById('time')?.classList.toggle('seconds', clock.seconds)

	document.querySelectorAll('.clock-wrapper').forEach((node, index) => {
		if (index > 0) {
			node.remove()
		}
	})

	const clocks: WorldClock[] = []

	setSecondsWidthInCh()

	if (clock.worldclocks) {
		clocks.push(...world.filter(({ region }) => region))
	}

	if (clocks.length === 0) {
		clocks.push({ region: '', timezone: clock.timezone })
	}

	// <!> First timezone becomes global timezone
	// <!> for everything in Bonjourr !
	setUserDate(clocks[0].timezone)

	start(true)
	clearInterval(clockInterval)
	clockInterval = setInterval(start, 1000)

	function start(firstStart?: true) {
		for (let index = 0; index < clocks.length; index++) {
			const { region, timezone } = clocks[index]
			const domclock = getClock(index)
			const domregion = domclock.querySelector<HTMLElement>('.clock-region')
			const date = userDate(timezone)
			const isNextHour = date.getMinutes() === 0

			if (clock.analog) {
				analog(domclock, clock, timezone)
			} else {
				digital(domclock, clock, timezone)
			}

			if (isNextHour || firstStart) {
				clockDate(domclock, date, dateformat, timezone)
			}

			if (domregion) {
				domregion.textContent = region
			}
		}

		greetings(greeting)
	}
}

function getClock(index: number): HTMLDivElement {
	const container = document.getElementById('time-container')
	const wrapper = document.querySelector<HTMLDivElement>(`.clock-wrapper[data-index="${index}"]`)

	if (wrapper) {
		return wrapper
	}

	const first = document.getElementById('clock-wrapper')
	const clone = first?.cloneNode(true) as HTMLDivElement

	clone.removeAttribute('id')
	clone.dataset.index = index.toString()
	container?.appendChild(clone)

	return clone
}

function digital(wrapper: HTMLElement, clock: Clock, timezone: string) {
	const date = userDate(timezone)
	const domclock = wrapper.querySelector<HTMLElement>('.digital')
	const hh = wrapper.querySelector('.digital-hh') as HTMLElement
	const mm = wrapper.querySelector('.digital-mm') as HTMLElement
	const ss = wrapper.querySelector('.digital-ss') as HTMLElement
	const ampm = wrapper.querySelector('.digital-ampm') as HTMLElement

	const m = fixunits(date.getMinutes())
	const s = fixunits(date.getSeconds())
	let h = clock.ampm ? date.getHours() % 12 : date.getHours()

	if (!domclock) {
		return
	}

	if (clock.ampmlabel) {
		domclock.dataset.ampmLabel = ''
	} else {
		delete domclock.dataset.ampmLabel
	}

	if (clock.ampm) {
		domclock.dataset.ampm = date.getHours() < 12 ? 'am' : 'pm'
	} else {
		delete domclock.dataset.ampm
	}

	if (clock.ampm && h === 0) {
		h = 12
	}

	// Avoid layout shifts by rounding width
	const second = date.getSeconds() < 10 ? 0 : Math.floor(date.getSeconds() / 10)
	const width = getSecondsWidthInCh(second).toFixed(1)
	domclock.style.setProperty('--seconds-width', `${width}ch`)

	domclock.classList.toggle('zero', !clock.ampm && h < 10)

	hh.textContent = h.toString()
	mm.textContent = m.toString()
	ss.textContent = s.toString()

	if (clock.ampm) {
		if (clock.ampmposition) {
			domclock.dataset.ampmposition = clock.ampmposition
		} else {
			domclock.dataset.ampmposition = 'top-left'
		}

		if (clock.ampmposition === 'top-right' || clock.ampmposition === 'bottom-right') {
			if (ampm && domclock.lastElementChild !== ampm) {
				domclock.insertBefore(ampm, domclock.lastElementChild)
			}
		} else if (clock.ampmposition === 'top-left' || clock.ampmposition === 'bottom-left') {
			if (ampm && domclock.firstElementChild !== ampm) {
				domclock.insertBefore(ampm, domclock.firstElementChild)
			}
		}
	}
}

function analog(wrapper: HTMLElement, clock: Clock, timezone: string) {
	const date = userDate(timezone)
	const m = ((date.getMinutes() + date.getSeconds() / 60) * 6).toFixed(1)
	const h = (((date.getHours() % 12) + date.getMinutes() / 60) * 30).toFixed(1)
	const s = (date.getSeconds() * 6).toFixed(1)

	wrapper.querySelector<HTMLElement>('.analog-hours')?.style.setProperty('--deg', `${h}deg`)
	wrapper.querySelector<HTMLElement>('.analog-minutes')?.style.setProperty('--deg', `${m}deg`)

	if (!clock.seconds) {
		return
	}

	wrapper.querySelector<HTMLElement>('.analog-seconds')?.style.setProperty('--deg', `${s}deg`)
}

//	Date

function clockDate(wrapper: HTMLElement, date: Date, dateformat: DateFormat, timezone: string) {
	const datedom = wrapper.querySelector('.clock-date') as HTMLElement
	const aa = wrapper.querySelector('.clock-date-aa') as HTMLElement
	const bb = wrapper.querySelector('.clock-date-bb') as HTMLElement
	const cc = wrapper.querySelector('.clock-date-cc') as HTMLElement
	const secondary = wrapper.querySelector('.clock-date-secondary') as HTMLElement

	const lang = getLang().replaceAll('_', '-')

	const day = new Intl.DateTimeFormat(lang, { day: 'numeric' }).format(date)
	const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(date)
	const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date)

	datedom.classList.remove('eu', 'us', 'cn')
	datedom.classList.add(dateformat)

	if (dateformat === 'auto') {
		const intl = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric' })
		aa.textContent = intl.format(date)
		bb.textContent = ''
		cc.textContent = ''
	}

	if (dateformat === 'eu') {
		aa.textContent = weekday
		bb.textContent = day
		cc.textContent = month
	}

	if (dateformat === 'us') {
		aa.textContent = weekday
		bb.textContent = month
		cc.textContent = day
	}

	if (dateformat === 'cn') {
		aa.textContent = month
		bb.textContent = day
		cc.textContent = weekday
	}

	if (lang === 'vi' && (timezone === 'auto' || timezone === 'Asia/Ho_Chi_Minh')) {
		secondary.textContent = getVnCalendar(date)
	} else {
		secondary.textContent = ''
	}
}

//	Greetings

function greetings(name?: string) {
	const date = userDate()
	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	const domgreeting = document.getElementById('greeting') as HTMLSpanElement
	const domname = document.getElementById('greeting-name') as HTMLSpanElement

	const rare = oneInFive
	const hour = date.getHours()
	let period: 'night' | 'morning' | 'afternoon' | 'evening'

	if (hour < 3) {
		period = 'evening'
	} else if (hour < 5) {
		period = 'night'
	} else if (hour < 12) {
		period = 'morning'
	} else if (hour < 18) {
		period = 'afternoon'
	} else {
		period = 'evening'
	}

	const greetings = {
		morning: 'Good morning',
		afternoon: 'Good afternoon',
		evening: 'Good evening',
		night: ['Good night', 'Sweet dreams'][rare],
	}

	const greet = greetings[period]

	domgreetings.style.textTransform = name || (rare && period === 'night') ? 'none' : 'capitalize'
	domgreeting.textContent = tradThis(greet) + (name ? ', ' : '')
	domname.textContent = name ?? ''
}

// World clocks

function toggleWorldClocksOptions() {
	const parents = document.querySelectorAll<HTMLElement>('.worldclocks-item')
	const inputs = document.querySelectorAll<HTMLInputElement>('.worldclocks-item input')
	let hasWorld = false

	parents.forEach((parent, i) => {
		const currHasText = !!inputs[i]?.value
		const nextHasText = !!inputs[i - 1]?.value
		parent?.classList.toggle('shown', i === 0 || currHasText || nextHasText)

		if (!hasWorld && currHasText) {
			hasWorld = true
		}
	})
}

function toggleTimezoneOptions(data: Sync) {
	const timezoneOptions = document.getElementById('timezone_options')
	const hasWorldClock = data.clock.worldclocks && !!data?.worldclocks[0]?.region

	timezoneOptions?.classList.toggle('shown', !hasWorldClock)
}

// Helpers

function setSecondsWidthInCh() {
	const span = document.querySelector<HTMLElement>('.digital-number-width')

	if (!span) {
		return
	}

	const zero = span.offsetWidth
	numberWidths = [1]

	for (let i = 1; i < 6; i++) {
		span.textContent = i.toString()
		numberWidths.push(Math.round((span.offsetWidth / zero) * 10) / 10)
	}
}

function getSecondsWidthInCh(second: number): number {
	return Math.min(...numberWidths) + numberWidths[second]
}

function fixunits(val: number) {
	return (val < 10 ? '0' : '') + val.toString()
}

function isFace(str?: string): str is AnalogStyle['face'] {
	return ['none', 'number', 'roman', 'marks', 'swiss', 'braun'].includes(str ?? '')
}

function isHands(str?: string): str is AnalogStyle['hands'] {
	return ['modern', 'swiss', 'classic', 'braun', 'apple'].includes(str ?? '')
}

function isShape(str?: string): str is AnalogStyle['shape'] {
	return ['round', 'square', 'rectangle'].includes(str ?? '')
}

function isDateFormat(str = ''): str is DateFormat {
	return ['auto', 'eu', 'us', 'cn'].includes(str)
}

function isAmpmPosition(str?: string): str is 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
	return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(str ?? '')
}
