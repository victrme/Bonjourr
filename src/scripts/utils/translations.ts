let trns: any = JSON.parse(localStorage.translations ?? '{}')

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
