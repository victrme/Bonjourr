import type { Pomodoro } from '../../types/sync.ts'
import type { PomodoroMode } from '../../types/shared.ts'
import { displayInterface } from '../shared/display.ts'
import { storage } from '../storage.ts'

type PomodoroUpdate = {
	on?: boolean
    end?: number
    mode?: PomodoroMode
    pause?: number
}

let currentPomodoroData: Pomodoro

const pomodoroContainer = document.getElementById('pomodoro_container') as HTMLDivElement
const pomodoroStart = document.getElementById('pmdr_start') as HTMLButtonElement
const pomodoroPause = document.getElementById('pmdr_pause') as HTMLButtonElement
const timer_dom = document.getElementById('pmdr_timer') as HTMLSpanElement
const radioButtons = document.querySelectorAll('#pmdr_modes input[type="radio"]')

const broadcast = new BroadcastChannel('pomodoro') as BroadcastChannel // to communicate with other tabs
let countdown: number

const setModeButton = (value = '') => (document.getElementById(`pmdr-${value}`) as HTMLInputElement).checked = true
const getTimeForMode = (mode: PomodoroMode = currentPomodoroData.mode!): number =>
    currentPomodoroData.time_for[mode]

function stopTimer() {
    clearInterval(countdown)
    toggleStartPause(false)
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
    if (update) {
		updatePomodoro(update)
		return
	}

    if (!init) {
        return
    }

    currentPomodoroData = init

    // makes pomodoro show up in #interface
    pomodoroContainer?.classList.toggle('hidden', !init.on)
    displayInterface('pomodoro')

    handleUserInput()
    setModeButton(init.mode)

    // receiving data from other tabs
    broadcast.onmessage = ({ data = {} }) => {
        if (data.type === "start-pomodoro") {
            startTimer(true)
        } else if (data.type === "switch-mode") {
            setModeButton(data.mode)
            switchMode(data.mode)
        } else if (data.type === "pause-pomodoro") {
            pauseTimer()
        }
    }

    initTimer(init)
}

// events 
function handleUserInput() {
    // different modes
    radioButtons.forEach(function(btn) {
        btn.addEventListener('change', (e) => {
            const newMode = (e.target as HTMLInputElement).value as PomodoroMode

            switchMode(newMode)

            broadcast.postMessage({
                type: 'switch-mode',
                mode: newMode
            })
        })
    })

    pomodoroStart?.addEventListener('click', () => {
        startTimer(true)

        broadcast.postMessage({
            type: 'start-pomodoro',
        })
    })

    pomodoroPause?.addEventListener('click', () => {
        pauseTimer()

        broadcast.postMessage({
            type: 'pause-pomodoro',
        })
    })
}

async function switchMode(mode: PomodoroMode) {
    stopTimer()

    // save
    updatePomodoro({
        mode: mode,
        end: 0,
        pause: 0
    })

    insertTime(getTimeForMode(mode))
}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good

async function initTimer(pomodoro: Pomodoro) {
    console.info(pomodoro)
    
    if (pomodoro.end && Date.now() < pomodoro.end) { // running timer
        startTimer()
    } else if (!pomodoro.end || Date.now() > pomodoro.end) { // default unstarted timer
        switchMode(pomodoro.mode as PomodoroMode)
    }
}

async function startTimer(fromButton: boolean = false) {
    stopTimer()

    const { pomodoro } = await storage.sync.get(['pomodoro'])
    const defaultTime = getTimeForMode(pomodoro.mode)
    const wasPaused = pomodoro.pause !== 0
    const now = Date.now()

    let remaining: number = 0

    if (wasPaused) {
        remaining = pomodoro.end - pomodoro.pause
    }

    if (fromButton) {
        if (wasPaused) {
            console.info("From event: timer resumed")

            const newEnd = now + remaining

            startCountdown(newEnd)

            updatePomodoro({
                end: newEnd,
                pause: 0
            })
        } else {
            console.info("From event: new timer started")
            
            // the time at which the time will be over
            let end = now + defaultTime * 1000

            updatePomodoro({
                end: end,
                pause: 0
            })

            startCountdown(end)
        }

    } else { // from refresh/new tab
        if (wasPaused) {
            console.info("After refresh: timer paused")
            
            insertTime(calculateSecondsLeft(now + remaining))
        } else {
            console.info('After refresh: timer resumed')
            startCountdown(pomodoro.end)
        }
    }
}

function startCountdown(endtime: number) {
    countdown = setInterval(() => {
        insertTime(calculateSecondsLeft(endtime))
    }, 10)

    toggleStartPause(true)
}

async function pauseTimer() {
    console.info('pause!')
    stopTimer()

    updatePomodoro({
        pause: Date.now()
    })
}

function calculateSecondsLeft(end: number) {
    const secondsLeft = Math.round((end - Date.now()) / 1000);

    // time's up
    if (secondsLeft <= 0) {
        stopTimer()
    }

    return secondsLeft
}

function insertTime(seconds: number) {
    if (!timer_dom) return

    const minutes = Math.floor(seconds / 60)
    const secondsRemaining = seconds % 60
    const displayTime = `${minutes}:${secondsRemaining < 10 ? "0" : ""}${secondsRemaining}`

    timer_dom.textContent = displayTime
}

async function updatePomodoro({ end, mode, pause }: PomodoroUpdate) {
    const data = await storage.sync.get(['pomodoro'])

    if (end !== undefined) {
        data.pomodoro.end = end
    }

    if (mode) {
        data.pomodoro.mode = mode
    }

    if (pause !== undefined) {
        data.pomodoro.pause = pause
    }
    
    storage.sync.set({ pomodoro: data.pomodoro })

    currentPomodoroData = data.pomodoro
}

function toggleStartPause(started: boolean) {
    if (!pomodoroContainer) return
    pomodoroContainer.classList.toggle('started', started)
}