import type { Pomodoro } from '../../types/sync.ts'
import type { PomodoroMode } from '../../types/shared.ts'
import { displayInterface } from '../shared/display.ts'
import { storage } from '../storage.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { turnRefreshButton } from '../shared/dom.ts'
import { tabTitle } from './others.ts'

type PomodoroUpdate = {
	on?: boolean
    end?: number
    mode?: PomodoroMode
    pause?: number
    focus?: boolean
    time_for?: Partial<Record<PomodoroMode, number>>
}

let currentPomodoroData: Pomodoro

const pomodoroContainer = document.getElementById('pomodoro_container') as HTMLDivElement
const pomodoroStart = document.getElementById('pmdr_start') as HTMLButtonElement
const pomodoroPause = document.getElementById('pmdr_pause') as HTMLButtonElement
const pomodoroReset = document.getElementById('pmdr_reset') as HTMLButtonElement
const timer_dom = document.getElementById('pmdr_timer') as HTMLSpanElement
const radioButtons = document.querySelectorAll('#pmdr_modes input[type="radio"]')
const focusButton = document.getElementById('pmdr-focus') as HTMLInputElement

const broadcast = new BroadcastChannel('pomodoro') as BroadcastChannel // to communicate with other tabs
let countdown: number

const setModeButton = (value = '') => (document.getElementById(`pmdr-${value}`) as HTMLInputElement).checked = true
const getTimeForMode = (mode: PomodoroMode = currentPomodoroData.mode!): number =>
    currentPomodoroData.time_for[mode]

function handleToggle(state: boolean) {
	pomodoroContainer?.classList.toggle('hidden', !state)
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
    if (update) {
        updatePomodoro(update)
        return
    }

    if (init) {
        init.on ? initPomodoro(init) : onSettingsLoad(() => initPomodoro(init))
    }
}

function initPomodoro(init: Pomodoro) {
    currentPomodoroData = init

    handleToggle(init.on)
    displayInterface('pomodoro')

    togglePomodoroFocus(init.focus && init.on)

    handleUserInput()
    initTimer(init)
    setModeButton(init.mode)

    listenToBroadcast()
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
            time: getTimeForMode(currentPomodoroData.mode)
        })
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

        broadcast.postMessage({
            type: 'toggle-focus',
            on: focusIsChecked
        })
    })
}

function listenToBroadcast() {
    // receiving data from other tabs
    broadcast.onmessage = ({ data = {} }) => {
        if (data.type === "start-pomodoro") {
            startTimer(true, data.time)
        } else if (data.type === "switch-mode") {
            setModeButton(data.mode)
            switchMode(data.mode)
        } else if (data.type === "pause-pomodoro") {
            pauseTimer()
        } else if (data.type === "toggle-focus") {
            togglePomodoroFocus(data.on)
        } else if (data.type === "reset-pomodoro") {
            resetTimer()
        }
    }
}

async function switchMode(mode: PomodoroMode) {
    stopTimer()

    // save
    updatePomodoro({
        mode: mode,
        end: 0,
        pause: 0
    })

    insertTime(getTimeForMode(mode), false)

    // select animation
    let radioBtn = document.querySelector<HTMLInputElement>(`#pmdr_modes input#pmdr-${mode}`)
    let glider = document.querySelector('.glider') as HTMLSpanElement

    if (glider && radioBtn?.parentElement) {
        let offsetLeft = radioBtn.parentElement.offsetLeft
        let offsetWidth = radioBtn.parentElement.offsetWidth
    
        glider.style.left = `${offsetLeft}px`
        glider.style.width = `${offsetWidth}px`
    }

}

async function initTimer(pomodoro: Pomodoro) {
    if (pomodoro.end && Date.now() < pomodoro.end) { // running timer
        startTimer()
    } else if (!pomodoro.end || Date.now() > pomodoro.end) { // default unstarted timer
        switchMode(pomodoro.mode as PomodoroMode)
    }
}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good
async function startTimer(fromButton: boolean = false, time?: number) {
    stopTimer()

    const { pomodoro } = await storage.sync.get(['pomodoro'])
    const defaultTime = time ?? getTimeForMode(pomodoro.mode)
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
        return 0
    }

    return secondsLeft
}


function insertTime(seconds: number, timerIsStarted: boolean = true) {
    if (!timer_dom) return

    const minutes = Math.floor(seconds / 60)
    const secondsRemaining = seconds % 60
    const displayTime = `${minutes}:${secondsRemaining < 10 ? "0" : ""}${secondsRemaining}`

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
        newTitle = `Time's up! | ${afterPipe}`

        setTimeout(() => {
            tabTitle(afterPipe) // resets to the original tab title
        }, 30000)
    }

    tabTitle(newTitle)
}

export async function togglePomodoroFocus(focus: boolean) {
    focusButton.checked = focus

    // needed for sliding animation 
    const enablingFocus = focus && !currentPomodoroData.focus
    const disablingFocus = !focus && currentPomodoroData.focus
    const switching = disablingFocus || enablingFocus

    await updatePomodoro({ focus })

    // if not switching, no animation (for when toggling from page refresh or smt)
    // also animation won't play if the tab isn't open 
    if (switching && document.visibilityState === 'visible') {
        const originalRect = pomodoroContainer.getBoundingClientRect()

        // Clone the element
        const clone = pomodoroContainer.cloneNode(true) as HTMLDivElement
            clone.style.position = 'absolute'
            clone.style.top = originalRect.top + 'px'
            clone.style.left = originalRect.left + 'px'

        document.body.appendChild(clone)
        
        // Apply focus mode to the DOM so we can measure the target position
        pomodoroContainer.style.visibility = 'hidden'
        document.body.classList.toggle('pomodoro-focus', enablingFocus)

        // once the original pomodoro is moved to its final location, stores and figures out its position 
        const targetRect = pomodoroContainer.getBoundingClientRect()
        const deltaX = targetRect.left - originalRect.left
        const deltaY = targetRect.top - originalRect.top

        // Start the animation
        requestAnimationFrame(() => {
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

async function updatePomodoro({ on, end, mode, pause, focus, time_for }: PomodoroUpdate) {
    const data = await storage.sync.get(['pomodoro'])

    if (on !== undefined) {
        data.pomodoro.on = on
    }

    if (end !== undefined) {
        data.pomodoro.end = end
    }

    if (mode) {
        data.pomodoro.mode = mode
    }

    if (pause !== undefined) {
        data.pomodoro.pause = pause
    }

    if (focus !== undefined) {
        data.pomodoro.focus = focus
    }

    if (time_for) {
        for (const mode of Object.keys(time_for) as PomodoroMode[]) {
            const value = time_for[mode]

            if (value !== undefined) {
                data.pomodoro.time_for[mode] = value * 60
            }
        }
    }
    
    await storage.sync.set({ pomodoro: data.pomodoro })

    currentPomodoroData = data.pomodoro

    if (time_for) {
        resetTimer()
    }
}