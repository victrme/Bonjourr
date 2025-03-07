import storage from '../../storage'
import { stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'

import type { PrismEditor } from 'prism-code-editor'

let globalUrlValue = ''
let backgroundUrlsEditor: PrismEditor

export async function initBackgroundUrls(backgrounds: Sync.Backgrounds) {
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
