import { BROWSER, SYNC_DEFAULT } from '../defaults.ts'
import { minutator, suntime } from '../shared/time.ts'
import { stringMaxSize } from '../shared/generic.ts'
import { eventDebounce } from '../utils/debounce.ts'
import { tradThis } from '../utils/translations.ts'
import { storage } from '../storage.ts'

export function favicon(val?: string, isEvent?: true) {
	function createFavicon(emoji?: string) {
		const svgtext = `<text y=".9em" font-size="85">${emoji}</text>`
		const svgtag = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgtext}</svg>`
		const svgdata = `data:image/svg+xml,${svgtag}`
		const defaulticon = `/src/assets/favicons/favicon.ico`
		const domfavicon = document.querySelector<HTMLLinkElement>('#favicon')

		if (domfavicon) {
			domfavicon.href = emoji ? svgdata : defaulticon
		}
	}

	if (BROWSER === 'edge') {
		return
	}

	if (isEvent) {
		const isEmojiOrShape = val?.match(/[\p{Emoji}\u25A0-\u25FF]/gu) && !val?.match(/[0-9a-z]/g)
		eventDebounce({ favicon: isEmojiOrShape ? val : '' })
		document.getElementById('head-favicon')?.remove()
	}

	if (BROWSER === 'firefox') {
		setTimeout(() => createFavicon(val), 0)
	} else {
		createFavicon(val)
	}
}

export function tabTitle(val?: string, isEvent?: true) {
	val ??= ''

	document.title = stringMaxSize(val, 80) || tradThis('New tab')

	if (isEvent) {
		eventDebounce({ tabtitle: stringMaxSize(val, 80) })
	}
}

export function pageControl(val: { width?: number; gap?: number }, isEvent?: true) {
	if (val.width) {
		const property = `${val.width ?? SYNC_DEFAULT.pagewidth}px`
		document.documentElement.style.setProperty('--page-width', property)

		if (isEvent) {
			eventDebounce({ pagewidth: val.width })
		}
	}

	if (typeof val.gap === 'number') {
		const property = `${val.gap ?? SYNC_DEFAULT.pagegap}em`
		document.documentElement.style.setProperty('--page-gap', property)

		if (isEvent) {
			eventDebounce({ pagegap: val.gap })
		}
	}
}

export function darkmode(value: 'auto' | 'system' | 'enable' | 'disable', isEvent?: boolean) {
	const settings = document.querySelector<HTMLElement>('aside')
	let theme = 'light'

	switch (value) {
		case 'disable':
			theme = 'light'
			break

		case 'enable':
			theme = 'dark'
			break

		case 'system':
			theme = globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
			break

		default: {
			const now = minutator(new Date())
			const { sunrise, sunset } = suntime()
			theme = now <= sunrise || now > sunset ? 'dark' : 'light'
		}
	}

	document.documentElement.dataset.theme = theme

	if (isEvent) {
		storage.sync.set({ dark: value })
		settings?.classList.add('change-theme')

		setTimeout(() => {
			settings?.classList.remove('change-theme')
		}, 333)

		return
	}

	globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
		document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
	})
}

export function textShadow(init?: number, event?: number) {
	const val = init ?? event
	document.documentElement.style.setProperty('--text-shadow-alpha', (val ?? 0.2)?.toString())

	if (typeof event === 'number') {
		eventDebounce({ textShadow: val })
	}
}

// Unfocus address bar on chromium
// https://stackoverflow.com/q/64868024
// if (window.location.search !== '?r=1') {
// 	window.location.assign('index.html?r=1')
// }
