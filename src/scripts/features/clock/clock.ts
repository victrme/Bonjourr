import { fixunits, getSecondsWidthInCh, setSecondsWidthInCh } from './helpers.ts'
import { setUserDate, userDate } from '../../shared/time.ts'
import { displayGreetings } from './greetings.ts'
import { clockDate } from './date.ts'

import type { Clock, WorldClock } from '../../../types/sync.ts'
import type { DateFormat } from './date.ts'
import type { Greetings } from './greetings.ts'

export interface ClockStartOptions {
	clock: Clock
	world: WorldClock[]
	dateformat: DateFormat
	greetings: Greetings
}

let clockInterval: number

export function startClock(options: ClockStartOptions) {
	const { clock, world, dateformat, greetings } = options

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

		displayGreetings(greetings)
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

	// Avoid layout shifts every second by rounding width
	if (clock.seconds) {
		const second = date.getSeconds() < 10 ? 0 : Math.floor(date.getSeconds() / 10)
		const width = getSecondsWidthInCh(second).toFixed(1)
		domclock.style.setProperty('--seconds-width', `${width}ch`)
	}

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
