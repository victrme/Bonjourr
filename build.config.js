import { cp, copyFile, writeFile, watch } from 'node:fs/promises'
import esbuild from 'esbuild'
import * as sass from 'sass'
import * as deepl from 'deepl-node'
import process from 'node:process'
import fs from 'node:fs'

const args = process.argv.slice(2)
const platform = args[0] ?? 'all'
const PLATFORM_FIREFOX = platform === 'firefox'
const PLATFORM_CHROME = platform === 'chrome'
const PLATFORM_SAFARI = platform === 'safari'
const PLATFORM_ONLINE = platform === 'online'
const PLATFORM_EDGE = platform === 'edge'
const PLATFORM_ALL = platform === 'prod'
const env = args[1] ?? 'prod'
const ENV_DEV = env === 'dev'
const ENV_PROD = env === 'prod'
const ENV_TEST = env === 'test'

buildall()
watchall()

// Build or Watch

function buildall() {
	console.time('Built in')
	addDirectories()
	html()
	styles()
	assets()
	scripts()
	locales()
	manifests()
	console.timeEnd('Built in')
}

async function watchall() {
	if (ENV_PROD) {
		return
	}

	watcher('src', (filename) => {
		if (filename.includes('.html')) html()
		else if (filename.includes('styles/')) styles()
		else if (filename.includes('assets/')) assets()
		else if (filename.includes('scripts/')) scripts()
		else if (filename.includes('manifests/')) manifests()
	})

	watcher('_locales', (filename) => {
		locales(filename)
	})

	async function watcher(path, callback) {
		let debounce = 0

		for await (const event of watch(path, { recursive: true })) {
			clearInterval(debounce)

			debounce = setTimeout(() => {
				console.time('Built in')
				callback(event.filename.replaceAll('\\', '/'))
				console.timeEnd('Built in')
			}, 30)
		}
	}
}

function addDirectories() {
	try {
		if (fs.readdirSync('release')?.includes(platform)) {
			return
		}
	} catch (error) {
		console.error('First')
	}

	fs.mkdirSync(`release/${platform}/src/assets`, { recursive: true })
	fs.mkdirSync(`release/${platform}/src/scripts`, { recursive: true })
	fs.mkdirSync(`release/${platform}/src/styles`, { recursive: true })
}

// Builders

function html() {
	// TODO change html head

	copyFile('src/index.html', `release/${platform}/index.html`)
	copyFile('src/settings.html', `release/${platform}/settings.html`)

	// 		if (platform === 'edge') {
	// 			stream.pipe(replace(`favicon.ico`, `monochrome.png`))
	// 		}

	// 		if (platform === 'online') {
	// 			stream.pipe(replace(`<!-- icon -->`, `<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />`))
	// 			stream.pipe(replace(`<!-- manifest -->`, `<link rel="manifest" href="manifest.webmanifest">`))
	// 		} else {
	// 			stream.pipe(replace(`<!-- webext-storage -->`, `<script src="src/scripts/webext-storage.js"></script>`))
	// 		}
}

function styles() {
	const { css } = sass.compile('src/styles/style.scss')
	const path = `release/${platform}/src/styles/style.css`
	writeFile(path, css)
}

function scripts() {
	esbuild.buildSync({
		entryPoints: ['src/scripts/index.ts'],
		outfile: `release/${platform}/src/scripts/main.js`,
		format: 'iife',
		bundle: true,
		minifySyntax: ENV_PROD,
		minifyWhitespace: ENV_PROD,
	})

	if (PLATFORM_ONLINE) {
		copyFile('src/scripts/services/service-worker.js', `release/online/src/scripts/service-worker.js`)
	} else {
		copyFile('src/scripts/services/background.js', `release/${platform}/src/scripts/background.js`)
		copyFile('src/scripts/services/webext-storage.js', `release/${platform}/src/scripts/webext-storage.js`)
	}
}

function assets() {
	cp('src/assets/interface', `release/${platform}/src/assets/interface`, { recursive: true })
	cp('src/assets/weather', `release/${platform}/src/assets/weather`, { recursive: true })
	copyFile('src/assets/favicon.ico', `release/${platform}/src/assets/favicon.ico`)

	if (PLATFORM_ONLINE) {
		cp('src/assets/screenshots', `release/${platform}/src/assets/screenshots`, { recursive: true })
	}

	// TODO favicons

	if (PLATFORM_EDGE) {
		copyFile('src/assets/monochrome.png', `release/${platform}/src/assets/monochrome.png`)
	} else {
		copyFile('src/assets/favicon.ico', `release/${platform}/src/assets/favicon.ico`)
	}
}

function manifests() {
	// TODO no overview
	if (PLATFORM_ONLINE) {
		copyFile('src/manifests/manifest.webmanifest', `release/online/manifest.webmanifest`)
	} else {
		copyFile('src/manifests/chrome.json', `release/${platform}/manifest.json`)
	}
}

function locales(filename) {
	// TODO no overview
	cp('./_locales', `release/${platform}/_locales`, { recursive: true })
}

//	Auto translator tool

async function updateTranslations() {
	const translator = new deepl.Translator(await (await fetch('https://deepl.bonjourr.workers.dev/')).text())
	const supportedLangs = (await translator.getSourceLanguages()).map((source) => source.code)
	const translations = []

	const enDict = JSON.parse(fs.readFileSync(`./_locales/en/translations.json`, 'utf8'))
	const langs = fs.readdirSync('./_locales/')

	for (const lang of langs) {
		if (lang === 'en') {
			continue
		}

		translations.push(translateFile(lang, enDict, translator, supportedLangs))
	}

	await Promise.all(translations)
}

async function translateFile(lang, enDict, translator, supportedLangs) {
	let sanitizedLang = lang

	if (lang === 'gr') sanitizedLang = 'el'
	if (lang === 'zh_CN') sanitizedLang = 'zh'
	if (lang === 'zh_HK') sanitizedLang = 'zh'
	if (lang === 'es_ES') sanitizedLang = 'es'
	if (lang === 'pt_BR') sanitizedLang = 'pt-BR'
	if (lang === 'pt_PT') sanitizedLang = 'pt-PT'

	const supported = supportedLangs.includes(sanitizedLang)
	const langDict = JSON.parse(fs.readFileSync(`./_locales/${lang}/translations.json`, 'utf8'))
	const newDict = {}
	let removed = 0
	let added = 0

	// Remove keys not found in "english" translation file
	for (const key of Object.keys(langDict)) {
		if (enDict[key]) {
			newDict[key] = langDict[key]
			continue
		}

		removed++
	}

	// Add keys & translate new stuff
	for (const key of Object.keys(enDict)) {
		const trn = newDict[key]

		if (!trn) {
			if (supported) {
				const result = await translator.translateText(key, null, sanitizedLang)
				newDict[key] = result.text
			} else {
				newDict[key] = key
			}

			added++
		}
	}

	// Order translations
	const keylist = new Set()
	const enKeys = [...Object.keys(enDict)]
	const sortOrder = (a, b) => enKeys.indexOf(a) - enKeys.indexOf(b)

	JSON.stringify(newDict, (key, value) => {
		return keylist.add(key), value
	})

	const stringified = JSON.stringify(newDict, Array.from(keylist).sort(sortOrder), 2)

	// Write to file
	fs.writeFileSync(`./_locales/${lang}/translations.json`, stringified)

	// Log
	console.log(`${lang.slice(0, 2)}: [removed: ${removed}, added: ${added}, translated: ${supported ? 'yes' : 'no'}]`)
}
