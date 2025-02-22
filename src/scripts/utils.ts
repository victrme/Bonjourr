import suntime from './utils/suntime'
import userDate from './utils/userdate'

export async function apiWebSocket(path: string): Promise<WebSocket | undefined> {
	try {
		const socket = new WebSocket(`wss://services.bonjourr.fr/${path}`)
		const isOpened = await new Promise((resolve) => {
			socket.onopen = () => resolve(true)
			socket.onerror = () => resolve(false)
			socket.onclose = () => resolve(false)
		})

		if (isOpened) {
			return socket
		}
	} catch (_error) {
		// ...
	}
}

export async function weatherFetch(query: string): Promise<Response | undefined> {
	try {
		return await fetch(`https://weather.bonjourr.fr${query}`)
	} catch (_error) {
		// ...
	}
}

export async function apiFetch(path: string): Promise<Response | undefined> {
	try {
		return await fetch(`https://services.bonjourr.fr${path}`)
	} catch (_error) {
		// ...
	}
}

export function stringMaxSize(str: string = '', size: number) {
	return str.length > size ? str.slice(0, size) : str
}

export function minutator(date: Date) {
	return date.getHours() * 60 + date.getMinutes()
}

export function randomString(len: number) {
	const chars = 'abcdefghijklmnopqr'
	return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function periodOfDay(time?: number) {
	// noon & evening are + /- 60 min around sunrise/set

	const mins = minutator(time ? new Date(time) : new Date())
	const { sunrise, sunset } = suntime()

	if (mins >= 0 && mins <= sunrise - 60) return 'night'
	if (mins <= sunrise + 60) return 'noon'
	if (mins <= sunset - 60) return 'day'
	if (mins <= sunset + 60) return 'evening'
	if (mins >= sunset + 60) return 'night'

	return 'day'
}

export const freqControl = {
	set: () => {
		return userDate().getTime()
	},

	get: (every: string, last: number) => {
		const nowDate = userDate()
		const lastDate = last ? new Date(last) : nowDate
		const changed = {
			date: nowDate.getDate() !== lastDate.getDate(),
			hour: nowDate.getHours() !== lastDate.getHours(),
		}

		switch (every) {
			case 'day':
				return changed.date

			case 'hour':
				return changed.date || changed.hour

			case 'tabs':
				return true

			case 'pause':
				return last === 0

			case 'period': {
				return last === 0 ? true : periodOfDay() !== periodOfDay(+lastDate) || false
			}

			default:
				return false
		}
	},
}

export function bundleLinks(data: Sync.Storage): Links.Link[] {
	// 1.13.0: Returns an array of found links in storage
	const res: Links.Link[] = []

	Object.entries(data).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) res.push(val as Links.Link)
	})

	return res
}

export const inputThrottle = (elem: HTMLInputElement, time = 800) => {
	let isThrottled = true

	setTimeout(() => {
		isThrottled = false
		elem.removeAttribute('disabled')
	}, time)

	if (isThrottled) elem.setAttribute('disabled', '')
}

export function turnRefreshButton(button: HTMLSpanElement, canTurn: boolean) {
	const animationOptions = { duration: 600, easing: 'ease-out' }
	button.animate(
		canTurn
			? [{ transform: 'rotate(360deg)' }]
			: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }, { transform: 'rotate(0deg)' }],
		animationOptions
	)
}

export function fadeOut() {
	const dominterface = document.getElementById('interface') as HTMLElement
	dominterface.click()
	dominterface.style.transition = 'opacity .4s'
	setTimeout(() => (dominterface.style.opacity = '0'))
	setTimeout(() => location.reload(), 400)
}

export function isEvery(freq = ''): freq is Frequency {
	const every: Frequency[] = ['tabs', 'hour', 'day', 'period', 'pause']
	return every.includes(freq as Frequency)
}

// goodbye typescript, you will be missed
export function getHTMLTemplate<T>(id: string, selector: string): T {
	const template = document.getElementById(id) as HTMLTemplateElement
	const clone = template?.content.cloneNode(true) as Element
	return clone?.querySelector(selector) as T
}

// getting .composedPath equivalent of touch events
export function getComposedPath(target: EventTarget | null): HTMLElement[] {
	if (!target) {
		return []
	}

	const path: HTMLElement[] = []
	let node = target as HTMLElement | null

	while (node) {
		path.push(node)
		node = node.parentElement
	}

	return path
}

export function rgbToHex(r: number, g: number, b: number): string {
	return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

function componentToHex(c: number): string {
	const hex = c.toString(16)
	return hex.length == 1 ? '0' + hex : hex
}

export function equalsCaseInsensitive(a: string, b: string) {
	return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

export function getSplitRangeData(id: string): { range?: string; button?: string } {
	const wrapper = document.querySelector<HTMLInputElement>(`#${id.replace('#', '')}`)
	const range = wrapper?.querySelector<HTMLInputElement>('input')
	const button = wrapper?.querySelector<HTMLElement>('button')
	const span = wrapper?.querySelectorAll<HTMLElement>('span')
	const isButtonOn = button?.classList?.contains('on')

	return {
		range: range?.value,
		button: span?.[isButtonOn ? 1 : 0].dataset.value,
	}
}

export function hexColorFromSplitRange(id: string): string {
	const { range, button } = getSplitRangeData(id)

	const opacity = parseInt(range ?? '0')
	const color = button === 'dark' ? '#000' : '#fff'
	const alpha = opacity.toString(16)

	return color + alpha
}

export function opacityFromHex(hex: string) {
	return parseInt(hex.slice(4), 16)
}

export function toggleDisabled(element: Element | null, force?: boolean) {
	if (element) {
		if (force === undefined) {
			force = typeof element.getAttribute('disabled') === 'string'
		}

		force ? element.setAttribute('disabled', '') : element.removeAttribute('disabled')
	}
}

export function countryCodeToLanguageCode(lang: string): string {
	if (lang.includes('ES')) lang = 'es'
	if (lang === 'gr') lang = 'el'
	if (lang === 'jp') lang = 'ja'
	if (lang === 'cz') lang = 'cs'

	lang = lang.replace('_', '-')

	return lang
}

async function wait(ms: number) {
	await new Promise((r) => setTimeout(() => r(true), ms))
}
