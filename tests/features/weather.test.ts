import { assertEquals } from '@std/assert'
import '../init.ts'

import { LOCAL_DEFAULT, SYNC_DEFAULT } from '../../src/scripts/defaults.ts'
import { setTranslationCache, toggleTraduction } from '../../src/scripts/utils/translations.ts'
import { storage } from '../../src/scripts/storage.ts'
import type { LastWeather, Translations } from '../../src/types/local.ts'

document.body.innerHTML = `
    <a id="weather">
        <span id="current-desc"></span>
        <span id="current-temp">
            <span id="current-a"></span>
            <span id="current-temp-a"><span class="temp-value"></span><span class="temp-unit"></span></span>
            <span id="current-b"></span>
            <span id="current-temp-b"><span class="temp-value"></span><span class="temp-unit"></span></span>
        </span>
        <span id="dotContainer"></span>
        <span id="tempContainer"><span class="temp-value"></span><span class="temp-unit"></span></span>
    </a>
`

const { displayWeather } = await import('../../src/scripts/features/weather/display.ts')
const weather = structuredClone(SYNC_DEFAULT.weather)
const cached: LastWeather = {
    temp: 16,
    feels_like: 16,
    forecasted_high: 19,
    forecasted_timestamp: 0,
    sunrise: 0,
    sunset: 0,
    icon_id: 'overcastclouds',
    description: 'Cloudy',
    timestamp: Date.now(),
    link: '',
}

storage.type.init()

Deno.test({
    name: 'Cached English weather uses locale translations without changing the cached provider data',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await useLocale('tr')

        try {
            displayWeather(weather, cached)
            assertEquals(document.getElementById('current-desc')?.textContent, 'Bulutlu. ')
            assertEquals(cached.description, 'Cloudy')
            assertEquals(document.querySelector('#current-temp-a .temp-value')?.textContent, '16°')

            await toggleTraduction('en')
            displayWeather(weather, cached)
            assertEquals(document.getElementById('current-desc')?.textContent, 'Cloudy. ')
        } finally {
            await toggleTraduction('en')
        }
    },
})

Deno.test({
    name: 'Weather translations preserve cloud cover and precipitation intensity',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await useLocale('tr')

        try {
            displayWeather(weather, { ...cached, description: 'Overcast' })
            assertEquals(document.getElementById('current-desc')?.textContent, 'Kapalı. ')

            displayWeather(weather, { ...cached, description: 'Heavy rain' })
            assertEquals(document.getElementById('current-desc')?.textContent, 'Şiddetli yağmurlu. ')

            displayWeather(weather, { ...cached, description: 'Light snow' })
            assertEquals(document.getElementById('current-desc')?.textContent, 'Hafif kar yağışlı. ')
        } finally {
            await toggleTraduction('en')
        }
    },
})

Deno.test({
    name: 'Unrecognized weather descriptions fall back to the complete provider text',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await useLocale('tr')

        try {
            displayWeather(weather, { ...cached, description: 'Partly cloudy and freezing rain' })
            assertEquals(
                document.getElementById('current-desc')?.textContent,
                'Partly cloudy and freezing rain. ',
            )
        } finally {
            await toggleTraduction('en')
        }
    },
})

Deno.test({
    name: 'Already localized provider descriptions retain their original wording',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
        await useLocale('fr')

        try {
            displayWeather(weather, { ...cached, description: 'Ciel couvert' })
            assertEquals(document.getElementById('current-desc')?.textContent, 'Ciel couvert. ')
        } finally {
            await toggleTraduction('en')
        }
    },
})

Deno.test('Every locale contains the English reference keys', () => {
    const english: Translations = JSON.parse(Deno.readTextFileSync('_locales/en/translations.json'))
    const expected = Object.keys(english).sort()

    for (const locale of Deno.readDirSync('_locales')) {
        if (!locale.isDirectory) continue

        const dictionary: Translations = JSON.parse(
            Deno.readTextFileSync(`_locales/${locale.name}/translations.json`),
        )

        assertEquals(Object.keys(dictionary).sort(), expected, locale.name)
    }
})

async function useLocale(language: string): Promise<void> {
    const local = structuredClone(LOCAL_DEFAULT)
    local.translations = JSON.parse(Deno.readTextFileSync(`_locales/${language}/translations.json`))
    await setTranslationCache(language, local)
}
