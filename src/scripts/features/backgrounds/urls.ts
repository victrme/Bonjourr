import { stringMaxSize } from '../../utils'
import { eventDebounce } from '../../utils/debounce'

export async function initBackgroundUrls(backgrounds: Sync.Backgrounds) {
	const { createBackgroundUrlsEditor } = await import('../csseditor')

	const options = {
		language: 'uri',
		lineNumbers: false,
		insertSpaces: false,
		value: backgrounds.urls.join('\n') || '',
	}

	const editor = createBackgroundUrlsEditor(options)
	const tabCommand = editor.keyCommandMap.Tab

	editor.textarea.id = 'background-urls-editor-textarea'
	editor.textarea.maxLength = 8080
	editor.textarea.setAttribute('aria-labelledby', 'lbl-background-urls')
	editor.textarea.placeholder = 'https://picsum.photos/200\nhttps://picsum.photos/600/400'

	editor.addListener('update', (value) => {
		value = stringMaxSize(value, 8080)
		// eventDebounce({ css: value })
		// stylelink.textContent = value
	})

	editor.keyCommandMap.Tab = (e, selection, value) => {
		if (document.body.matches('.tabbing')) return false
		return tabCommand?.(e, selection, value)
	}
}

export function toggleUrlsButton(backgrounds: Sync.Backgrounds) {
	const textarea = document.querySelector<HTMLTextAreaElement>('#i_background-urls')
	const button = document.querySelector<HTMLButtonElement>('#b_background-urls')
	const storageContent = backgrounds.urls.join()
	const inputContent = textarea?.value || ''

	if (storageContent === inputContent) {
		button?.setAttribute('disabled', '')
	} else {
		button?.removeAttribute('disabled')
	}
}

export function applyUrls(backgrounds: Sync.Backgrounds) {
	console.log('Apply')
}
