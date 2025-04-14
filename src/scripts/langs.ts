// Uses ISO 639
// https://wikipedia.org/wiki/List_of_ISO_639_language_codes

export const langList = {
	en: 'English',
	fr: 'Français',
	de: 'Deutsch',
	it: 'Italiano',
	es: 'Español',
	ca: 'Català',
	'pt-BR': 'Português (Brasil)',
	'pt-PT': 'Português (Portugal)',
	nl: 'Nederlands',
	da: 'Dansk',
	sv: 'Svenska',
	nb: 'Norsk',
	fi: 'suomi',
	pl: 'Polski',
	cs: 'Čeština',
	hr: 'Hrvatski',
	sk: 'Slovenský',
	hu: 'Magyar',
	ro: 'Română',
	el: 'Ελληνικά',
	sr: 'Српски (ћирилица)',
	'sr-YU': 'Srpski (latinica)',
	be: 'Беларуская',
	uk: 'Українська',
	ru: 'Русский',
	tr: 'Türkçe',
	hy: 'Հայերեն',
	az: 'Azərbaycan',
	ar: 'العربية',
	fa: 'فارسی',
	id: 'Indonesia',
	vi: 'Tiếng Việt',
	'zh-CN': '中国简体中文',
	'zh-HK': '香港繁體中文',
	'zh-TW': '臺灣正體中文',
	'nan-Hant-TW': '臺灣台語（漢羅）',
	ko: '한국어',
	ja: '日本語',
	te: 'తెలుగు',
}

// uses basic latin characters if not included
export const subsets = {
	el: 'greek',
	ar: 'arabic',
	fa: 'arabic',
	ru: 'cyrillic',
	uk: 'cyrillic',
	sr: 'cyrillic',
	be: 'cyrillic',  
	sk: 'latin-ext',
	hr: 'latin-ext',
	cs: 'latin-ext',
	pl: 'latin-ext',
	ro: 'latin-ext',
	tr: 'latin-ext',
	hu: 'latin-ext',
	vi: 'latin-ext',
	az: 'latin-ext',
	ja: 'japanese',
	hy: 'armenian',
	te: 'telugu',
	'zh-CN': 'chinese-simplified',
	'zh-HK': 'chinese-traditional',
	'zh-TW': 'chinese-traditional',
	'nan-Hant-TW': 'chinese-traditional',
	ko: 'korean',
}
