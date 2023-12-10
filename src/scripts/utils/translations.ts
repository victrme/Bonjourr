import storage from '../storage'
import { Local } from '../types/local'

type Dict = { [key: string]: string }

let trns: Dict = {}

export async function setTranslationCache(lang: string, local?: Local, isUpdate?: boolean) {
	if (lang === 'en') {
		trns = {}
		return
	}

	const needsTranslations = isUpdate || local?.translations?.lang !== lang || !local?.translations

	if (needsTranslations) {
		trns = await (await fetch(`../../_locales/${lang}/translations.json`)).json()
		storage.local.set({ translations: trns })
		return
	}

	trns = local.translations
}

export function traduction(settingsDom: Element | null, lang = 'en') {
	if (lang === 'en') return

	const dom = settingsDom ? settingsDom : document.body
	const tags = dom.querySelectorAll('.trn')
	let text: string

	for (const tag of tags) {
		text = tag.textContent ?? ''
		tag.textContent = (trns[text] as string) ?? text
	}

	document.documentElement.setAttribute('lang', lang)
}

export async function toggleTraduction(lang: string) {
	const tags = document.querySelectorAll('.trn')
	let newDict: Dict = {}
	let toggleDict: Dict = {}
	let currentDict = { ...trns }
	let text: string

	await setTranslationCache(lang)
	newDict = (await storage.local.get('translations')).translations

	// old lang is 'en'
	if (currentDict?.lang === undefined) {
		Object.keys(newDict).forEach((key) => (currentDict[key] = key))
	}

	// {en: fr} & {en: sv} ==> {fr: sv}
	for (const [key, val] of Object.entries(currentDict)) {
		toggleDict[val] = lang === 'en' ? key : newDict[key]
	}

	for (const tag of tags) {
		text = tag.textContent ?? ''
		tag.textContent = toggleDict[text] ?? text
	}
}

export function tradThis(str: string): string {
	return trns[str] ?? str
}
