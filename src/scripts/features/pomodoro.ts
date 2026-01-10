import { turnRefreshButton } from '../shared/dom.ts'
import { displayInterface } from '../shared/display.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { tradThis } from '../utils/translations.ts'
import { tabTitle } from './others.ts'
import { storage } from '../storage.ts'
import { TAB_ID } from '../defaults.ts'

import type { PomodoroMode } from '../../types/shared.ts'
import type { Pomodoro } from '../../types/sync.ts'

type PomodoroUpdate = {
	on?: boolean
	end?: number
	mode?: PomodoroMode
	pause?: number
	focus?: boolean
	sound?: boolean
	volume?: number
	alarm?: string
	timeFor?: Partial<Record<PomodoroMode, number>>
	history?: { endedAt: string; duration?: number }
}

type PomodoroHistoryEntry = {
	endedAt: string
	duration?: number
}

let currentPomodoroData: Pomodoro

const pomodoroContainer = document.getElementById('pomodoro_container') as HTMLDivElement
const pomodoroStart = document.getElementById('pmdr_start') as HTMLButtonElement
const pomodoroPause = document.getElementById('pmdr_pause') as HTMLButtonElement
const pomodoroReset = document.getElementById('pmdr_reset') as HTMLButtonElement
const timer_dom = document.getElementById('pmdr_timer') as HTMLSpanElement
const radioButtons = document.querySelectorAll('#pmdr_modes input[type="radio"]')
const focusButton = document.getElementById('pmdr-focus') as HTMLInputElement

// to communicate with other tabs
const broadcast = new BroadcastChannel('bonjourr_pomodoro') as BroadcastChannel

let countdown: number
let timeModeTimeout: number
let tabTitleTimeout: number
const timeBeforeReset = 10000 // time before the timer resets after the end

const setModeButton = (value = '') => {
	return (document.getElementById(`pmdr-${value}`) as HTMLInputElement).checked = true
}

const getTimeForMode = (mode: PomodoroMode): number => {
	return currentPomodoroData.timeFor[mode]
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
	if (update) {
		updatePomodoro(update)
		return
	}

	if (init?.on) {
		initPomodoro(init)
		return
	}
	if (init) {
		onSettingsLoad(() => {
			initPomodoro(init)
		})
	}
}

function initPomodoro(init: Pomodoro) {
	currentPomodoroData = init

	togglePomodoroFocus(init.focus && init.on)
	setModeButton(init.mode)
	handleToggle(init.on)
	initTimer(init)

	displayInterface('pomodoro')
	listenToBroadcast()
	handleUserInput()

	setPomodoroInfo(init.history)
}

// events
function handleUserInput() {
	// different modes
	radioButtons.forEach(function (btn) {
		btn.addEventListener('change', (e) => {
			const newMode = (e.target as HTMLInputElement).value as PomodoroMode

			switchMode(newMode, true)

			broadcast.postMessage({
				type: 'switch-mode',
				mode: newMode,
			})
		})
	})

	pomodoroStart?.addEventListener('click', () => {
		if (currentPomodoroData.mode) {
			storage.sync.get().then((sync) => {
				startTimer(sync.pomodoro, true)
			})

			broadcast.postMessage({
				type: 'start-pomodoro',
				time: getTimeForMode(currentPomodoroData.mode),
			})
		}
	})

	pomodoroPause?.addEventListener('click', () => {
		pauseTimer()

		broadcast.postMessage({
			type: 'pause-pomodoro',
		})
	})

	pomodoroReset?.addEventListener('pointerdown', (e) => {
		resetTimer()

		broadcast.postMessage({
			type: 'reset-pomodoro',
		})

		turnRefreshButton(e, true)
	})

	focusButton?.addEventListener('change', (e) => {
		const focusIsChecked = (e.target as HTMLInputElement).checked as boolean

		togglePomodoroFocus(focusIsChecked)
		updatePomodoro({ focus: focusIsChecked })

		broadcast.postMessage({
			type: 'toggle-focus',
			on: focusIsChecked,
		})
	})

	// makes mode buttons and focus button accessible to keyboard inputs
	document.querySelectorAll<HTMLElement>('.pomodoro_mode, #focus-toggle').forEach((el) => {
		el.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.code === 'Space' || e.code === 'Enter') {
				const input = el.querySelector<HTMLInputElement>('input[type="radio"], input[type="checkbox"]')
				if (!input) return

				input.checked = !input.checked
				input.dispatchEvent(new Event('change', { bubbles: true }))

				e.preventDefault() // prevent page scroll on Space
			}
		})
	})
}

