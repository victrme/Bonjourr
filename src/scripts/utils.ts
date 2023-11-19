import { MAIN_API, FALLBACK_API } from './defaults'
import suntime from './utils/suntime'

import type { Link } from './types/shared'
import type { Sync } from './types/sync'

function shuffledAPIUrls(): string[] {
	return [
		MAIN_API,
		...FALLBACK_API.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value), // https://stackoverflow.com/a/46545530]
	]
}

export async function apiWebSocket(path: string): Promise<WebSocket | undefined> {
	for (const url of shuffledAPIUrls()) {
		try {
			const socket = new WebSocket(url.replace('https://', 'wss://') + path)

			const isOpened = await new Promise((resolve) => {
				socket.onopen = () => resolve(true)
				socket.onerror = () => resolve(false)
				socket.onclose = () => resolve(false)
			})

			if (isOpened) {
				return socket
			}
		} catch (error) {
			console.warn(error)
		}
	}
}

export async function apiFetch(path: string): Promise<Response | undefined> {
	for (const url of shuffledAPIUrls()) {
		try {
			return await fetch(url + path)
		} catch (error) {
			console.warn(error)
			await new Promise((r) => setTimeout(() => r(true), 200))
		}
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
	const { sunrise, sunset } = suntime

	if (mins >= 0 && mins <= sunrise - 60) return 'night'
	if (mins <= sunrise + 60) return 'noon'
	if (mins <= sunset - 60) return 'day'
	if (mins <= sunset + 60) return 'evening'
	if (mins >= sunset + 60) return 'night'

	return 'day'
}

export function bundleLinks(data: Sync): Link[] {
	// 1.13.0: Returns an array of found links in storage
	let res: Link[] = []
	Object.entries(data).map(([key, val]) => {
		if (key.length === 11 && key.startsWith('links')) res.push(val as Link)
	})

	res.sort((a: Link, b: Link) => a.order - b.order)
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

export function closeEditLink() {
	const domedit = document.querySelector('#editlink')
	if (!domedit) return

	domedit?.classList.add('hiding')
	document.querySelectorAll('#linkblocks img').forEach((img) => img?.classList.remove('selected'))
	setTimeout(() => {
		domedit ? domedit.setAttribute('class', '') : ''
	}, 200)
}
