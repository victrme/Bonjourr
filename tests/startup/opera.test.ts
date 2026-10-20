import { assertEquals } from '@std/assert'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register({ url: 'chrome-extension://audit/index.html', width: 1, height: 1 })
Object.defineProperty(navigator, 'userAgentData', {
    configurable: true,
    value: { brands: [{ brand: 'Opera', version: '100' }], mobile: false },
})
Object.defineProperty(globalThis, 'chrome', { configurable: true, value: {} })

const { storage } = await import('../../src/scripts/storage.ts')
const { setTranslationCache, traduction } = await import('../../src/scripts/utils/translations.ts')
const { operaExtensionExplainer } = await import('../../src/scripts/startup/opera.ts')
const source = new DOMParser().parseFromString(Deno.readTextFileSync('src/index.html'), 'text/html')
const template = source.getElementById('opera-explainer-template') as HTMLTemplateElement

storage.type.init()

Deno.test('Opera translates its template on first opening and retains the documentation link', async () => {
    document.body.replaceChildren(template.cloneNode(true))
    const originalFetch = globalThis.fetch
    const dictionary = JSON.parse(Deno.readTextFileSync('_locales/tr/translations.json'))
    globalThis.fetch = () => Promise.resolve(Response.json(dictionary))

    try {
        await setTranslationCache('tr')
        traduction(null, 'tr')
        operaExtensionExplainer()
        await new Promise((resolve) => setTimeout(resolve, 0))

        const dialog = document.getElementById('opera-explainer') as HTMLDialogElement
        const tutorial = dialog.querySelector('li:last-child')
        assertEquals(dialog.open, true)
        assertEquals(
            tutorial?.textContent?.replace(/\s+/g, ' ').trim(),
            'Belgelerimizdeki rehberi izleyin. Bonjourr veya başka bir başlangıç sayfası en azından çalışmalı!',
        )
        assertEquals(tutorial?.querySelector('a')?.getAttribute('href'), 'https://bonjourr.fr/docs#opera')
        const button = dialog.querySelector<HTMLButtonElement>('#b_opera-explained')
        assertEquals(button?.textContent, dictionary['Close and access Bonjourr'])
        button?.click()
        assertEquals(dialog.open, false)
        assertEquals((await storage.local.get('operaExplained')).operaExplained, true)
        assertEquals(document.body.classList.contains('loading'), false)
    } finally {
        globalThis.fetch = originalFetch
        await setTranslationCache('en')
        document.body.replaceChildren()
    }
})

Deno.test('Opera leaves the dialog hidden when its explanation has already been acknowledged', () => {
    document.body.replaceChildren(template.cloneNode(true))
    operaExtensionExplainer(true)
    assertEquals(document.getElementById('opera-explainer'), null)
    assertEquals(document.body.classList.contains('loading'), false)
    document.body.replaceChildren()
})
