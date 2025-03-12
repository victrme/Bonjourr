import { stringMaxSize } from '../../utils'
import userDate from '../../utils/userdate'
import storage from '../../storage'

import type { EditorOptions, PrismEditor } from 'prism-code-editor'

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export function getUrlsAsCollection(local: Local.Storage): Backgrounds.Image[] {
	const entries = Object.entries(local.backgroundUrls)
	const working = entries.filter((entry) => entry[1].state === 'OK')
	const sorted = working.toSorted((a, b) => new Date(a[1].lastUsed).getTime() - new Date(b[1].lastUsed).getTime())
	const urls = sorted.map(([key]) => key)

	return urls.map((url) => ({
		format: 'image',
		page: '',
		username: '',
		urls: {
			full: url,
			medium: url,
			small: url,
		},
	}))
}

// Editor

export async function initUrlsEditor(backgrounds: Sync.Backgrounds, local: Local.Storage) {
	globalUrlValue = backgrounds.urls

	const { createBackgroundUrlsEditor } = await import('../csseditor')

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
		value = stringMaxSize(value, 8080)
		toggleUrlsButton(globalUrlValue, value)
	})

	backgroundUrlsEditor.keyCommandMap.Tab = (e, selection, value) => {
		if (document.body.matches('.tabbing')) return false
		return tabCommand?.(e, selection, value)
	}

	for (const [url, { state }] of Object.entries(local.backgroundUrls)) {
		highlightUrlsEditorLine(url, state)
	}
}

function highlightUrlsEditorLine(url: string, state: Local.BackgroundUrlState) {
	const lines = backgroundUrlsEditor.wrapper.querySelectorAll('.pce-line')
	const line = lines.values().find((l) => l.textContent === `${url}\n`)
	const noContent = !line?.textContent?.replace('\n', '')

	if (noContent) {
		state = 'NONE'
	}

	line?.classList.toggle('loading', state === 'LOADING')
	line?.classList.toggle('error', state === 'NOT_IMAGE')
	line?.classList.toggle('good', state === 'OK')
	line?.classList.toggle('warn', state === 'CANT_REACH' || state === 'NOT_URL')
}

export function toggleUrlsButton(storage: string, value: string) {
	const button = document.querySelector<HTMLButtonElement>('#b_background-urls')

	if (storage === value) {
		button?.setAttribute('disabled', '')
	} else {
		button?.removeAttribute('disabled')
	}
}

export function applyUrls(backgrounds: Sync.Backgrounds) {
	const editorValue = backgroundUrlsEditor.value
	const backgroundUrls: Local.Storage['backgroundUrls'] = {}

	for (const url of editorValue.split('\n')) {
		backgroundUrls[url] = { lastUsed: userDate().toISOString(), state: 'NONE' }
	}

	globalUrlValue = backgrounds.urls = editorValue
	storage.local.set({ backgroundUrls })
	storage.sync.set({ backgrounds })

	toggleUrlsButton('osef', 'osef')
	checkUrlStates(backgroundUrls)
}

async function checkUrlStates(backgroundUrls: Local.Storage['backgroundUrls']) {
	const entries = Object.entries(backgroundUrls)

	entries.forEach(([url, _]) => {
		highlightUrlsEditorLine(url, 'LOADING')
	})

	entries.forEach(async ([url, item]) => {
		item.state = await getState(url)
		backgroundUrls[url] = item
		highlightUrlsEditorLine(url, item.state)
		storage.local.set({ backgroundUrls: backgroundUrls })
	})
}

async function getState(item: string): Promise<Local.BackgroundUrlState> {
	const isImage = (resp: Response) => resp.headers.get('content-type')?.includes('image/')
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

		if (isImage(resp) === false) {
			return 'NOT_IMAGE'
		}
	} catch (_) {
		try {
			resp = await fetch(proxy + url)

			if (isImage(resp) === false) {
				return 'NOT_IMAGE'
			}
		} catch (_) {
			return 'CANT_REACH'
		}
	}

	if (resp.headers.get('content-type')?.includes('image/')) {
		return 'OK'
	}

	return 'NOT_IMAGE'
}
