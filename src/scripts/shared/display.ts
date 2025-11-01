import type { Sync } from '../../types/sync.ts'

const features: ('clock' | 'links' | 'fonts' | 'quotes' | 'pomodoro')[] = ['clock', 'links']
let interfaceDisplayCallback = () => undefined
let loadtime = performance.now()

export function onInterfaceDisplay(callback: () => undefined): void {
	if (callback) {
		interfaceDisplayCallback = callback
	}
}

export function displayInterface(ready?: 'clock' | 'links' | 'fonts' | 'quotes' | 'pomodoro', data?: Sync) {
	if (data) {
		if (data?.font?.family) {
			features.push('fonts')
		}
		if (data?.quotes?.on) {
			features.push('quotes')
		}
		if (data?.pomodoro?.on) {
			features.push('pomodoro')
		}

		return
	}

	if (!ready) {
		return
	}

	const index = features.indexOf(ready)

	if (index !== -1) {
		features.splice(index, 1)
	} else {
		return
	}

	if (features.length > 0) {
		return
	}

	loadtime = Math.min(performance.now() - loadtime, 333)
	loadtime = loadtime > 33 ? loadtime : 0
	document.documentElement.style.setProperty('--load-time-transition', `${loadtime}ms`)
	document.body.classList.remove('loading')

	const delay = Math.max(333, loadtime)

	setTimeout(() => interfaceDisplayCallback(), delay)
}
