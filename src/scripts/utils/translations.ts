import parse from './JSONparse'

let trns: { [key: string]: string } = {}

export async function setTranslationCache(lang: string) {
	if (lang === 'en') {
		localStorage.removeItem('translations')
		trns = {}
		return
	}

	trns = parse(localStorage.translations) ?? {}

	if (trns?.lang !== lang) {
		localStorage.translations = await (await fetch(`../../../_locales/${lang}/translations.json`)).text()
		trns = parse(localStorage.translations) ?? {}
	}
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
	let newDict: { [key: string]: string } = {}
	let toggleDict: { [key: string]: string } = {}
	let currentDict = { ...trns }
	let text: string

	await setTranslationCache(lang)

	newDict = parse(localStorage.translations) ?? {}

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
