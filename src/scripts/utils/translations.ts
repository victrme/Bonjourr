import { Langs } from '../../types/langs'
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

// To add new translated keys:
//
// 0. Add correct "en": "en" keys to /_locales/en/translations.json
// 1. Translate using your prefered tool
// 1. Add translations to "newkeys" in this format: {fr: {a: x, b: y, c: z}, pt_BR: {...}, ...}
// 2. uncomment the updateTranslationFile function above
// 3. Open console and change language
// 4. Replace .json file with console output

const newkeys: NewKeys = <const>{
	// ...
}

//
//
//

type NewKeys = {
	[key in Langs]?: {
		[key: string]: string
	}
}

async function updateTranslationFile(trns?: Local.Translations) {
	if (!trns) return

	const en = await (await fetch('../../_locales/en/translations.json')).json()
	const orderedKeys = [...Object.keys(en)]
	let filteredTrns: Local.Translations = {
		lang: trns.lang,
	}

	// Filter to only keys in "english" translation file
	for (const key of orderedKeys) {
		filteredTrns[key] = key in trns ? trns[key] : en[key]
	}

	// Add new keys if they exist
	if (newkeys) {
		filteredTrns = addNewKeys(filteredTrns, newkeys[trns.lang as Langs])
	}

	// Order translation file
	const keylist = new Set<string>()
	JSON.stringify(filteredTrns, (key, value) => (keylist.add(key), value))

	const sortOrder = (a: string, b: string) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)
	const result = JSON.stringify(filteredTrns, Array.from(keylist).sort(sortOrder), 2)

	console.clear()
	console.log(result)
}

function addNewKeys(old: Local.Translations, trns: NewKeys[Langs]): Local.Translations {
	for (const key of Object.keys(old)) {
		console.log(key)

		if (key === old[key] && trns && trns[key]) {
			old[key] = trns[key]
		}
	}

	return old
}
