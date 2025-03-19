import { onSettingsLoad } from '../utils/onsettingsload'
import { stringMaxSize } from '../shared/generic'
import { eventDebounce } from '../utils/debounce'
import { tradThis } from '../utils/translations'

export function customCss(init?: string, event?: { styling: string }) {
	const stylelink = document.getElementById('styles') as HTMLStyleElement

	if (event) {
		if (event?.styling !== undefined) {
			const val = stringMaxSize(event.styling, 8080)
			stylelink.textContent = val
			eventDebounce({ css: val })
		}

		return
	}

	if (init) {
		stylelink.textContent = init
	}

	onSettingsLoad(async () => {
		const { createCssEditor } = await import('./csseditor')

		const options = {
			language: 'css',
			lineNumbers: false,
			wordWrap: true,
			insertSpaces: false,
			value: init || '',
		}

		const editor = createCssEditor(options)
		const tabCommand = editor.keyCommandMap.Tab

		editor.textarea.id = 'css-editor-textarea'
		editor.textarea.maxLength = 8080
		editor.textarea.setAttribute('aria-labelledby', 'lbl-css')
		editor.textarea.placeholder = tradThis('Type in your custom CSS')

		editor.addListener('update', value => {
			eventDebounce({ css: stringMaxSize(value, 8080) })
			stylelink.textContent = stringMaxSize(value, 8080)
		})

		editor.keyCommandMap.Tab = (e, selection, value) => {
			if (document.body.matches('.tabbing')) {
				return false
			}

			return tabCommand?.(e, selection, value)
		}
	})
}
