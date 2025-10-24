import { removeBackgrounds } from './index.ts'
import { stringMaxSize } from '../../shared/generic.ts'
import { needsChange, userDate } from '../../shared/time.ts'
import { storage } from '../../storage.ts'

import type { EditorOptions, PrismEditor } from 'prism-code-editor'
import type { BackgroundUrlState, Local } from '../../../types/local.ts'
import type { BackgroundImage } from '../../../types/shared.ts'
import type { Backgrounds } from '../../../types/sync.ts'

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export function urlsCacheControl(backgrounds: Backgrounds, local: Local, needNew?: boolean) {
	const urls = lastUsedUrls(local.backgroundUrls)

	if (urls.length === 0) {
		removeBackgrounds()
		return
	}

	// 1. Faire la meme chose que avec les fichiers locaux

	const url = urls[0]
	const freq = backgrounds.frequency
	const metadata = local.backgroundUrls[url]
	const lastUsed = new Date(metadata.lastUsed).getTime()

	needNew ??= needsChange(freq, lastUsed)

	if (urls.length > 1 && needNew) {
		urls.shift()

		const rand = Math.floor(Math.random() * urls.length)
		const url = urls[rand]

		// applyBackground(await mediaFromFiles(url, local))
		local.backgroundUrls[url].lastUsed = new Date().toString()
		storage.local.set(local)
	} else {
		// applyBackground(await mediaFromFiles(ids[0], local))
	}
}

export function lastUsedUrls(metadatas: Local['backgroundUrls']): string[] {
	const sortedMetadata = Object.entries(metadatas).toSorted((a, b) => {
		return new Date(b[1].lastUsed).getTime() - new Date(a[1].lastUsed).getTime()
	})

	return sortedMetadata.map(([id, _]) => id)
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

	backgroundUrlsEditor.addListener('update', (value) => {
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
		backgroundUrls[url] = { lastUsed: userDate().toString(), state: 'NONE' }
	}

	globalUrlValue = backgrounds.urls = editorValue
	storage.local.set({ backgroundUrls })
	storage.sync.set({ backgrounds })

	toggleUrlsButton('osef', 'osef')
	checkUrlStates(backgroundUrls)
}

async function checkUrlStates(backgroundUrls: Local['backgroundUrls']) {
	const entries = Object.entries(backgroundUrls)

	for (const [url] of entries) {
		highlightUrlsEditorLine(url, 'LOADING')
	}

	for (const [url, item] of entries) {
		item.state = await getState(url)
		backgroundUrls[url] = item
		highlightUrlsEditorLine(url, item.state)
		storage.local.set({ backgroundUrls: backgroundUrls })
	}
}

async function getState(item: string): Promise<BackgroundUrlState> {
	// const isImage = (resp: Response) => resp.headers.get('content-type')?.includes('image/')
	// const isVideo = (resp: Response) => resp.headers.get('content-type')?.includes('video/')
	const isMedia = (resp: Response) => {
		const type = resp.headers.get('content-type') ?? ''
		return type.startsWith('video/') || type.startsWith('image/')
	}

	const proxy = 'https://services.bonjourr.fr/backgrounds/proxy/'
	let resp: Response
	let url: URL

	try {
		url = new URL(item)
	} catch (_) {
		return 'NOT_URL'
	}

	try {
		resp = await fetch(url)

		if (isMedia(resp) === false) {
			return 'NOT_MEDIA'
		}
	} catch (_) {
		try {
			resp = await fetch(proxy + url)

			if (isMedia(resp) === false) {
				return 'NOT_MEDIA'
			}
		} catch (_) {
			return 'CANT_REACH'
		}
	}

	if (isMedia(resp)) {
		return 'OK'
	}

	return 'NOT_MEDIA'
}
