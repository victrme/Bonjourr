//

const langs = Array.from(Deno.readDirSync('./_locales/'))
	.filter((entry) => entry.isDirectory)
	.map((entry) => entry.name)

const englishDict = JSON.parse(Deno.readTextFileSync('./_locales/en/translations.json'))
const files = []

for (const lang of langs) {
	const isCorrect = lang.length === 2 || (lang.length === 5 && lang[2] === '-')
	const isNotEnglish = lang !== 'en'

	if (isCorrect && isNotEnglish) {
		files.push(translateFile(lang))
	}
}

await Promise.all(files)

async function translateFile(lang: string): Promise<void> {
	const translations = Deno.readTextFileSync(`./_locales/${lang}/translations.json`)
	const newDict: Record<string, string> = {}
	let removed = 0
	let added = 0
	let langDict

	try {
		langDict = JSON.parse(translations)
	} catch (_) {
		console.error(`Cannot translate ${lang}`)
		return
	}

	// 1. Remove keys not found in "english" translation file

	for (const key of Object.keys(langDict)) {
		if (englishDict[key]) {
			newDict[key] = langDict[key]
			continue
		}

		removed++
	}

	// 2. Add keys & translate new stuff

	const englishKeys = Object.keys(englishDict)
	const missingKeys = englishKeys.filter((k) => newDict[k] === undefined)

	if (missingKeys.length > 0) {
		const message = `${lang}\n${missingKeys.join('\n')}`
		const translations = await claudeTranslation(message)

		if (translations) {
			for (const index in missingKeys) {
				const en = missingKeys[index]
				const trn = translations[index]

				newDict[en] = trn
				added++
			}
		}
	}

	// 3. Order translations

	const keylist = new Set<string>()
	const enKeys = [...Object.keys(englishDict)]
	const sortOrder = (a: string, b: string) => enKeys.indexOf(a) - enKeys.indexOf(b)

	for (const key of enKeys) {
		keylist.add(key)
	}

	const stringified = JSON.stringify(newDict, Array.from(keylist).sort(sortOrder), 2)

	// 4. Write to file
	Deno.writeTextFileSync(`./_locales/${lang}/translations.json`, stringified)

	// 5. Info
	console.info(`${lang.slice(0, 2)}: [removed: ${removed}, added: ${added}]`)
}

async function claudeTranslation(body: string): Promise<string[] | undefined> {
	const path = 'https://translate.bonjourr.workers.dev/'
	const response = await fetch(path, { body, method: 'POST' })

	if (response.status === 200) {
		const text = await response.text()
		return text.split('\n')
	}
}
