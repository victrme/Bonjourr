import type { Pomodoro } from '../../types/sync.ts'
import type { PomodoroMode } from '../../types/shared.ts'
import { displayInterface } from '../shared/display.ts'
import { storage } from '../storage.ts'

type PomodoroUpdate = {
	on?: boolean
    end?: number
    mode?: PomodoroMode
    pause?: number | false
}

interface Time {
  start: number
  end?: number
}

let currentPomodoroData: Pomodoro

const pomodoroStart = document.getElementById('pmdr_start') as HTMLButtonElement
const pomodoroPause = document.getElementById('pmdr_pause') as HTMLButtonElement
const radioButtons = document.querySelectorAll('#pmdr_modes input[type="radio"]')

const broadcast = new BroadcastChannel('pomodoro') as BroadcastChannel // to communicate with other tabs
let countdown: number

const setModeButton = (value = '') => (document.getElementById(`pmdr-${value}`) as HTMLInputElement).checked = true
const getTimeForMode = (mode: PomodoroMode = currentPomodoroData.mode!) =>
	currentPomodoroData.time_for[mode]


function stopTimer() {
    clearInterval(countdown)
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
    document.getElementById('pomodoro_container')?.classList.toggle('hidden', !init.on)
    displayInterface('pomodoro')

    handleUserInput()
    setModeButton(init.mode)

    // receiving data from other tabs
    broadcast.onmessage = ({ data = {} }) => {
        if (data.type === "start-pomodoro") {
            startTimer()
        } else if (data.type === "switch-mode") {
            setModeButton(data.mode)
            switchMode(data.mode)
        }
    }

    // on page init, if end is in the future, then the countdown needs to continue
    if (init.end && Date.now() < init.end) {
        startTimer(init.end)
    }
}

// events 
function handleUserInput() {
    // different modes
    radioButtons.forEach(function(btn) {
        btn.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement
            const newMode = target.value as PomodoroMode

            // save
            updatePomodoro({
                mode: newMode
            })

            switchMode(newMode)

            broadcast.postMessage({
                type: 'switch-mode',
                mode: newMode
            })
        })
    })

    if (pomodoroStart) {
        pomodoroStart.onclick = function() {
            startTimer()

            broadcast.postMessage({
                type: 'start-pomodoro',
            })
        }
    }

    if (pomodoroPause) {
        pomodoroPause.onclick = function() {
            pauseTimer()

            // broadcast.postMessage({
            //     type: 'start-pomodoro',
            // })
        }
    }
}

async function switchMode(mode: PomodoroMode) {
    stopTimer()

    const seconds = getTimeForMode(mode) as number
    displayTimeLeft(seconds)
}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good

async function startTimer(end?: number) {
    stopTimer()

    const { pomodoro } = await storage.sync.get(['pomodoro'])

    let time : Time = {
        start: Date.now(),
        end: end ?? undefined
    }
    
    if (!end) {
        if (pomodoro.pause) {
            // Resuming after pause
            const remaining = pomodoro.end - pomodoro.pause
            const now = Date.now()

            time = {
                start: now,
                end: now + remaining
            }
        } else if (!end) { // fresh timer
            let seconds = getTimeForMode(pomodoro.mode)

            time.end = time.start + seconds * 1000
        }
        
        updatePomodoro({
            end: time.end,
            pause: false
        })
    }
    
    countdown = setInterval(() => {
        const secondsLeft = Math.round((time.end - Date.now()) / 1000);

        // time's up
        if (secondsLeft <= 0) {
            stopTimer()
        }

        displayTimeLeft(secondsLeft)
    }, 10)

    toggleStartPause(true)
}

async function pauseTimer() {
    const { pomodoro } = await storage.sync.get(['pomodoro'])
    const pauseTime = Date.now()

    updatePomodoro({ pause: pauseTime })


    stopTimer()
    toggleStartPause(false)
}

function displayTimeLeft(seconds: number) {
    const timer_dom = document.getElementById('pmdr_timer')

    if (!timer_dom) return

    const minutes = Math.floor(seconds / 60)
    const secondsRemaining = seconds % 60
    const displayTime = `${minutes}:${secondsRemaining < 10 ? "0" : ""}${secondsRemaining}`

    timer_dom.textContent = displayTime
}

async function updatePomodoro({ end, mode, pause }: PomodoroUpdate) {
    const data = await storage.sync.get(['pomodoro'])

    if (end) {
        data.pomodoro.end = end
    }

    if (mode) {
        data.pomodoro.mode = mode
    }

    if (pause) {
        data.pomodoro.pause = pause
    }

    storage.sync.set({ pomodoro: data.pomodoro })
    
    currentPomodoroData = data.pomodoro
}

function toggleStartPause(pause: boolean) {
    pomodoroPause.classList.toggle('hidden', !pause)
    pomodoroStart.classList.toggle('hidden', pause)
}