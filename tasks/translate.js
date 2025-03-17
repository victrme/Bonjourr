const langs = readdirSync('./_locales/')
const englishDict = JSON.parse(readFileSync('./_locales/en/translations.json', 'utf8'))
const files = []

for (const lang of langs) {
	const isCorrect = lang.length === 2 || (lang.length === 5 && lang[2] === '-')
	const isNotEnglish = lang !== 'en'

	if (isCorrect && isNotEnglish) {
		files.push(translateFile(lang))
	}
}

await Promise.all(files)

/**
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function translateFile(lang) {
	const translations = readFileSync(`./_locales/${lang}/translations.json`, 'utf8')
	const newDict = {}
	let removed = 0
	let added = 0
	let langDict

	try {
		langDict = JSON.parse(translations)
	} catch (_) {
		return console.log('Cannot translate ' + lang)
	}

	// Remove keys not found in "english" translation file
	for (const key of Object.keys(langDict)) {
		if (englishDict[key]) {
			newDict[key] = langDict[key]
			continue
		}

		removed++
	}

	// Add keys & translate new stuff
	const missingKeys = Object.keys(englishDict).filter((key) => newDict[key] === undefined)

	if (missingKeys.length > 0) {
		const message = lang + '\n' + missingKeys.join('\n')
		const translations = await claudeTranslation(message)

		for (const key of missingKeys) {
			newDict[key] = translations.get(key)
			added++
		}
	}

	// Order translations
	const keylist = new Set()
	const enKeys = [...Object.keys(englishDict)]
	const sortOrder = (a, b) => enKeys.indexOf(a) - enKeys.indexOf(b)

	JSON.stringify(newDict, (key, value) => {
		return keylist.add(key), value
	})

	const stringified = JSON.stringify(newDict, Array.from(keylist).sort(sortOrder), 2)

	// Write to file
	writeFileSync(`./_locales/${lang}/translations.json`, stringified)

	// Log
	console.log(`${lang.slice(0, 2)}: [removed: ${removed}, added: ${added}]`)
}

/**
 * @param {string} message
 * @returns {Promise<Map<string, string>>}
 */
async function claudeTranslation(message) {
	const init = { body: message, method: 'POST' }
	const path = 'https://claude-translator.victr.workers.dev/'
	const json = await (await fetch(path, init)).json()
	const trns = JSON.parse(json.content[0].text)
	const map = new Map()

	for (const [en, trn] of trns) {
		map.set(en, trn)
	}

	return map
}
