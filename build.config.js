import { cp, copyFile, writeFile, watch } from 'node:fs/promises'
import { exec } from 'node:child_process'
import process from 'node:process'
import fs from 'node:fs'

import esbuild from 'esbuild'
import * as sass from 'sass'
import * as deepl from 'deepl-node'

const args = process.argv.slice(2)
const platform = args[0]
const PLATFORMS = ['chrome', 'firefox', 'safari', 'edge', 'online']
const PLATFORM_FIREFOX = platform === 'firefox'
const PLATFORM_CHROME = platform === 'chrome'
const PLATFORM_SAFARI = platform === 'safari'
const PLATFORM_EDGE = platform === 'edge'
const PLATFORM_ONLINE = platform === 'online'
const PLATFORM_EXT = !PLATFORM_ONLINE
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

// Main

if (args.includes('translate')) {
	updateTranslations()
}

if (ENV_DEV && PLATFORMS.includes(platform)) {
	builder()
	watcher()
}

if (ENV_PROD && PLATFORMS.includes(platform)) {
	builder()
}

if (ENV_PROD && platform === undefined) {
	for (const platform of PLATFORMS) {
		exec(`node ./build.config.js ${platform} prod`).once('close', () => {
			console.log('Built', platform)
		})
	}
}

// Build or Watch

function builder() {
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

async function watcher() {
	watchTasks('_locales', (filename) => {
		locales()
	})

	watchTasks('src', (filename) => {
		if (filename.includes('.html')) html()
		if (filename.includes('styles/')) styles()
		if (filename.includes('assets/')) assets()
		if (filename.includes('scripts/')) scripts()
		if (filename.includes('manifests/')) manifests()
	})
}

function addDirectories() {
	try {
		if (fs.readdirSync('release')?.includes(platform)) {
			return
		}
	} catch (error) {
		console.error('First build')
	}

	fs.mkdirSync(`release/${platform}/src/assets`, { recursive: true })
	fs.mkdirSync(`release/${platform}/src/scripts`, { recursive: true })
	fs.mkdirSync(`release/${platform}/src/styles`, { recursive: true })
}

// Tasks

function html() {
	// TODO change html head

	copyFile(...paths.shared.htmls.index)
	copyFile(...paths.shared.htmls.settings)

	// 		if (platform === 'edge') {
	// 			stream.pipe(replace(`favicon.ico`, `monochrome.png`))
	// 		}

	// 		if (PLATFORM_ONLINE) {
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

	if (PLATFORM_ONLINE) copyFile(...paths.online.serviceworker)
	if (PLATFORM_EXT) copyFile(...paths.extension.scripts.background)
	if (PLATFORM_EXT) copyFile(...paths.extension.scripts.storage)
}

function assets() {
	copyDir(...paths.shared.assets.interface)
	copyDir(...paths.shared.assets.weather)
	copyFile(...paths.shared.assets.favicon)

	if (PLATFORM_ONLINE) copyDir(...paths.online.screenshots)
	if (PLATFORM_EXT) copyFile(...paths.extension.favicons[128])
	if (PLATFORM_EXT) copyFile(...paths.extension.favicons[512])

	// TODO favicons

	if (PLATFORM_EDGE) copyFile(...paths.edge.favicon)
	if (!PLATFORM_EDGE) copyFile(...paths.shared.assets.favicon)
}

function manifests() {
	if (PLATFORM_ONLINE) copyFile(...paths.online.manifest)
	if (PLATFORM_EXT) copyFile(...paths.extension.manifest)
}

function locales() {
	// TODO no overview
	copyDir(...paths.shared.locales)
}

// Node stuff

async function watchTasks(path, callback) {
	// debounce because IDEs do multiple fast saves which triggers watcher

	const events = watch(path, { recursive: true })
	let debounce = 0

	for await (const event of events) {
		clearInterval(debounce)
		debounce = setTimeout(() => debounceCallback(event.filename), 30)
	}

	function debounceCallback(filename) {
		console.time('Built in')
		callback(filename.replaceAll('\\', '/')) // windows back slashes :(
		console.timeEnd('Built in')
	}
}

function copyDir(...args) {
	// cosmetic abstraction, i'm sure its fine
	cp(...args, { recursive: true })
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
