import { stringMaxSize } from '../utils'
import { eventDebounce } from '../utils/debounce'
import onSettingsLoad from '../utils/onsettingsload'
import { tradThis } from '../utils/translations'

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

	onSettingsLoad(async () => {
		const { defaultCommands, setIgnoreTab } = await import('prism-code-editor/commands')
		const { createEditor } = await import('prism-code-editor')
		await import('prism-code-editor/prism/languages/css-extras')

		const options = {
			language: 'css',
			lineNumbers: false,
			wordWrap: true,
			value: init || `/* ${tradThis('Type in your custom CSS')} */`,
		}

		const editor = createEditor('#css-editor', options, defaultCommands())

		editor.addListener('update', (value) => {
			value = stringMaxSize(value, 8080)
			eventDebounce({ css: value })
			stylelink.textContent = value
		})

		setIgnoreTab(true)
	})
}
