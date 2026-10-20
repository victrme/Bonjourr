import { assertEquals, assertRejects } from '@std/assert'
import '../init.ts'

import { LOCAL_DEFAULT } from '../../src/scripts/defaults.ts'
import { storage } from '../../src/scripts/storage.ts'
import { getLang, setTranslationCache, tradThis } from '../../src/scripts/utils/translations.ts'

storage.type.init()
globalThis.TRANSLATIONS_REVISION = 'test-revision'

Deno.test('Startup replaces stale translations without changing the selected language', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'tr', Hello: 'Eski çeviri', Removed: 'Kaldırılan çeviri' }
    const updated = { lang: 'tr', Hello: 'Merhaba', Cloudy: 'Bulutlu' }
    const originalFetch = globalThis.fetch
    globalThis.fetch = (input) => {
        assertEquals(input, '../../_locales/tr/translations.json?v=test-revision')
        return Promise.resolve(Response.json(updated))
    }

    try {
        await setTranslationCache('tr', local)
        assertEquals(tradThis('Cloudy'), 'Bulutlu')
        assertEquals(tradThis('Hello'), 'Merhaba')
        assertEquals(tradThis('Removed'), 'Removed')
        assertEquals((await storage.local.get('translations')).translations, updated)
        assertEquals((await storage.local.get('translationsRevision')).translationsRevision, 'test-revision')
    } finally {
        globalThis.fetch = originalFetch
        await setTranslationCache('en')
    }
})

Deno.test('An unchanged translation revision uses the cache without reading the file again', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'tr', Cloudy: 'Bulutlu' }
    local.translationsRevision = 'test-revision'
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = () => {
        requests++
        return Promise.resolve(Response.json({ lang: 'tr', Cloudy: 'Unexpected translation' }))
    }

    try {
        await setTranslationCache('tr', local)
        assertEquals(tradThis('Cloudy'), 'Bulutlu')
        assertEquals(requests, 0)
    } finally {
        globalThis.fetch = originalFetch
        await setTranslationCache('en')
    }
})

Deno.test('A new content revision replaces changed wording even when the app version is unchanged', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'tr', Cloudy: 'Eski çeviri' }
    local.translationsRevision = 'previous-revision'
    const originalFetch = globalThis.fetch
    globalThis.fetch = () => Promise.resolve(Response.json({ lang: 'tr', Cloudy: 'Bulutlu' }))

    try {
        await setTranslationCache('tr', local)
        assertEquals(tradThis('Cloudy'), 'Bulutlu')
        assertEquals((await storage.local.get('translationsRevision')).translationsRevision, 'test-revision')
    } finally {
        globalThis.fetch = originalFetch
        await setTranslationCache('en')
    }
})

Deno.test('Failed refreshes retain the same-language cache and retry on the next startup', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'tr', Cloudy: 'Bulutlu' }
    local.translationsRevision = 'previous-revision'
    storage.local.set({ translations: local.translations, translationsRevision: local.translationsRevision })
    const originalFetch = globalThis.fetch
    const originalWarn = console.warn
    let warnings = 0
    console.warn = () => warnings++

    try {
        for (
            const fetch of [
                () => Promise.reject(new TypeError('Offline')),
                () => Promise.resolve(Response.json({ error: 'Unavailable' }, { status: 503 })),
                () => Promise.resolve(new Response('Invalid JSON')),
            ]
        ) {
            globalThis.fetch = fetch
            await setTranslationCache('tr', local)
            assertEquals(tradThis('Cloudy'), 'Bulutlu')
            const cached = await storage.local.get(['translations', 'translationsRevision'])
            assertEquals(cached.translations, local.translations)
            assertEquals(cached.translationsRevision, 'previous-revision')
        }

        assertEquals(warnings, 3)

        globalThis.fetch = () => Promise.resolve(Response.json({ lang: 'tr', Cloudy: 'Güncel çeviri' }))
        await setTranslationCache('tr', local)
        assertEquals(tradThis('Cloudy'), 'Güncel çeviri')
        assertEquals((await storage.local.get('translationsRevision')).translationsRevision, 'test-revision')
    } finally {
        globalThis.fetch = originalFetch
        console.warn = originalWarn
        await setTranslationCache('en')
    }
})

Deno.test('A failed language load cannot use a cache belonging to another language', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'fr', Cloudy: 'Nuageux' }
    local.translationsRevision = 'test-revision'
    const originalFetch = globalThis.fetch
    const originalWarn = console.warn
    globalThis.fetch = () => Promise.reject(new TypeError('Offline'))
    console.warn = () => {}

    try {
        await assertRejects(() => setTranslationCache('tr', local), TypeError, 'Offline')
        await assertRejects(() => setTranslationCache('tr'), TypeError, 'Offline')
    } finally {
        globalThis.fetch = originalFetch
        console.warn = originalWarn
        await setTranslationCache('en')
    }
})

Deno.test('English clears both the translation cache and its revision without fetching a file', async () => {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = { lang: 'tr', Cloudy: 'Bulutlu' }
    local.translationsRevision = 'test-revision'
    storage.local.set({ translations: local.translations, translationsRevision: local.translationsRevision })
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = () => {
        requests++
        return Promise.resolve(Response.json({ lang: 'tr' }))
    }

    try {
        await setTranslationCache('tr', local)
        await setTranslationCache('en')
        assertEquals(tradThis('Cloudy'), 'Cloudy')
        assertEquals(getLang(), 'en')
        assertEquals((await storage.local.get('translations')).translations, undefined)
        assertEquals((await storage.local.get('translationsRevision')).translationsRevision, undefined)
        assertEquals(requests, 0)
    } finally {
        globalThis.fetch = originalFetch
    }
})

Deno.test('Every bundled dictionary identifies its language and reuses its current cache', async () => {
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = () => {
        requests++
        return Promise.resolve(Response.json({ lang: 'unexpected' }))
    }

    try {
        for (const entry of Deno.readDirSync('_locales')) {
            if (!entry.isDirectory) {
                continue
            }

            const dictionary = JSON.parse(Deno.readTextFileSync(`_locales/${entry.name}/translations.json`))
            assertEquals(dictionary.lang, entry.name)
            const local = structuredClone(LOCAL_DEFAULT)
            local.translations = dictionary
            local.translationsRevision = 'test-revision'

            await setTranslationCache(entry.name, local)
            assertEquals(getLang(), entry.name)
            assertEquals(tradThis('Cloudy'), dictionary.Cloudy)
        }

        assertEquals(requests, 0)
    } finally {
        globalThis.fetch = originalFetch
        await setTranslationCache('en')
    }
})
