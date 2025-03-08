import { stringMaxSize, minutator } from '../utils'
import { BROWSER, SYNC_DEFAULT } from '../defaults'
import { eventDebounce } from '../utils/debounce'
import { tradThis } from '../utils/translations'
import suntime from '../utils/suntime'
import storage from '../storage'

export function favicon(val?: string, isEvent?: true) {
	function createFavicon(emoji?: string) {
		const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="85">${emoji}</text></svg>`
		const defaulticon = '/src/assets/' + (BROWSER === 'edge' ? 'monochrome.png' : 'favicon.ico')
		const domfavicon = document.getElementById('favicon') as HTMLLinkElement

		domfavicon.href = emoji ? svg : defaulticon
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

export function tabTitle(val = '', isEvent?: true) {
	document.title = stringMaxSize(val, 80) || tradThis('New tab')

	if (isEvent) {
		eventDebounce({ tabtitle: stringMaxSize(val, 80) })
	}
}

export function pageControl(val: { width?: number; gap?: number }, isEvent?: true) {
	if (val.width) {
		document.documentElement.style.setProperty('--page-width', (val.width ?? SYNC_DEFAULT.pagewidth) + 'px')
		if (isEvent) eventDebounce({ pagewidth: val.width })
	}

	if (typeof val.gap === 'number') {
		document.documentElement.style.setProperty('--page-gap', (val.gap ?? SYNC_DEFAULT.pagegap) + 'em')
		if (isEvent) eventDebounce({ pagegap: val.gap })
	}
}

export function darkmode(value: 'auto' | 'system' | 'enable' | 'disable', isEvent?: boolean) {
	let theme = 'light'

	switch (value) {
		case 'disable':
			theme = 'light'
			break

		case 'enable':
			theme = 'dark'
			break

		case 'system':
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
			break

		case 'auto': {
			const now = minutator(new Date())
			const { sunrise, sunset } = suntime()
			theme = now <= sunrise || now > sunset ? 'dark' : 'light'
			break
		}
	}

	document.documentElement.dataset.theme = theme

	if (isEvent) {
		storage.sync.set({ dark: value })
		return
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
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
