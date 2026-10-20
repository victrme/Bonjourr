import { storage } from '../storage.ts'
import { siteLangs } from '../langs.ts'

import type { Local, Translations } from '../../types/local.ts'

let trns: Translations | undefined
let currentTrnsLang = 'en'

export async function setTranslationCache(language: string, local?: Local): Promise<void> {
    const lang = countryCodeToLanguageCode(language)

    if (lang === 'en') {
        storage.local.remove('translations')
        storage.local.remove('translationsRevision')
        trns = undefined
        currentTrnsLang = lang
        return
    }

    const revision = globalThis.TRANSLATIONS_REVISION
    const cachedTranslations = local?.translations
    const useCache = revision && local?.translationsRevision === revision && cachedTranslations?.lang === lang

    if (useCache) {
        trns = cachedTranslations
    } else {
        try {
            // A content revision also avoids stale translation files in the web app's service worker cache.
            const path = `../../_locales/${lang}/translations.json` + (revision ? `?v=${revision}` : '')
            const response = await fetch(path)

            if (!response.ok) {
                throw new Error(`Cannot get translations: ${lang}`)
            }

            trns = await response.json()
            storage.local.set({ translations: trns, translationsRevision: revision })
        } catch (error) {
            console.warn(`Could not load ${lang} translations`, error)

            if (cachedTranslations?.lang !== lang) {
                throw error
            }

            trns = cachedTranslations
        }
    }

    currentTrnsLang = lang
}

export function traduction(scope: Element | null, lang = 'en'): void {
    if (lang === 'en') {
        return
    }

    if (trns) {
        const dom = scope ?? document.body
        const tags = dom.querySelectorAll('.trn')
        let text: string

        for (const tag of tags) {
            text = tag.textContent?.trim() ?? ''
            tag.textContent = (trns[text] as string) ?? text
        }
    }

    document.documentElement.setAttribute('lang', lang)
    currentTrnsLang = lang
}

export async function toggleTraduction(lang: string): Promise<void> {
    const tags = document.querySelectorAll('.trn')
    const toggleDict: { [key: string]: string } = {}
    const currentDict = { ...trns }
    let text: string

    await setTranslationCache(lang)
    const newDict: Translations | undefined = (await storage.local.get('translations')).translations

    // old lang is 'en'
    if (newDict && currentDict?.lang === undefined) {
        for (const key of Object.keys(newDict)) {
            currentDict[key] = key
        }
    }

    // {en: fr} & {en: sv} ==> {fr: sv}
    for (const [key, val] of Object.entries(currentDict)) {
        if (lang === 'en') {
            toggleDict[val] = key
        } else if (newDict) {
            toggleDict[val] = newDict[key]
        }
    }

    for (const tag of tags) {
        text = tag.textContent ?? ''
        tag.textContent = toggleDict[text] ?? text
    }

    currentTrnsLang = lang
}

export function getLang(): string {
    return currentTrnsLang
}

export function tradThis(str: string): string {
    return trns ? (trns[str] ?? str) : str
}

export function countryCodeToLanguageCode(lang: string): string {
    let sanitizedLang = lang

    if (lang.includes('ES')) {
        sanitizedLang = 'es'
    }
    if (lang === 'gr') {
        sanitizedLang = 'el'
    }
    if (lang === 'jp') {
        sanitizedLang = 'ja'
    }
    if (lang === 'cz') {
        sanitizedLang = 'cs'
    }

    sanitizedLang = sanitizedLang.replace('_', '-')

    return sanitizedLang
}

// returns the needed lang code for the site URLs
export function getLangForSite(): string {
    return siteLangs[currentTrnsLang] ?? 'en'
}
