import storage from '../../storage'
import { stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'

import type { PrismEditor } from 'prism-code-editor'

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export default async function backgroundUrls(backgrounds: Sync.Backgrounds) {
	checkUrlStates(backgrounds.urls)
}

export async function initUrlsEditor(backgrounds: Sync.Backgrounds) {
	globalUrlValue = backgrounds.urls

	const { createBackgroundUrlsEditor } = await import('../csseditor')

	const options = {
		language: 'uri',
		lineNumbers: false,
		insertSpaces: false,
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
	toggleUrlsButton('osef', 'osef')
	storage.sync.set({ backgrounds })
}

async function checkUrlStates(urls: string): Promise<void> {
	const states: Record<string, 'NOT_URL' | 'CANT_REACH' | 'NOT_IMAGE' | 'OK'> = {}
	const list = urls.split('\n')

	for (const item of list) {
		let url: URL
		let resp: Response

		// check URL type
		try {
			url = new URL(item)
		} catch (_) {
			states[item] = 'NOT_URL'
			continue
		}

		// check if reachable
		try {
			resp = await fetch(item, { method: 'HEAD' })
		} catch (_) {
			states[item] = 'CANT_REACH'
			continue
		}

		// check if reachable
		// try {
		// 	resp = await fetch('https://services.bonjourr.fr/backgrounds/proxy/' + item)
		// } catch (_) {
		// 	states[item] = 'CANT_REACH'
		// 	continue
		// }

		// check if image type
		if (resp.headers.get('content-type')?.includes('image/')) {
			states[item] = 'OK'
		} else {
			states[item] = 'NOT_IMAGE'
		}
	}

	console.log(states)
}
