import type { Pomodoro } from '../../types/sync.ts'
import { displayInterface } from '../shared/display.ts'
import { storage } from '../storage.ts'

type PomodoroUpdate = {
	on?: boolean
    end?: number
}

interface Time {
  start: number
  end?: number
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
    if (update) {
		updatePomodoro(update)
		return
	}

    if (!init) {
        return
    }

    document.getElementById('pomodoro_container')?.classList.toggle('hidden', !init.on)

    displayInterface('pomodoro')

    const pomodoroStart = document.getElementById('pmdr_start')
    
    const broadCast = new BroadcastChannel('audio-player');

    broadCast.onmessage = ({ data = {} }) => {
        if (data.type === "start-pomodoro") {
            startTimer()
        }
    }

    if (init.end && Date.now() < init.end) {
        startTimer(init.end)
    }

    if (pomodoroStart) {
        pomodoroStart.onclick = function() {
            startTimer()

            broadCast.postMessage({
                type: 'start-pomodoro',
            })
        }
    }

}

// inspired by https://github.com/mohammedyh/pomodoro-timer cause logic is so good
let countdown: number

function startTimer(end?: number) {
    clearInterval(countdown)

    let time : Time = {
        start: Date.now(),
        end: end ?? undefined
    }

    if (!end) {
        let seconds = 1500 // 25mins in seconds
        time.end = time.start + seconds * 1000 // end goal 25mins from now 
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

export function displayTimeLeft(seconds: number) {
    const timer_dom = document.getElementById('pmdr_timer')

    if (!timer_dom) return

    const minutes = Math.floor(seconds / 60)
    const secondsRemaining = seconds % 60
    const displayTime = `${minutes}:${secondsRemaining < 10 ? "0" : ""}${secondsRemaining}`

    timer_dom.textContent = displayTime
}

async function updatePomodoro({ end }: PomodoroUpdate) {
    const data = await storage.sync.get(['pomodoro'])

    if (end) {
        data.pomodoro.end = end
    }

    storage.sync.set({ pomodoro: data.pomodoro })
}