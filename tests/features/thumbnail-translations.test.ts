import { assertEquals } from '@std/assert'
import '../init.ts'
import { LOCAL_DEFAULT, tabsBc } from '../../src/scripts/defaults.ts'
import { storage } from '../../src/scripts/storage.ts'
import { setTranslationCache, toggleTraduction, tradThis } from '../../src/scripts/utils/translations.ts'
import { thumbnailMessages } from '../../src/scripts/features/links/thumbnail-messages.ts'
import type { Local, Translations } from '../../src/types/local.ts'

Deno.test('Thumbnail translations refresh incomplete caches and follow language changes', async (test) => {
    const originalFetch = globalThis.fetch
    const originalGet = storage.local.get
    const originalSet = storage.local.set
    const originalRemove = storage.local.remove
    const cached: Local = { ...LOCAL_DEFAULT }
    let fetches = 0
    const dictionaries: Record<string, Translations> = {}
    for (const locale of ['fr', 'de']) {
        dictionaries[locale] = JSON.parse(await Deno.readTextFile(`_locales/${locale}/translations.json`))
    }
    globalThis.fetch = (input) => {
        fetches++
        const locale = String(input).match(/_locales\/([^/]+)\/translations\.json/)?.[1] ?? ''
        if (!dictionaries[locale]) throw new Error(`Unexpected translation request: ${locale}`)
        return Promise.resolve(new Response(JSON.stringify(dictionaries[locale])))
    }
    storage.local.get = () => Promise.resolve(cached)
    storage.local.set = ({ translations }) => {
        cached.translations = translations
    }
    storage.local.remove = (key) => {
        if (key === 'translations') cached.translations = undefined
    }

    try {
        await test.step('An older cache missing new messages is refreshed', async () => {
            const translations = { ...dictionaries.fr }
            delete translations.Thumbnail
            await setTranslationCache('fr', { ...LOCAL_DEFAULT, translations }, thumbnailMessages)
            assertEquals(fetches, 1)
            assertEquals(tradThis('Could not save thumbnail'), dictionaries.fr['Could not save thumbnail'])
            assertEquals(cached.translations, dictionaries.fr)
        })

        await test.step('A complete cache is reused', async () => {
            await setTranslationCache('fr', cached, thumbnailMessages)
            assertEquals(fetches, 1)
        })

        await test.step('The warning, status and shared Thumbnail labels change language without a reload', async () => {
            const help = document.createElement('p')
            const status = document.createElement('p')
            const captureLabel = document.createElement('label')
            const captureOption = document.createElement('option')
            captureLabel.className = 'trn'
            captureOption.className = 'trn'
            captureLabel.textContent = tradThis('Thumbnail')
            captureOption.textContent = tradThis('Thumbnail')
            help.className = 'thumbnail-help trn'
            status.className = 'trn'
            const warning = thumbnailMessages.find((message) => message.startsWith('Capture opens'))!
            help.textContent = tradThis(warning)
            status.textContent = tradThis('Thumbnail cache cleared')
            document.body.replaceChildren(help, status, captureLabel, captureOption)

            await toggleTraduction('de')
            assertEquals(help.textContent, dictionaries.de[warning])
            assertEquals(status.textContent, dictionaries.de['Thumbnail cache cleared'])
            assertEquals(captureLabel.textContent, dictionaries.de.Thumbnail)
            assertEquals(captureOption.textContent, dictionaries.de.Thumbnail)

            await toggleTraduction('en')
            assertEquals(help.textContent, warning)
            assertEquals(status.textContent, 'Thumbnail cache cleared')
            assertEquals(captureLabel.textContent, 'Thumbnail')
            assertEquals(captureOption.textContent, 'Thumbnail')
        })
    } finally {
        globalThis.fetch = originalFetch
        storage.local.get = originalGet
        storage.local.set = originalSet
        storage.local.remove = originalRemove
        tabsBc.close()
    }
})
