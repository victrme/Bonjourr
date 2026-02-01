import { BROWSER, IS_MOBILE, PLATFORM, SYSTEM_OS } from '../defaults.ts'
import { backgroundsInit } from '../features/backgrounds/index.ts'
import { onSettingsLoad } from '../utils/onsettingsload.ts'
import { needsChange } from '../shared/time.ts'
import { weather } from '../features/weather/index.ts'
import { storage } from '../storage.ts'
import { clock } from '../features/clock/index.ts'

export function onlineAndMobile() {
	const dominterface = document.getElementById('interface') as HTMLDivElement
	const onlineFirefoxMobile = PLATFORM === 'online' && BROWSER === 'firefox' && IS_MOBILE
	const onlineSafariIos = PLATFORM === 'online' && BROWSER === 'safari' && SYSTEM_OS === 'ios'
	let visibilityHasChanged = false
	let firefoxRafTimeout: number

	if (IS_MOBILE) {
		document.addEventListener('visibilitychange', updateOnVisibilityChange)
	}

	if (onlineFirefoxMobile) {
		// Firefox cannot -moz-fill-available with height
		// On desktop, uses fallback 100vh
		// On mobile, sets height dynamically because vh is bad on mobile

		updateAppHeight()

		// Fix for opening tabs Firefox iOS
		if (SYSTEM_OS === 'ios') {
			globalThis.requestAnimationFrame(triggerAnimationFrame)
			setTimeout(() => cancelAnimationFrame(firefoxRafTimeout), 500)
		}
	}

	if (onlineSafariIos) {
		onSettingsLoad(() => {
			const inputs = document.querySelectorAll('input[type="text"], input[type="url"], textarea')

			for (const input of inputs) {
				input.addEventListener('focus', disableTouchAction)
				input.addEventListener('blur', enableTouchAction)
			}
		})
	}

	async function updateOnVisibilityChange() {
		if (visibilityHasChanged === false) {
			visibilityHasChanged = true
			return
		}

		visibilityHasChanged = false

		const sync = await storage.sync.get()
		const local = await storage.local.get()
		const { backgroundLastChange, lastWeather } = local

		if (!sync.clock || !sync.weather) {
			return
		}

		const time = (backgroundLastChange ? new Date(backgroundLastChange) : new Date()).getTime()
		const needNew = needsChange(sync.backgrounds.frequency, time)
		const notColor = sync.backgrounds.type !== 'color'

		clock(sync)
		weather({ sync, lastWeather })

		if (notColor && needNew) {
			backgroundsInit(sync, local)
		}
	}

	function triggerAnimationFrame() {
		updateAppHeight()
		firefoxRafTimeout = requestAnimationFrame(triggerAnimationFrame)
	}

	function updateAppHeight() {
		document.documentElement.style.setProperty('--app-height', `${globalThis.innerHeight}px`)
	}

	function disableTouchAction() {
		const settingsDom = document.getElementById('settings') as HTMLElement
		if (dominterface && settingsDom) {
			dominterface.style.touchAction = 'none'
			settingsDom.style.touchAction = 'none'
		}
	}

	function enableTouchAction() {
		const settingsDom = document.getElementById('settings') as HTMLElement
		if (dominterface && settingsDom) {
			dominterface.style.removeProperty('touch-action')
			settingsDom.style.removeProperty('touch-action')
		}
	}
}
