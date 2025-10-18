import type { Pomodoro } from '../../types/sync.ts'
import type { PomodoroMode } from '../../types/shared.ts'
import { displayInterface } from '../shared/display.ts'
import { storage } from '../storage.ts'

type PomodoroUpdate = {
	on?: boolean
    end?: number
    mode?: PomodoroMode
}

interface Time {
  start: number
  end?: number
}

const pomodoroStart = document.getElementById('pmdr_start') as HTMLButtonElement
const radioButtons = document.querySelectorAll('#pmdr_modes input[type="radio"]')

const broadcast = new BroadcastChannel('pomodoro') as BroadcastChannel // to communicate with other tabs
let countdown: number

const setMode = (value = '') => (document.getElementById(`pmdr-${value}`) as HTMLInputElement).checked = true
const getTimeForMode = (p: Pomodoro) => p.mode && p.time_for[p.mode]

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
    if (update) {
		updatePomodoro(update)
		return
	}

    if (!init) {
        return
    }

    // makes pomodoro show up in #interface
    document.getElementById('pomodoro_container')?.classList.toggle('hidden', !init.on)
    displayInterface('pomodoro')

    handleUserInput()
    setMode(init.mode)

    // receiving data from other tabs
    broadcast.onmessage = ({ data = {} }) => {
        if (data.type === "start-pomodoro") {
            startTimer()
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

            updatePomodoro({
                mode: target.value as PomodoroMode
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
}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good

async function startTimer(end?: number) {
    clearInterval(countdown)

    const { pomodoro } = await storage.sync.get(['pomodoro'])

    let time : Time = {
        start: Date.now(),
        end: end ?? undefined
    }

    if (!end) {
        let seconds = getTimeForMode(pomodoro)

        time.end = time.start + seconds * 1000
        updatePomodoro({end: time.end})
    }

    countdown = setInterval(() => {
        const secondsLeft = Math.round((time.end - Date.now()) / 1000);

        // time's up
        if (secondsLeft <= 0) {
            clearInterval(countdown);
        }

        displayTimeLeft(secondsLeft)
    }, 1000)
}

function displayTimeLeft(seconds: number) {
    const timer_dom = document.getElementById('pmdr_timer')

    if (!timer_dom) return

    const minutes = Math.floor(seconds / 60)
    const secondsRemaining = seconds % 60
    const displayTime = `${minutes}:${secondsRemaining < 10 ? "0" : ""}${secondsRemaining}`

    timer_dom.textContent = displayTime
}

async function updatePomodoro({ end, mode }: PomodoroUpdate) {
    const data = await storage.sync.get(['pomodoro'])

    if (end) {
        data.pomodoro.end = end
    }

    if (mode) {
        data.pomodoro.mode = mode
    }

    storage.sync.set({ pomodoro: data.pomodoro })
}