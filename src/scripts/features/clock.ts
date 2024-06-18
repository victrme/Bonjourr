import { getLang, tradThis } from '../utils/translations'
import { displayInterface } from '../index'
import { SYNC_DEFAULT } from '../defaults'
import errorMessage from '../utils/errormessage'
import storage from '../storage'
import { getHTMLTemplate } from '../utils'

type ClockUpdate = {
	ampm?: boolean
	analog?: boolean
	seconds?: boolean
	dateformat?: string
	greeting?: string
	timezone?: string
	style?: string
	face?: string
	size?: number
	worldclocks?: boolean
	world?: {
		index: number
		region?: string
		timezone?: string
	}
}

type DateFormat = Sync.Storage['dateformat']

const oneInFive = Math.random() > 0.8 ? 1 : 0
let numberWidths = [1]
let clockInterval: number

export default function clock(init?: Sync.Storage, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	const clock = init?.clock ?? { ...SYNC_DEFAULT.clock }
	const world = init?.worldclocks ?? { ...SYNC_DEFAULT.worldclocks }

	try {
		startClock(clock, world, init?.greeting || '', init?.dateformat || 'eu')
		clockDate(zonedDate(clock.timezone), init?.dateformat || 'eu')
		greetings(zonedDate(clock.timezone), init?.greeting || '')
		analogFace(clock.face)
		analogStyle(clock.style)
		clockSize(clock.size)
		displayInterface('clock')
	} catch (e) {
		errorMessage(e)
	}
}

//
//	Update
//

async function clockUpdate(update: ClockUpdate) {
	const data = await storage.sync.get(['clock', 'dateformat', 'greeting', 'worldclocks'])

	if (!data.clock || data.dateformat === undefined || data.greeting === undefined) {
		return
	}

	if (update.analog !== undefined) {
		document.getElementById('analog_options')?.classList.toggle('shown', update.analog)
		document.getElementById('digital_options')?.classList.toggle('shown', !update.analog)
	}

	if (isDateFormat(update.dateformat)) {
		clockDate(zonedDate(data.clock.timezone), update.dateformat)
		storage.sync.set({ dateformat: update.dateformat })
	}

	if (update.greeting !== undefined) {
		greetings(zonedDate(data.clock.timezone), update.greeting)
		storage.sync.set({ greeting: update.greeting })
	}

	if (update.timezone !== undefined) {
		clockDate(zonedDate(update.timezone), data.dateformat)
		greetings(zonedDate(update.timezone), data.greeting)
	}

	if (update.world !== undefined) {
		const index = update.world.index
		const worldclock = data.worldclocks?.[index] ?? { region: 'Paris', timezone: 'Europe/Paris' }
		const { region, timezone } = update.world

		if (region !== undefined) {
			// const dom = document.getElementById('clock-region') as HTMLParagraphElement
			// dom.textContent = region
			worldclock.region = region

			const nextClock = document.querySelector(`input[name="worldclock-city"][data-index="${index + 1}"]`)
			const nextClockParent = nextClock?.parentElement

			console.log(nextClockParent)

			if (nextClockParent) {
				nextClockParent.classList.toggle('shown', true)
			}
		}

		if (timezone !== undefined) {
			console.log('timezone: ', timezone)
			worldclock.timezone = timezone
		}

		data.worldclocks[index] = worldclock
	}

	data.clock = {
		...clock,
		ampm: update.ampm ?? data.clock.ampm,
		size: update.size ?? data.clock.size,
		analog: update.analog ?? data.clock.analog,
		seconds: update.seconds ?? data.clock.seconds,
		timezone: update.timezone ?? data.clock.timezone,
		worldclocks: update.worldclocks ?? data.clock.worldclocks,
		face: isFace(update.face) ? update.face : data.clock.face,
		style: isStyle(update.style) ? update.style : data.clock.style,
	}

	storage.sync.set({
		clock: data.clock,
		worldclocks: data.worldclocks,
	})

	startClock(data.clock, data.worldclocks, data.greeting, data.dateformat)
	analogFace(data.clock.face)
	analogStyle(data.clock.style)
	clockSize(data.clock.size)
}

function analogFace(face = 'none') {
	const spans = document.querySelectorAll<HTMLSpanElement>('.analog span')

	spans.forEach((span, i) => {
		if (face === 'none') span.textContent = ['', '', '', ''][i]
		if (face === 'number') span.textContent = ['12', '3', '6', '9'][i]
		if (face === 'roman') span.textContent = ['XII', 'III', 'VI', 'IX'][i]
		if (face === 'marks') span.textContent = ['│', '―', '│', '―'][i]
	})
}

function analogStyle(style?: string) {
	document.getElementById('time')?.classList.remove('round', 'square', 'transparent')
	document.getElementById('time')?.classList.add(style || '')
}

function clockSize(size = 1) {
	document.documentElement.style.setProperty('--clock-size', size.toString() + 'em')
}

//
//	Clock
//

