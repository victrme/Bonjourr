import { tradThis } from '../../utils/translations.ts'
import { userDate } from '../../shared/time.ts'

import type { Sync } from '../../../types/sync.ts'

export interface Greetings {
	name: string
	mode: Sync['greetingsmode']
	custom?: Sync['greetingscustom']
}

const oneInFive = Math.random() > 0.8 ? 1 : 0

export function displayGreetings({ mode, name, custom }: Greetings) {
	const date = userDate()
	const domgreetings = document.getElementById('greetings') as HTMLTitleElement
	const domgreeting = document.getElementById('greeting') as HTMLSpanElement
	const domname = document.getElementById('greeting-name') as HTMLSpanElement

	const rare = oneInFive
	const hour = date.getHours()
	let period: 'night' | 'morning' | 'afternoon' | 'evening'

	if (hour < 3) {
		period = 'evening'
	} else if (hour < 5) {
		period = 'night'
	} else if (hour < 12) {
		period = 'morning'
	} else if (hour < 18) {
		period = 'afternoon'
	} else {
		period = 'evening'
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
