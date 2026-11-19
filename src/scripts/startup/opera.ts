import { BROWSER, PLATFORM } from '../defaults.ts'
import { storage } from '../storage.ts'
import { getLang, traduction } from '../utils/translations.ts'

export function operaExtensionExplainer(explained?: true): void {
    if (explained || BROWSER !== 'opera' || PLATFORM !== 'chrome') {
        return
    }

    const template = document.getElementById('opera-explainer-template') as HTMLTemplateElement
    const doc = template.content.cloneNode(true) as Document
    const dialog = doc.getElementById('opera-explainer') as HTMLDialogElement
    const button = doc.getElementById('b_opera-explained')

    traduction(dialog, getLang())
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