function startClock(clock: Sync.Clock, world: Sync.WorldClocks, greeting: string, dateformat: DateFormat) {
	document.getElementById('time')?.classList.toggle('is-analog', clock.analog)
	document.getElementById('time')?.classList.toggle('seconds', clock.seconds)

	if (clock.seconds) {
		setSecondsWidthInCh()
	}

	clearInterval(clockInterval)
	start()

	clockInterval = setInterval(start, 1000)

	function start() {
		for (let ii = 0; ii < world.length; ii++) {
			const { region, timezone } = world[ii]

			const domclock = getClock(ii)
			const date = zonedDate(timezone)
			const isNextHour = date.getMinutes() === 0

			if (clock.analog) analog(domclock, date, clock)
			if (!clock.analog) digital(domclock, date, clock)

			if (isNextHour) {
				clockDate(date, dateformat)
				greetings(date, greeting)
			}

			const dom = domclock.querySelector('.clock-region') as HTMLParagraphElement
			dom.textContent = region
		}
	}
}

function getClock(index: number): HTMLDivElement {
	const container = document.getElementById('time-container')
	let wrapper = document.querySelector<HTMLDivElement>(`.clock-wrapper[data-index="${index}"]`)

	if (!wrapper) {
		wrapper = getHTMLTemplate<HTMLDivElement>('clock-template', 'div')
		wrapper.dataset.index = index.toString()
		container?.prepend(wrapper)
	}

	return wrapper
}

function digital(wrapper: HTMLElement, date: Date, clock: Sync.Clock) {
	const domclock = wrapper.querySelector<HTMLElement>('.digital')
	const hh = wrapper.querySelector('.digital-hh') as HTMLElement
	const mm = wrapper.querySelector('.digital-mm') as HTMLElement
	const ss = wrapper.querySelector('.digital-ss') as HTMLElement

	const m = fixunits(date.getMinutes())
	const s = fixunits(date.getSeconds())
	let h = clock.ampm ? date.getHours() % 12 : date.getHours()

	if (clock.ampm && h === 0) {
		h = 12
	}

	if (clock.seconds) {
		// Avoid layout shifts by rounding width
		const second = date.getSeconds() < 10 ? 0 : Math.floor(date.getSeconds() / 10)
		const width = getSecondsWidthInCh(second).toFixed(1)

		domclock?.style.setProperty('--seconds-width', `${width}ch`)

		// const offset = (-2 + width).toFixed(1)
		// domclock?.style.setProperty('--seconds-margin-offset', `${offset}ch`)
	}

	domclock?.classList.toggle('zero', !clock.ampm && h < 10)

	hh.textContent = h.toString()
	mm.textContent = m.toString()
	ss.textContent = s.toString()
}

function analog(wrapper: HTMLElement, date: Date, clock: Sync.Clock) {
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

function clockDate(date: Date, dateformat: DateFormat) {
	const datedom = document.getElementById('date') as HTMLElement
	const aa = document.getElementById('date-aa') as HTMLElement
	const bb = document.getElementById('date-bb') as HTMLElement
	const cc = document.getElementById('date-cc') as HTMLElement

	let lang = getLang().replaceAll('_', '-')

	if (lang === 'jp') lang = 'ja-JP'
	if (lang === 'gr') lang = 'el'
	if (lang === 'cz') lang = 'cs-CZ'

	// temp
	date = new Date()

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
}

//	Greetings

function greetings(date: Date, name?: string) {
	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	const domgreeting = document.getElementById('greeting') as HTMLSpanElement
	const domname = document.getElementById('greeting-name') as HTMLSpanElement

	const rare = oneInFive
	const hour = date.getHours()
	let period: 'night' | 'morning' | 'afternoon' | 'evening'

	if (hour < 3) period = 'evening'
	else if (hour < 5) period = 'night'
	else if (hour < 12) period = 'morning'
	else if (hour < 18) period = 'afternoon'
	else period = 'evening'

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

function zonedDate(timezone: string = 'auto'): Date {
	const isUTC = timezone.includes('+') || timezone.includes('-') // temp
	const date = new Date()

	if (timezone === 'auto') {
		return date
	}

	if (isUTC) {
		const offset = date.getTimezoneOffset() / 60 // hour
		let utcHour = date.getHours() + offset
		const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
		let minutes

		if (timezone.split('.')[1]) {
			minutes = utcMinutes + parseInt(timezone.split('.')[1])

			if (minutes > -30) {
				utcHour++
			}
		} else {
			minutes = date.getMinutes()
		}

		date.setHours(utcHour + parseInt(timezone), minutes)

		return date
	}

	const intl = new Intl.DateTimeFormat('en-UK', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'medium' })
	const zonedDate = new Date(intl.format(date))

	return zonedDate
}

function fixunits(val: number) {
	return (val < 10 ? '0' : '') + val.toString()
}

function isFace(str = ''): str is Sync.Clock['face'] {
	return ['none', 'number', 'roman', 'marks'].includes(str)
}

function isStyle(str = ''): str is Sync.Clock['style'] {
	return ['round', 'square', 'transparent'].includes(str)
}

function isDateFormat(str = ''): str is DateFormat {
	return ['auto', 'eu', 'us', 'cn'].includes(str)
}
