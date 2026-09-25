import { tradThis } from '../../utils/translations.ts'
import { userDate } from '../../shared/time.ts'

import type { Sync } from '../../../types/sync.ts'

export interface Greetings {
    name: string
    mode: Sync['greetingsmode']
    custom?: Sync['greetingscustom']
}

const oneInFive = Math.random() > 0.8 ? 1 : 0

export function displayGreetings({ mode, name, custom }: Greetings): void {
    const date = userDate()
    const domgreetings = document.getElementById('greetings') as HTMLTitleElement
    const domgreeting = document.getElementById('greeting') as HTMLSpanElement
    const domname = document.getElementById('greeting-name') as HTMLSpanElement

    const rare = oneInFive
    const hour = date.getHours()
    let period: 'morning' | 'afternoon' | 'evening' | 'night'

    if (hour >= 5 && hour <= 10) {
        period = 'morning'
    } else if (hour >= 11 && hour <= 14) {
        period = 'afternoon'
    } else if (hour >= 15 && hour <= 18) {
        period = 'evening'
    } else if (hour >= 19) {
        period = 'night'
    } else {
        period = 'night'
    }

    if (mode === 'custom' && custom && custom[period]) {
        const greet = name ? custom[period].replace('$name', name) : custom[period]
        domgreetings.style.textTransform = 'none'
        domgreeting.textContent = greet
        domname.textContent = ''
    } else {
        const greetings = {
            morning: 'Good morning',
            afternoon: 'Good afternoon',
            evening: 'Good evening',
            night: ['Good night', 'Sweet dreams'][rare],
        }

        const greet = greetings[period]

        domgreetings.style.textTransform = name || (rare && period === 'night') ? 'none' : 'capitalize'
        domgreeting.textContent = tradThis(greet) + (name ? ', ' : '')
        domname.textContent = name ?? ''
    }
}
