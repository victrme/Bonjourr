import { getLang, tradThis } from '../utils/translations'
import { displayInterface } from '../index'
import { SYNC_DEFAULT } from '../defaults'
import errorMessage from '../utils/errormessage'
import storage from '../storage'

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
}

type DateFormat = Sync.Storage['dateformat']

const oneInFiveRandom = Math.random() > 0.8 ? 1 : 0
let clockInterval: number

export default function clock(init?: Sync.Storage, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	let clock = init?.clock ?? { ...SYNC_DEFAULT.clock }

	try {
		startClock(clock, init?.greeting || '', init?.dateformat || 'eu')
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

async function clockUpdate({ ampm, analog, seconds, dateformat, greeting, timezone, style, face, size }: ClockUpdate) {
	const data = await storage.sync.get(['clock', 'dateformat', 'greeting'])
	let clock = data?.clock

	if (!clock || data.dateformat === undefined || data.greeting === undefined) {
		return
	}

	if (analog !== undefined) {
		document.getElementById('analog_options')?.classList.toggle('shown', analog)
		document.getElementById('digital_options')?.classList.toggle('shown', !analog)
	}

	if (isDateFormat(dateformat)) {
		clockDate(zonedDate(clock.timezone), dateformat)
		storage.sync.set({ dateformat })
	}

	if (greeting !== undefined) {
		greetings(zonedDate(clock.timezone), greeting)
		storage.sync.set({ greeting })
	}

	if (timezone !== undefined) {
		clockDate(zonedDate(timezone), data.dateformat)
		greetings(zonedDate(timezone), data.greeting)
	}

	clock = {
		...clock,
		ampm: ampm ?? clock.ampm,
		size: size ?? clock.size,
		analog: analog ?? clock.analog,
		seconds: seconds ?? clock.seconds,
		timezone: timezone ?? clock.timezone,
		face: isFace(face) ? face : clock.face,
		style: isStyle(style) ? style : clock.style,
	}

	storage.sync.set({ clock })
	startClock(clock, data.greeting, data.dateformat)
	analogFace(clock.face)
	analogStyle(clock.style)
	clockSize(clock.size)
}

function analogFace(face = 'none') {
	const spans = document.querySelectorAll<HTMLSpanElement>('#analog span')

	spans.forEach((span, i) => {
		if (face === 'none') span.textContent = ['', '', '', ''][i]
		if (face === 'number') span.textContent = ['12', '3', '6', '9'][i]
		if (face === 'roman') span.textContent = ['XII', 'III', 'VI', 'IX'][i]
		if (face === 'marks') span.textContent = ['│', '―', '│', '―'][i]
	})
}

function analogStyle(style?: string) {
	document.getElementById('analog')?.setAttribute('class', style || '')
}

function clockSize(size = 1) {
	document.documentElement.style.setProperty('--clock-size', size.toString() + 'em')
}

//
//	Clock
//

function startClock(clock: Sync.Clock, greeting: string, dateformat: DateFormat) {
	document.getElementById('time')?.classList.toggle('analog', clock.analog)
	document.getElementById('time')?.classList.toggle('seconds', clock.seconds)

	clearInterval(clockInterval)
	start()

	clockInterval = setInterval(start, 1000)

	function start() {
		const date = zonedDate(clock.timezone)
		const isNextHour = date.getMinutes() === 0

		if (clock.analog) {
			analog(date, clock.seconds)
		} else {
			digital(date, clock.ampm)
		}

		if (isNextHour) {
			clockDate(date, dateformat)
			greetings(date, greeting)
		}
	}
}

function digital(date: Date, ampm: boolean) {
	const domclock = document.getElementById('digital')
	const hh = document.getElementById('digital-hh') as HTMLElement
	const mm = document.getElementById('digital-mm') as HTMLElement
	const ss = document.getElementById('digital-ss') as HTMLElement

	const m = fixunits(date.getMinutes())
	const s = fixunits(date.getSeconds())
	let h = ampm ? date.getHours() % 12 : date.getHours()

	if (ampm && h === 0) {
		h = 12
	}

	domclock?.classList.toggle('zero', !ampm && h < 10)

	hh.textContent = h.toString()
	mm.textContent = m.toString()
	ss.textContent = s.toString()
}

function analog(date: Date, seconds: boolean) {
	const m = ((date.getMinutes() + date.getSeconds() / 60) * 6).toFixed(1)
	const h = (((date.getHours() % 12) + date.getMinutes() / 60) * 30).toFixed(1)
	const s = (date.getSeconds() * 6).toFixed(1)

	document.getElementById('analog-hours')?.style.setProperty('--deg', `${h}deg`)
	document.getElementById('analog-minutes')?.style.setProperty('--deg', `${m}deg`)

	if (!seconds) {
		return
	}

	document.getElementById('analog-seconds')?.style.setProperty('--deg', `${s}deg`)
}

//
//	Date
//

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clockDate(date: Date, dateformat: DateFormat) {
	const datedom = document.getElementById('date') as HTMLElement
	const aa = document.getElementById('date-aa') as HTMLElement
	const bb = document.getElementById('date-bb') as HTMLElement
	const cc = document.getElementById('date-cc') as HTMLElement

	const lang = getLang()
	const useSinograms = lang.includes('zh') || lang.includes('jp')
	const day = date.getDate().toString() + (useSinograms ? '日' : '')
	const weekday = tradThis(days[date.getDay()])
	const month = tradThis(months[date.getMonth()])

	datedom.classList.remove('eu', 'us', 'cn')
	datedom.classList.add(dateformat)

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

//
//	Greetings
//

function greetings(date: Date, name?: string) {
	const hour = date.getHours()
	let greet = 'Good evening'

	if (hour < 3) {
		greet = 'Good evening'
	} else if (hour < 5) {
		greet = ['Good night', 'Sweet dreams'][oneInFiveRandom]
	} else if (hour < 12) {
		greet = 'Good morning'
	} else if (hour < 18) {
		greet = 'Good afternoon'
	}

	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	const domgreeting = document.getElementById('greeting') as HTMLSpanElement
	const domname = document.getElementById('greeting-name') as HTMLSpanElement

	domgreetings.style.textTransform = name ? 'none' : 'capitalize'
	domgreeting.textContent = tradThis(greet) + (name ? ', ' : '')
	domname.textContent = name ?? ''
}

//
// Helpers
//

function zonedDate(timezone: string = 'auto') {
	const date = new Date()

	if (timezone === 'auto') {
		return date
	}

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
	return ['eu', 'us', 'cn'].includes(str)
}