function listenToBroadcast() {
	// receiving data from other tabs

	broadcast.addEventListener('message', ({ data = {} }) => {
		if (data.type === 'start-pomodoro') {
			storage.sync.get().then((sync) => {
				startTimer(sync.pomodoro, true, data.time)
			})
		}
		if (data.type === 'switch-mode') {
			setModeButton(data.mode)
			switchMode(data.mode)
		}
		if (data.type === 'pause-pomodoro') {
			pauseTimer()
		}
		if (data.type === 'reset-pomodoro') {
			resetTimer()
		}
		if (data.type === 'toggle-focus') {
			togglePomodoroFocus(data.on)
		}
	})
}

function switchMode(mode: PomodoroMode, animate?: boolean, init?: boolean) {
	resetTimeouts()
	setModeGlider(mode, animate)
	stopTimer()
	insertTime(getTimeForMode(mode), false)

	if (!init) {
		updatePomodoro({ mode: mode, end: 0, pause: 0 })
	}
}

function resetTimeouts() {
	// if user interact with pomodoro before the end of the timeouts
	clearTimeout(tabTitleTimeout)
	clearTimeout(timeModeTimeout)
}

export function setModeGlider(mode?: PomodoroMode, animate?: boolean) {
	const pomodoroModes = document.querySelector<HTMLElement>('#pmdr_modes')
	const allModes = pomodoroModes?.querySelectorAll<HTMLElement>('.pomodoro_mode')
	const activeMode = pomodoroModes?.querySelector<HTMLElement>('.pomodoro_mode.active')
	const nextMode = pomodoroModes?.querySelector<HTMLElement>(`#pmdr-${mode}`)?.parentElement
	const glider = pomodoroModes?.querySelector<HTMLSpanElement>('span.glider')

	allModes?.forEach((div) => {
		div.classList.remove('active')
	})

	if (!animate) {
		nextMode?.classList.add('active')
		return
	}

	if (nextMode && glider) {
		const fromLeft = activeMode?.offsetLeft ?? 0
		const fromWidth = activeMode?.offsetWidth ?? 100
		const toLeft = nextMode.offsetLeft
		const toWidth = nextMode.offsetWidth

		glider.style.opacity = '1'
		glider.style.left = `${fromLeft}px`
		glider.style.width = `${fromWidth}px`

		setTimeout(() => {
			glider.style.left = `${toLeft}px`
			glider.style.width = `${toWidth}px`
			glider.classList.add('gliding')
		}, 16)

		setTimeout(() => {
			glider.removeAttribute('style')
			glider.classList.remove('gliding')
			nextMode.classList.add('active')
		}, 200)
	}
}

function initTimer(pomodoro: Pomodoro) {
	const isTimerRunning = pomodoro.end && Date.now() < pomodoro.end
	const isTimerDefaultStopped = !pomodoro.end || Date.now() > pomodoro.end

	if (isTimerRunning) {
		startTimer(pomodoro)
		return
	}

	if (isTimerDefaultStopped && pomodoro.mode) {
		switchMode(pomodoro.mode, false, true)
	}
}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good
function startTimer(pomodoro: Pomodoro, fromButton?: boolean, time?: number) {
	fromButton ??= false

	stopTimer()
	resetTimeouts()

	const mode = pomodoro.mode ?? 'pomodoro'
	const defaultTime = time ?? getTimeForMode(mode)
	const wasPaused = pomodoro.pause !== 0
	const now = Date.now()

	let remaining = 0

	if (wasPaused) {
		remaining = pomodoro.end - pomodoro.pause
	}

	if (fromButton) {
		if (wasPaused) {
			const newEnd = now + remaining

			startCountdown(newEnd)

			updatePomodoro({
				end: newEnd,
				pause: 0,
			})
		} else {
			// the time at which the time will be over
			const end = now + defaultTime * 1000

			updatePomodoro({
				end: end,
				pause: 0,
			})

			startCountdown(end)
		}
	} else { // from refresh/new tab
		setModeGlider(pomodoro.mode)

		if (wasPaused) {
			insertTime(calculateSecondsLeft(now + remaining), false)
		} else {
			startCountdown(pomodoro.end)
		}
	}
}

