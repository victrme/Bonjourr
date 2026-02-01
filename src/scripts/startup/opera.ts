import { BROWSER, PLATFORM } from '../defaults.ts'
import { storage } from '../storage.ts'

export function operaExtensionExplainer(explained?: true) {
	if (explained || BROWSER !== 'opera' || PLATFORM !== 'chrome') {
		return
	}

	const template = document.getElementById('opera-explainer-template') as HTMLTemplateElement
	const doc = template.content.cloneNode(true) as Document
	const dialog = doc.getElementById('opera-explainer') as HTMLDialogElement
	const button = doc.getElementById('b_opera-explained')

	document.body.classList.add('loading')
	document.body.appendChild(dialog)
	dialog.showModal()
	setTimeout(() => dialog.classList.add('shown'))

	button?.addEventListener('click', () => {
		storage.local.set({ operaExplained: true })
		document.body.classList.remove('loading')
		dialog.close()
	})
}
