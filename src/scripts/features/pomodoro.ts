import type { Pomodoro } from '../../types/sync.ts'
import { displayInterface } from '../shared/display.ts'

type PomodoroUpdate = {
	on?: boolean
}

export function pomodoro(init?: Pomodoro, update?: PomodoroUpdate) {
    if (!init) {
        return
    }

    document.getElementById('pomodoro_container')?.classList.toggle('hidden', !init.on)
    displayInterface('pomodoro')
}