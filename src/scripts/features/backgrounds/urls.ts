import { applyBackground, removeBackgrounds } from './index.ts'
import { stringMaxSize } from '../../shared/generic.ts'
import { needsChange } from '../../shared/time.ts'
import { storage } from '../../storage.ts'

import type { Background, BackgroundImage } from '../../../types/shared.ts'
import type { EditorOptions, PrismEditor } from 'prism-code-editor'
import type { BackgroundUrl, BackgroundUrlState, Local } from '../../../types/local.ts'
import type { Backgrounds } from '../../../types/sync.ts'

type UrlInfos = {
	state: BackgroundUrlState
	format: 'image' | 'video'
	duration?: number
	needsProxy: boolean
}

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export function urlsCacheControl(backgrounds: Backgrounds, local: Local, needNew?: boolean) {
	const urls = lastUsedValidUrls(local.backgroundUrls)

	if (urls.length === 0) {
		removeBackgrounds()
		return
	}

	const url = urls[0]
	const freq = backgrounds.frequency
	const metadata = local.backgroundUrls[url]
	const lastUsed = new Date(metadata.lastUsed).getTime()

	needNew ??= needsChange(freq, lastUsed)

	if (urls.length > 1 && needNew) {
		urls.shift()

		const rand = Math.floor(Math.random() * urls.length)
		const url = urls[rand]
		const now = new Date().toString()
		const metadata = local.backgroundUrls[url]

		applyBackground(urlAsBackgroundMedia(url, metadata))
		local.backgroundUrls[url].lastUsed = now
		storage.local.set(local)
		return
	}

	applyBackground(urlAsBackgroundMedia(url, metadata))
}

export function lastUsedValidUrls(metadatas: Local['backgroundUrls']): string[] {
	const getTime = (item: BackgroundUrl) => new Date(item.lastUsed).getTime()
	const entries = Object.entries(metadatas)

	const sortedUrls = entries.toSorted((a, b) => getTime(b[1]) - getTime(a[1]))
	const validOnly = sortedUrls.filter(([_, metadata]) => metadata.state === 'OK')
	const urls = validOnly.map(([url, _]) => url)

	return urls
}

function urlAsBackgroundMedia(url: string, metadata: BackgroundUrl): Background {
	if (metadata.format === 'video') {
		return {
			format: 'video',
			duration: metadata.duration ?? 8,
			page: '',
			username: '',
			urls: {
				full: url,
				small: url,
			},
		}
	}

	return {
		format: 'image',
		page: '',
		username: '',
		urls: {
			full: url,
			small: url,
		},
	}
}

export function getUrlsAsCollection(local: Local): [string[], BackgroundImage[]] {
	const entries = Object.entries(local.backgroundUrls)
	const working = entries.filter((entry) => entry[1].state === 'OK')
	const sorted = working.toSorted((a, b) => new Date(a[1].lastUsed).getTime() - new Date(b[1].lastUsed).getTime())
	const urls = sorted.map(([key]) => key)

	return [
		urls,
		urls.map((url) => ({
			format: 'image',
			page: '',
			username: '',
			urls: {
				full: url,
				medium: url,
				small: url,
			},
		})),
	]
}

// Editor

export async function initUrlsEditor(backgrounds: Backgrounds, local: Local) {
	globalUrlValue = backgrounds.urls

	const { createBackgroundUrlsEditor } = await import('../csseditor.ts')

	const options: EditorOptions = {
		language: 'uri',
		value: backgrounds.urls,
	}

	backgroundUrlsEditor = createBackgroundUrlsEditor(options)

	const tabCommand = backgroundUrlsEditor.keyCommandMap.Tab

	backgroundUrlsEditor.textarea.id = 'background-urls-editor-textarea'
	backgroundUrlsEditor.textarea.maxLength = 8080
	backgroundUrlsEditor.textarea.placeholder = 'https://picsum.photos/200\n'

	backgroundUrlsEditor.on('update', (value) => {
		toggleUrlsButton(globalUrlValue, stringMaxSize(value, 8080))
	})

	backgroundUrlsEditor.keyCommandMap.Tab = (e, selection, value) => {
		if (document.body.matches('.tabbing')) {
			return false
		}

		return tabCommand?.(e, selection, value)
	}

	for (const [url, { state }] of Object.entries(local.backgroundUrls)) {
		highlightUrlsEditorLine(url, state)
	}
}

