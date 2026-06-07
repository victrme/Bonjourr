import { setUserDate, userDate } from '../../shared/time.ts'
import { displayGreetings } from './greetings.ts'
import { clockDate } from './date.ts'
import { fixunits } from './helpers.ts'

import type { Clock, WorldClock } from '../../../types/sync.ts'
import type { DateFormat } from './date.ts'
import type { Greetings } from './greetings.ts'

export interface ClockStartOptions {
    clock: Clock
    world: WorldClock[]
    dateformat: DateFormat
    greetings: Greetings
}

let clockInterval: ReturnType<typeof setTimeout>
let clockVisibilityListener: (() => void) | null = null

export function startClock(options: ClockStartOptions): void {
    const { clock, world, dateformat, greetings } = options

    document.getElementById('time')?.classList.toggle('is-analog', clock.analog)
    document.getElementById('time')?.classList.toggle('seconds', clock.seconds)

    document.querySelectorAll('.clock-wrapper').forEach((node, index) => {
        if (index > 0) {
            node.remove()
        }
    })

    const clocks: WorldClock[] = []

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

    if (clockVisibilityListener) {
        document.removeEventListener('visibilitychange', clockVisibilityListener)
    }

    if (!document.hidden) {
        clockInterval = setInterval(start, 1000)
    }

    clockVisibilityListener = () => {
        clearInterval(clockInterval)
        if (!document.hidden) {
            start()
            clockInterval = setInterval(start, 1000)
        }
    }
    document.addEventListener('visibilitychange', clockVisibilityListener)

    function start(firstStart?: true): void {
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

function digital(wrapper: HTMLElement, clock: Clock, timezone: string): void {
    const date = userDate(timezone)
    const domclock = wrapper.querySelector<HTMLElement>('.digital')
    const hh = wrapper.querySelector<HTMLElement>('.digital-hh')
    const mm = wrapper.querySelector<HTMLElement>('.digital-mm')
    const ss = wrapper.querySelector<HTMLElement>('.digital-ss')

    const m = fixunits(date.getMinutes())
    const s = fixunits(date.getSeconds())
    let h = clock.ampm ? date.getHours() % 12 : date.getHours()

    if (!domclock || !hh || !mm || !ss) {
        return
    }

    if (clock.ampmlabel) {
        domclock.dataset.ampmLabel = clock.ampmposition ?? 'top-left'
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

    domclock.classList.toggle('zero', !clock.ampm && h < 10)

    hh.textContent = h.toString()
    mm.textContent = m.toString()
    ss.textContent = s.toString()
}

function analog(wrapper: HTMLElement, clock: Clock, timezone: string): void {
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
