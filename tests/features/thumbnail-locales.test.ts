import { assertEquals } from '@std/assert'
import { langList } from '../../src/scripts/langs.ts'
import { thumbnailMessages } from '../../src/scripts/features/links/thumbnail-messages.ts'

Deno.test('Every supported locale defines each thumbnail message exactly once', async (test) => {
    const locales = Array.from(Deno.readDirSync('_locales')).filter((entry) => entry.isDirectory).map((entry) =>
        entry.name
    )
    assertEquals(locales.toSorted(), Object.keys(langList).toSorted())

    for (const locale of locales) {
        await test.step(locale, async () => {
            const text = await Deno.readTextFile(`_locales/${locale}/translations.json`)
            const translations = JSON.parse(text) as Record<string, string>
            const keys = [...text.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:/gm)].map((match) => JSON.parse(match[1]))

            for (const message of thumbnailMessages) {
                assertEquals(typeof translations[message], 'string', `${locale}: missing ${message}`)
                assertEquals(translations[message].trim().length > 0, true, `${locale}: empty ${message}`)
                assertEquals(keys.filter((key) => key === message).length, 1, `${locale}: duplicate ${message}`)
            }
        })
    }
})