function highlightUrlsEditorLine(url: string, state: BackgroundUrlState) {
	const lines = backgroundUrlsEditor.wrapper.querySelectorAll('.pce-line')
	const line = lines.values().find((l) => l.textContent === `${url}\n`)
	const noContent = !line?.textContent?.replace('\n', '')
	const lineState = noContent ? 'NONE' : state

	line?.classList.toggle('loading', lineState === 'LOADING')
	line?.classList.toggle('error', lineState === 'NOT_MEDIA')
	line?.classList.toggle('good', lineState === 'OK')
	line?.classList.toggle('warn', lineState === 'CANT_REACH' || lineState === 'NOT_URL')
}

export function toggleUrlsButton(storage: string, value: string) {
	const button = document.querySelector<HTMLButtonElement>('#b_background-urls')

	if (storage === value) {
		button?.setAttribute('disabled', '')
	} else {
		button?.removeAttribute('disabled')
	}
}

export function applyUrls(backgrounds: Backgrounds) {
	const editorValue = backgroundUrlsEditor.value
	const backgroundUrls: Local['backgroundUrls'] = {}

	for (const url of editorValue.split('\n')) {
		if (url.startsWith('http')) {
			backgroundUrls[url] = {
				lastUsed: new Date().toString(),
				format: formatFromFileExt(url),
				state: 'NONE',
			}
		}
	}

	globalUrlValue = backgrounds.urls = editorValue
	storage.local.set({ backgroundUrls })
	storage.sync.set({ backgrounds })

	toggleUrlsButton('osef', 'osef')
	checkUrlInfos(backgroundUrls)
}

async function checkUrlInfos(backgroundUrls: Local['backgroundUrls']) {
	const entries = Object.entries(backgroundUrls)

	for (const [url] of entries) {
		highlightUrlsEditorLine(url, 'LOADING')
	}

	for (const [url, item] of entries) {
		const infos = await getUrlInfos(url)

		item.state = infos.state
		item.format = infos.format
		item.duration = infos.duration
		backgroundUrls[url] = item

		highlightUrlsEditorLine(url, item.state)
		storage.local.set({ backgroundUrls: backgroundUrls })
	}
}

async function getUrlInfos(item: string): Promise<UrlInfos> {
	const isVideo = () => type.includes('video/')
	const isMedia = () => type.startsWith('video/') || type.startsWith('image/')

	const infos: UrlInfos = {
		'format': formatFromFileExt(item),
		'state': 'NONE',
		'needsProxy': false,
	}

	let type = ''
	let resp: Response
	let url: URL

	// 1. Check URL validity first

	try {
		url = new URL(item)
	} catch (_) {
		infos.state = 'NOT_URL'
		return infos
	}

	// 2a. Try to load content as is

	try {
		resp = await fetch(url)
		type = resp.headers.get('content-type') ?? ''

		if (isMedia()) {
			infos.state = 'OK'
		} else {
			infos.state = 'NOT_MEDIA'
			return infos
		}
	} catch (_) {
		// 2b. Load content using Bonjourr proxy (removes CORS)

		try {
			infos.needsProxy = true
			resp = await fetch(`https://services.bonjourr.fr/backgrounds/proxy/${url}`)
			type = resp.headers.get('content-type') ?? ''

			if (isMedia()) {
				infos.state = 'OK'
			} else {
				infos.state = 'NOT_MEDIA'
				return infos
			}
		} catch (_) {
			infos.state = 'CANT_REACH'
			return infos
		}
	}

	// 3. Find correct media format

	if (isVideo()) {
		infos.format = 'video'
	} else {
		infos.format = 'image'
	}

	// 4. If video detected, retrieve duration

	if (infos.format === 'video') {
		const video = document.createElement('video')

		infos.duration = await new Promise((resolve, reject) => {
			setTimeout(() => reject(), 5000)
			video.onloadedmetadata = () => resolve(Math.floor(video.duration))
			video.src = item
		})

		if (!infos.duration) {
			infos.state = 'LOADING'
			return infos
		}
	}

	// 4. Return infos

	return infos
}

function formatFromFileExt(url: string): 'image' | 'video' {
	url = url.trimEnd()

	if (url.endsWith('mp4') || url.endsWith('webm')) {
		return 'video'
	} else {
		return 'image'
	}
}
