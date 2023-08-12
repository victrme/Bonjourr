import { canDisplayInterface } from '..'
import { syncDefaults } from '../utils'
import { Sync, Clock } from '../types/sync'
import { tradThis } from '../utils/translations'
import errorMessage from '../utils/errorMessage'
import storage from '../storage'

type ClockUpdate = {
	ampm?: boolean
	analog?: boolean
	seconds?: boolean
	usdate?: boolean
	greeting?: string
	timezone?: string
	style?: string
	face?: string
}

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const rand = Math.random() > 0.8 ? 1 : 0

let lazyClockInterval: number

function zonedDate(timezone: string = 'auto') {
	const date = new Date()

	if (timezone === 'auto') return date

	const offset = date.getTimezoneOffset() / 60 // hour
	let utcHour = date.getHours() + offset

	const utcMinutes = date.getMinutes() + date.getTimezoneOffset()
	// const minutes = timezone.split('.')[1] ? utcMinutes + parseInt(timezone.split('.')[1]) : date.getMinutes()

	let minutes
	if (timezone.split('.')[1]) {
		minutes = utcMinutes + parseInt(timezone.split('.')[1])

		if (minutes > -30) utcHour++
	} else minutes = date.getMinutes()

	date.setHours(utcHour + parseInt(timezone), minutes)

	return date
}

function clockDate(date: Date, usdate: boolean) {
	const datedom = document.getElementById('date') as HTMLParagraphElement
	const jour = tradThis(days[date.getDay()])
	const mois = tradThis(months[date.getMonth()])
	const chiffre = date.getDate()

	datedom.textContent = usdate ? `${jour}, ${mois} ${chiffre}` : `${jour} ${chiffre} ${mois}`
}

function greetings(date: Date, name?: string) {
	const hour = date.getHours()
	let greet = 'Good evening'

	if (hour < 3) {
		greet = 'Good evening'
	} else if (hour < 5) {
		greet = ['Good night', 'Sweet dreams'][rand]
	} else if (hour < 12) {
		greet = 'Good morning'
	} else if (hour < 18) {
		greet = 'Good afternoon'
	}

	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	domgreetings.style.textTransform = name ? 'none' : 'capitalize'
	domgreetings.textContent = tradThis(greet) + (name ? `, ${name}` : '')
}

function changeAnalogFace(face = 'none') {
	//
	// Clockwise
	const chars = {
		none: ['', '', '', ''],
		number: ['12', '3', '6', '9'],
		roman: ['XII', 'III', 'VI', 'IX'],
		marks: ['│', '─', '│', '─'],
	}

	document
		.querySelectorAll('#analogClock .numbers')
		.forEach((mark, i) => (mark.textContent = chars[face as keyof typeof chars][i]))
}

function changeAnalogStyle(style?: string) {
	document.getElementById('analogClock')?.setAttribute('class', style || '')
}

function startClock(clock: Clock, greeting: string, usdate: boolean) {
	//
	function display() {
		document.getElementById('time-container')?.classList.toggle('analog', clock.analog)
		document.getElementById('analogSeconds')?.classList.toggle('hidden', !clock.seconds)
	}

	function clockInterval() {
		function numerical(date: Date) {
			const fixunits = (val: number) => (val < 10 ? '0' : '') + val.toString()

			let h = clock.ampm ? date.getHours() % 12 : date.getHours(),
				m = fixunits(date.getMinutes()),
				s = fixunits(date.getSeconds())

			if (clock.ampm && h === 0) {
				h = 12
			}

			const domclock = document.getElementById('clock')

			if (domclock) {
				domclock?.classList.toggle('zero', !clock.ampm && h < 10) // Double zero on 24h
				domclock.textContent = `${h}:${m}${clock.seconds ? ':' + s : ''}`
			}
		}

		function analog(date: Date) {
			const rotation = (elem: HTMLElement | null, val: number) => {
				if (elem) {
					elem.style.transform = `rotate(${val}deg)`
				}
			}

			let s = date.getSeconds() * 6,
				m = (date.getMinutes() + date.getSeconds() / 60) * 6,
				h = ((date.getHours() % 12) + date.getMinutes() / 60) * 30

			rotation(document.getElementById('hours'), h)
			rotation(document.getElementById('minutes'), m)

			if (clock.seconds) {
				rotation(document.getElementById('analogSeconds'), s)
			}
		}

		// Control
		const date = zonedDate(clock.timezone)
		clock.analog ? analog(date) : numerical(date)

		// Midnight, change date
		if (date.getHours() === 0 && date.getMinutes() === 0) {
			clockDate(date, usdate)
		}

		// Hour change
		if (date.getMinutes() === 0) {
			greetings(date, greeting)
		}
	}

	if (lazyClockInterval) {
		clearInterval(lazyClockInterval)
	}

	display()
	clockInterval()
	lazyClockInterval = setInterval(clockInterval, 1000)
}

async function clockUpdate({ ampm, analog, seconds, usdate, greeting, timezone, style, face }: ClockUpdate) {
	const data = await storage.get(['clock', 'usdate', 'greeting'])
	let clock = data?.clock

	if (!clock || data.usdate === undefined || data.greeting === undefined) {
		return
	}

	if (usdate !== undefined) {
		clockDate(zonedDate(clock.timezone), usdate)
		storage.set({ usdate })
	}

	if (greeting !== undefined) {
		greetings(zonedDate(clock.timezone), greeting)
		storage.set({ greeting })
	}

	if (timezone !== undefined) {
		clockDate(zonedDate(timezone), data.usdate)
		greetings(zonedDate(timezone), greeting)
	}

	clock = {
		...clock,
		ampm: ampm ?? clock.ampm,
		face: face ?? clock.face,
		style: style ?? clock.style,
		analog: analog ?? clock.analog,
		seconds: seconds ?? clock.seconds,
		timezone: timezone ?? clock.timezone,
	}

	storage.set({ clock })
	startClock(clock, data.greeting, data.usdate)
	changeAnalogFace(clock.face)
	changeAnalogStyle(clock.style)
}

export default function clock(init: Sync | null, event?: ClockUpdate) {
	if (event) {
		clockUpdate(event)
		return
	}

	let clock = init?.clock ?? { ...syncDefaults.clock }

	try {
		startClock(clock, init?.greeting || '', init?.usdate || false)
		clockDate(zonedDate(clock.timezone), init?.usdate || false)
		greetings(zonedDate(clock.timezone), init?.greeting || '')
		changeAnalogFace(clock.face)
		changeAnalogStyle(clock.style)
		canDisplayInterface('clock')
	} catch (e) {
		errorMessage(e)
	}
}
