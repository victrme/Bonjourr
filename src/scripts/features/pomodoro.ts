import type { Pomodoro } from '../../types/sync.ts'
import { displayInterface } from '../shared/display.ts'

type PomodoroUpdate = {
	on?: boolean
}

interface Time {
  start: number;
  end?: number; // optional
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
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

function startTimer() {
    let seconds = 1500 // 25mins in seconds

    let time : Time = {
        start: Date.now()
    }

    time.end = time.start + seconds * 1000 // end goal 25mins from now 

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