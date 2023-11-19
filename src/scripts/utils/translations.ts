import storage from '../storage'
import type { Local, Translations } from '../types/local'

let trns: Translations | undefined

export async function setTranslationCache(lang: string, local?: Local, isUpdate?: boolean) {
	if (lang === 'en') {
		storage.local.remove('translations')
		trns = undefined
		return
	}

	if (!isUpdate) {
		trns = local?.translations ?? (await storage.local.get('translations'))?.translations
	}

	if (trns?.lang !== lang) {
		trns = await (await fetch(`../../_locales/${lang}/translations.json`)).json()
		storage.local.set({ translations: trns })
	}
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

	setTextDirection(lang)
	document.documentElement.setAttribute('lang', lang)
}

export async function toggleTraduction(lang: string) {
	const tags = document.querySelectorAll('.trn')
	let newDict: Translations | undefined
	let toggleDict: { [key: string]: string } = {}
	let currentDict = { ...trns }
	let text: string

	setTextDirection(lang)

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
}

export function tradThis(str: string): string {
	return trns ? trns[str] ?? str : str
}

function setTextDirection(lang: string) {
	if (lang === 'fa') {
		document.body.style.direction = 'rtl'
	} else {
		document.body.style.removeProperty('direction')
	}
}
