let trns = {}

//
export default async () => {
	if (localStorage.lastLang === 'fr') {
		trns = (await import('../../../_locales/fr/translations.json')).default
	}
}

export function traduction(settingsDom: Element | null, lang = 'en') {
	if (lang === 'en') {
		return
	}

	const tags = (settingsDom ? settingsDom : document.body).querySelectorAll('.trn')
	let text: string

	tags.forEach((trn) => {
		if (trn.textContent) {
			text = trn.textContent

			if (text in trns) {
				trn.textContent = trns[text as keyof typeof trns]
			}
		}
	})

	document.documentElement.setAttribute('lang', lang)
}

export function tradThis(str: string, lang?: string): string {
	if (!lang) {
		lang = document.documentElement.getAttribute('lang') || 'en'
	}

	if (lang === 'en') {
		return str
	}

	if (str in trns) {
		return trns[str as keyof typeof trns]
	}

	return str
}
