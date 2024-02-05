import storage from '../storage'

let trns: Local.Translations | undefined
let currentTrnsLang = 'en'

export async function setTranslationCache(lang: string, local?: Local.Storage, isUpdate?: boolean) {
	if (lang === 'en') {
		storage.local.remove('translations')
		trns = undefined
		return
	}

	const cachedLang = local?.translations?.lang
	const useCache = !isUpdate && local && cachedLang === lang

	if (useCache) {
		trns = local.translations
	} else {
		trns = await (await fetch(`../../_locales/${lang}/translations.json`)).json()
		storage.local.set({ translations: trns })
	}

	// updateTranslationFile(trns)
	currentTrnsLang = lang
}

export function traduction(settingsDom: Element | null, lang = 'en') {
	if (lang === 'en') {
		return
	}

	if (trns) {
		const dom = settingsDom ? settingsDom : document.body
		const tags = dom.querySelectorAll('.trn')
		let text: string

		for (const tag of tags) {
			text = tag.textContent ?? ''
			tag.textContent = (trns[text] as string) ?? text
		}
	}

	document.documentElement.setAttribute('lang', lang)
	currentTrnsLang = lang
}

export async function toggleTraduction(lang: string) {
	const tags = document.querySelectorAll('.trn')
	let newDict: Local.Translations | undefined
	let toggleDict: { [key: string]: string } = {}
	let currentDict = { ...trns }
	let text: string

	await setTranslationCache(lang)
	newDict = (await storage.local.get('translations')).translations

	// old lang is 'en'
	if (newDict && currentDict?.lang === undefined) {
		Object.keys(newDict).forEach((key) => (currentDict[key] = key))
	}

	// {en: fr} & {en: sv} ==> {fr: sv}
	for (const [key, val] of Object.entries(currentDict)) {
		if (lang === 'en') toggleDict[val] = key
		else if (newDict) toggleDict[val] = newDict[key]
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
	return trns ? trns[str] ?? str : str
}

//
//	Dev only
//

async function updateTranslationFile(trns?: Local.Translations) {
	if (!trns) return

	const en = await (await fetch('../../_locales/en/translations.json')).json()
	const orderedKeys = [...Object.keys(en)]
	const filteredTrns: Local.Translations = {
		lang: trns.lang,
	}

	// Filter to only keys in "english" translation file
	for (const key of orderedKeys) {
		filteredTrns[key] = key in trns ? trns[key] : en[key]
	}

	// Order translation file
	const keylist = new Set<string>()
	JSON.stringify(filteredTrns, (key, value) => (keylist.add(key), value))

	const sortOrder = (a: string, b: string) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)
	const result = JSON.stringify(filteredTrns, Array.from(keylist).sort(sortOrder), 2)

	console.clear()
	console.log(result)
}
