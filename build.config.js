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

const paths = {
	shared: {
		scripts: ['src/scripts/index.ts', `release/${platform}/src/scripts/main.js`],
		styles: ['src/styles/style.scss', `release/${platform}/src/styles/style.css`],
		locales: ['./_locales', `release/${platform}/_locales`],
		htmls: {
			index: ['src/index.html', `release/${platform}/index.html`],
			settings: ['src/settings.html', `release/${platform}/settings.html`],
		},
		assets: {
			interface: ['src/assets/interface', `release/${platform}/src/assets/interface`],
			weather: ['src/assets/weather', `release/${platform}/src/assets/weather`],
			favicon: ['src/assets/favicon.ico', `release/${platform}/src/assets/favicon.ico`],
		},
	},
	extension: {
		manifest: [`src/manifests/${platform}.json`, `release/${platform}/manifest.json`],
		scripts: {
			background: ['src/scripts/services/background.js', `release/${platform}/src/scripts/background.js`],
			storage: ['src/scripts/services/webext-storage.js', `release/${platform}/src/scripts/webext-storage.js`],
		},
		favicons: {
			128: ['src/assets/favicon-128x128.png', `release/${platform}/src/assets/favicon-128x128.png`],
			512: ['src/assets/favicon-512x512.png', `release/${platform}/src/assets/favicon-512x512.png`],
		},
	},
	online: {
		icon: ['src/assets/apple-touch-icon.png', 'release/online/src/assets/apple-touch-icon.png'],
		manifest: ['src/manifests/manifest.webmanifest', 'release/online/manifest.webmanifest'],
		screenshots: ['src/assets/screenshots', 'release/online/src/assets/screenshots'],
		serviceworker: ['src/scripts/services/service-worker.js', 'release/online/src/scripts/service-worker.js'],
	},
	edge: {
		favicon: ['src/assets/monochrome.png', 'release/edge/src/assets/monochrome.png'],
	},
}

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

	watcher('_locales', (filename) => {
		locales()
	})

	watcher('src', (filename) => {
		if (filename.includes('.html')) html()
		else if (filename.includes('styles/')) styles()
		else if (filename.includes('assets/')) assets()
		else if (filename.includes('scripts/')) scripts()
		else if (filename.includes('manifests/')) manifests()
	})

	async function watcher(path, callback) {
		// debounce because IDEs do multiple fast saves which triggers watcher
		let debounce = 0

		for await (const event of watch(path, { recursive: true })) {
			clearInterval(debounce)

			debounce = setTimeout(() => {
				console.time('Built in')

				// windows back slashes :(
				const filename = event.filename.replaceAll('\\', '/')
				callback(filename)

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

	copyFile(...paths.shared.htmls.index)
	copyFile(...paths.shared.htmls.settings)

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
	const [input, output] = paths.shared.styles
	const { css } = sass.compile(input)
	writeFile(output, css)
}

function scripts() {
	const [input, output] = paths.shared.scripts

	esbuild.buildSync({
		entryPoints: [input],
		outfile: output,
		format: 'iife',
		bundle: true,
		minifySyntax: ENV_PROD,
		minifyWhitespace: ENV_PROD,
	})

	if (platform === 'online') copyFile(...paths.online.serviceworker)
	if (platform !== 'online') copyFile(...paths.extension.scripts.background)
	if (platform !== 'online') copyFile(...paths.extension.scripts.storage)
}

function assets() {
	copyDir(...paths.shared.assets.interface)
	copyDir(...paths.shared.assets.weather)
	copyFile(...paths.shared.assets.favicon)

	if (platform === 'online') copyDir(...paths.online.screenshots)
	if (platform !== 'online') copyFile(...paths.extension.favicons[128])
	if (platform !== 'online') copyFile(...paths.extension.favicons[512])

	// TODO favicons

	if (platform === 'edge') copyFile(...paths.edge.favicon)
	if (platform !== 'edge') copyFile(...paths.shared.assets.favicon)
}

function manifests() {
	if (platform === 'online') copyFile(...paths.online.manifest)
	if (platform !== 'online') copyFile(...paths.extension.manifest)
}

function locales() {
	// TODO no overview
	copyDir(...paths.shared.locales)
}

function copyDir(...args) {
	cp(...args, { recursive: true }) // cosmetic abstraction, i'm sure its fine
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
