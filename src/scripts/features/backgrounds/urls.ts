import { applyBackground } from '.'
import storage from '../../storage'
import { stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'

import type { EditorOptions, PrismEditor } from 'prism-code-editor'

type UrlState = 'LOADING' | 'NOT_URL' | 'CANT_REACH' | 'NOT_IMAGE' | 'OK'

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export default async function backgroundUrls(backgrounds: Sync.Backgrounds) {
	applyBackground({
		image: {
			format: 'image',
			page: '',
			username: '',
			urls: {
				full: backgrounds.urls.split('\n')[0],
				medium: backgrounds.urls.split('\n')[0],
				small: backgrounds.urls.split('\n')[0],
			},
		},
	})
}

// Editor

export async function initUrlsEditor(backgrounds: Sync.Backgrounds) {
	globalUrlValue = backgrounds.urls

	const { createBackgroundUrlsEditor } = await import('../csseditor')

	const options: EditorOptions = {
		language: 'uri',
		value: backgrounds.urls || '',
	}

	backgroundUrlsEditor = createBackgroundUrlsEditor(options)

	const tabCommand = backgroundUrlsEditor.keyCommandMap.Tab

	backgroundUrlsEditor.textarea.id = 'background-urls-editor-textarea'
	backgroundUrlsEditor.textarea.maxLength = 8080
	backgroundUrlsEditor.textarea.placeholder = 'https://picsum.photos/200\nhttps://picsum.photos/600/400'

	backgroundUrlsEditor.addListener('update', (value) => {
		value = stringMaxSize(value, 8080)
		toggleUrlsButton(globalUrlValue, value)
	})

	backgroundUrlsEditor.keyCommandMap.Tab = (e, selection, value) => {
		if (document.body.matches('.tabbing')) return false
		return tabCommand?.(e, selection, value)
	}
}

function highlightUrlsEditorLine(state: UrlState, i: number) {
	const line = backgroundUrlsEditor.wrapper.querySelector(`.pce-line:nth-child(${i + 2})`)
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
	backgrounds.urls = globalUrlValue = backgroundUrlsEditor.value
	storage.sync.set({ backgrounds })

	toggleUrlsButton('osef', 'osef')
	checkUrlStates(backgrounds.urls)
}

function checkUrlStates(urls = ''): void {
	urls.split('\n').forEach((item, i) => {
		highlightUrlsEditorLine('LOADING', i)

		getState(item).then((state) => {
			highlightUrlsEditorLine(state, i)
		})
	})
}

async function getState(item: string): Promise<UrlState> {
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
