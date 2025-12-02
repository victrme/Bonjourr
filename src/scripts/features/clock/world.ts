// World clocks

import type { Sync } from '../../../types/sync.ts'

export function toggleWorldClocksOptions() {
	const parents = document.querySelectorAll<HTMLElement>('.worldclocks-item')
	const inputs = document.querySelectorAll<HTMLInputElement>('.worldclocks-item input')
	let hasWorld = false

	parents.forEach((parent, i) => {
		const currHasText = !!inputs[i]?.value
		const nextHasText = !!inputs[i - 1]?.value
		parent?.classList.toggle('shown', i === 0 || currHasText || nextHasText)

		if (!hasWorld && currHasText) {
			hasWorld = true
		}
	})
}

export function toggleTimezoneOptions(data: Sync) {
	const timezoneOptions = document.getElementById('timezone_options')
	const hasWorldClock = data.clock.worldclocks && !!data?.worldclocks[0]?.region

	timezoneOptions?.classList.toggle('shown', !hasWorldClock)
}
