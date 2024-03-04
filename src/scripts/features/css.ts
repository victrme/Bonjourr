import { stringMaxSize } from '../utils'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'

import { createEditor } from 'prism-code-editor'
import 'prism-code-editor/prism/languages/css-extras'

export default function customCss(init?: string, event?: { styling: string }) {
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

	onSettingsLoad(() => {
		const editor = createEditor('#css-editor', {
			lineNumbers: false,
			language: 'css',
			wordWrap: true,
			value: init || '/* Type in your custom CSS */',
		})

		editor.addListener('update', (value) => {
			value = stringMaxSize(value, 8080)
			eventDebounce({ css: value })
			stylelink.textContent = value
		})
	})
}