function startCountdown(endtime: number) {
	// inserted as soon as possible
	insertTime(calculateSecondsLeft(endtime))

	countdown = setInterval(() => {
		insertTime(calculateSecondsLeft(endtime))
	}, 100)

	toggleStartPause(true)
}

function pauseTimer() {
	stopTimer()

	updatePomodoro({
		pause: Date.now(),
	})
}

function toggleStartPause(started: boolean) {
	if (!pomodoroContainer) return
	pomodoroContainer.classList.toggle('started', started)
}

function stopTimer() {
	clearInterval(countdown)
	toggleStartPause(false)
}

function resetTimer() {
	switchMode(currentPomodoroData.mode as PomodoroMode)
}

function calculateSecondsLeft(end: number) {
	const secondsLeft = Math.round((end - Date.now()) / 1000)

	// time's up!
	if (secondsLeft <= 0) {
		stopTimer()
		ringTheAlarm()

		timeModeTimeout = setTimeout(() => {
			// resets the time mode to default
			switchMode(currentPomodoroData.mode as PomodoroMode)
		}, timeBeforeReset)

		return 0
	}

	return secondsLeft
}

function insertTime(seconds: number, timerIsStarted = true) {
	if (!timer_dom) {
		return
	}

	const minutes = Math.floor(seconds / 60)
	const secondsRemaining = seconds % 60
	const displayTime = `${minutes}:${secondsRemaining < 10 ? '0' : ''}${secondsRemaining}`

	// inserts to dom
	timer_dom.textContent = displayTime

	handleTabTitle(displayTime, timerIsStarted)
}

function handleTabTitle(displayTime: string, timerIsStarted: boolean) {
	const originalTitle = document.title
	const match = originalTitle.match(/\| (.*)/)
	const afterPipe = match?.[1] ?? originalTitle

	let newTitle: string

	if (displayTime !== '0:00') {
		newTitle = timerIsStarted ? `${displayTime} | ${afterPipe}` : afterPipe
	} else {
		const timesUpString = tradThis("Time's up!")
		newTitle = `${timesUpString} | ${afterPipe}`

		tabTitleTimeout = setTimeout(() => {
			tabTitle(afterPipe) // resets to the original tab title
		}, timeBeforeReset)
	}

	tabTitle(newTitle)
}

function handleToggle(state: boolean) {
	pomodoroContainer?.classList.toggle('hidden', !state)
}

export function togglePomodoroFocus(focus: boolean) {
	// needed for sliding animation
	const enablingFocus = focus && !currentPomodoroData.focus
	const disablingFocus = !focus && currentPomodoroData.focus
	const switching = disablingFocus || enablingFocus

	focusButton.checked = focus
	currentPomodoroData.focus = focus

	if (!switching) {
		pomodoroContainer.classList.toggle('onFocus', focus)
		pomodoroContainer.classList.toggle('outOfFocus', !focus)
	}

	// if not switching, no animation (for when toggling from page refresh or smt)
	// also animation won't play if the tab isn't open
	if (switching && document.visibilityState === 'visible') {
		const originalRect = pomodoroContainer.getBoundingClientRect()

		// Clone the element
		const clone = pomodoroContainer.cloneNode(true) as HTMLDivElement
		clone.style.position = 'absolute'
		clone.style.top = originalRect.top + 'px'
		clone.style.left = originalRect.left + 'px'
		clone.style.fontSize = document.documentElement.style.getPropertyValue('--font-size')
		clone.style.fontFamily = document.documentElement.style.getPropertyValue('--font-family')
		clone.classList.add('clone')

		document.body.appendChild(clone)

		clone.classList.remove('onFocus', 'outOfFocus')
		clone.classList.toggle('onFocus', !enablingFocus)
		clone.classList.toggle('outOfFocus', enablingFocus)

		// Apply focus mode to the DOM so we can measure the target position
		pomodoroContainer.style.visibility = 'hidden'
		document.body.classList.toggle('pomodoro-focus', enablingFocus)

		pomodoroContainer.classList.toggle('onFocus', focus)
		pomodoroContainer.classList.toggle('outOfFocus', !focus)

		// once the original pomodoro is moved to its final location, stores and figures out its position
		const targetRect = pomodoroContainer.getBoundingClientRect()
		const deltaX = targetRect.left - originalRect.left
		const deltaY = targetRect.top - originalRect.top

		// Start the animation
		requestAnimationFrame(() => {
			clone.classList.remove('onFocus', 'outOfFocus')
			clone.classList.add(enablingFocus ? 'onFocus' : 'outOfFocus')
			clone.style.transform = `translate(${deltaX}px, ${deltaY}px)`
		})

		// Cleanup after animation
		clone.addEventListener('transitionend', (e) => {
			if (e.propertyName !== 'transform') return

			// sets visibility back to real pomodoro
			pomodoroContainer.style.visibility = 'visible'

			// yeets the clone
			clone.remove()
		})
	} else {
		document.body.classList.toggle('pomodoro-focus', focus)
	}
}

