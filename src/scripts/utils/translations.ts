let trns: { [key: string]: string } = {}

export async function initTrns(lang: string) {
	trns = JSON.parse(localStorage.translations ?? '{}')

	if (!localStorage.translations && lang !== 'en') {
		localStorage.translations = await (await fetch(`../../../_locales/${lang}/translations.json`)).text()
		trns = JSON.parse(localStorage.translations)
	}
}

export function traduction(settingsDom: Element | null, lang = 'en') {
	if (lang === 'en') return

	const tags = (settingsDom ? settingsDom : document.body).querySelectorAll('.trn')
	let text: string

	for (const tag of tags) {
		text = tag.textContent ?? ''
		tag.textContent = trns[text] ?? text
	}

	document.documentElement.setAttribute('lang', lang)
}

export function tradThis(str: string): string {
	return trns[str] ?? str
}