function ringTheAlarm() {
	const alarmSound = new Audio('src/assets/sounds/clock-alarm-classic.mp3')

	// only triggers on the last active tab
	const lastTab = localStorage.getItem('lastActiveTab')
	const willRingAndSave = lastTab === TAB_ID

	if (willRingAndSave) {
		if (currentPomodoroData.sound) {
			alarmSound.volume = 0.6
			alarmSound.play()
		}

		// if pomodoro ends, registers new session
		if (currentPomodoroData.mode === 'pomodoro') {
			updatePomodoro({
				history: {
					endedAt: Date.now().toString(),
				},
			})
		}
	} else {
		console.info("Alarm is ringing, but this isn't the active tab.", {
			lastTab,
			TAB_ID,
		})
	}
}

function setPomodoroInfo(history: PomodoroHistoryEntry[]) {
	const now = new Date()

	let pomsToday = 0
	let pomsWeek = 0
	let pomsMonth = 0

	// Get start of today, week, and month
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

	// Monday as first day of week
	const startOfWeek = new Date(now)
	const day = (now.getDay() + 6) % 7
	startOfWeek.setDate(now.getDate() - day)
	startOfWeek.setHours(0, 0, 0, 0)

	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

	for (const entry of history) {
		const endedAt = new Date(Number(entry.endedAt))

		if (endedAt >= startOfToday) pomsToday++
		if (endedAt >= startOfWeek) pomsWeek++
		if (endedAt >= startOfMonth) pomsMonth++
	} // Update the DOM

	;(document.getElementById('poms-today') as HTMLSpanElement).textContent = pomsToday.toString()
	;(document.getElementById('poms-week') as HTMLSpanElement).textContent = pomsWeek.toString()
	;(document.getElementById('poms-month') as HTMLSpanElement).textContent = pomsMonth.toString()
}

async function updatePomodoro(update: PomodoroUpdate) {
	const data = await storage.sync.get(['pomodoro'])

	if (update.on !== undefined) {
		data.pomodoro.on = update.on
	}

	if (update.sound !== undefined) {
		data.pomodoro.sound = update.sound
	}

	if (update.alarm) {
		console.log(update.alarm)
	}

	if (update.volume) {
		console.log(update.volume)
	}

	if (update.end !== undefined) {
		data.pomodoro.end = update.end
	}

	if (update.mode) {
		data.pomodoro.mode = update.mode
	}

	if (update.pause !== undefined) {
		data.pomodoro.pause = update.pause
	}

	if (update.focus !== undefined) {
		data.pomodoro.focus = update.focus
	}

	if (update.history !== undefined) {
		data.pomodoro.history.push({
			endedAt: update.history.endedAt,
			duration: data.pomodoro.timeFor['pomodoro'],
		})
	}

	// the time defined by the user for each mode (pomodoro, break...)
	if (update.timeFor) {
		const { timeFor } = update

		for (const mode of Object.keys(timeFor) as PomodoroMode[]) {
			const value = timeFor[mode]

			if (value !== undefined) {
				data.pomodoro.timeFor[mode] = value * 60
			}
		}
	}

	await storage.sync.set({ pomodoro: data.pomodoro })

	currentPomodoroData = data.pomodoro

	// known flaw: sessions are only up to date on the ringing tab
	setPomodoroInfo(data.pomodoro.history)

	if (update.timeFor) {
		resetTimer()
	}
}
