import gulp from 'gulp'
import rename from 'gulp-rename'
import replace from 'gulp-replace'
import gulpsass from 'gulp-sass'
import esbuild from 'esbuild'
import * as sasscompiler from 'sass'

const { parallel, src, dest, watch } = gulp
const sass = gulpsass(sasscompiler)

function html(platform) {
	return () => {
		const assets = ['src/*.html']
		const stream = src(assets)

		if (platform === 'edge') {
			stream.pipe(replace(`favicon.ico`, `monochrome.png`))
		}

		if (platform === 'online') {
			stream.pipe(replace(`<!-- icon -->`, `<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />`))
			stream.pipe(replace(`<!-- manifest -->`, `<link rel="manifest" href="manifest.webmanifest">`))
		} else {
			stream.pipe(replace(`<!-- webext-storage -->`, `<script src="src/scripts/webext-storage.js"></script>`))
		}

		return stream.pipe(dest(`release/${platform}`))
	}
}

function scripts(platform, env) {
	return () => {
		esbuild.buildSync({
			entryPoints: ['src/scripts/index.ts'],
			outfile: 'release/online/src/scripts/main.js',
			format: 'iife',
			bundle: true,
			minifySyntax: env === 'PROD',
			minifyWhitespace: env === 'PROD',
		})

		console.log('[13:37:00] Created build for', env, 'environnement')

		return src('release/online/src/scripts/main.js')
			.pipe(replace('ENVIRONNEMENT = "PROD"', `ENVIRONNEMENT = "${env}"`))
			.pipe(dest(`release/${platform}/src/scripts`))
	}
}

function ressources(platform) {
	return () => {
		const assetPath = ['src/assets/**', '!src/assets/bonjourr.png']

		if (platform !== 'online') {
			assetPath.push('!src/assets/screenshots/**')
		}

		return src(assetPath).pipe(dest(`release/${platform}/src/assets`))
	}
}

function worker(platform) {
	return () => {
		if (platform === 'online') {
			return src('src/scripts/services/service-worker.js').pipe(dest('release/online'))
		} else {
			const services = ['src/scripts/services/background.js', 'src/scripts/services/webext-storage.js']
			return src(services).pipe(dest('release/' + platform + '/src/scripts'))
		}
	}
}

function manifest(platform) {
	return () => {
		return platform === 'online'
			? src(`src/manifests/manifest.webmanifest`).pipe(dest(`release/${platform}`))
			: src(`src/manifests/${platform}.json`)
					.pipe(rename('manifest.json'))
					.pipe(dest(`release/${platform}`))
	}
}

function styles(platform) {
	return () =>
		src('src/styles/style.scss')
			.pipe(sass.sync().on('error', sass.logError))
			.pipe(dest(`release/${platform}/src/styles/`))
}

function locales(platform) {
	const filenames = platform === 'online' ? 'translations' : '*'
	return () => src(`_locales/**/${filenames}.json`).pipe(dest(`release/${platform}/_locales/`))
}

//
// Tasks
//

// Watches style map to make sure everything is compiled
const filesToWatch = ['./_locales/**', './src/*.html', './src/scripts/**', './src/styles/**', './src/manifests/*.json']

// prettier-ignore
const taskOnline = (env) => [
	html('online'),
	styles('online'),
	worker('online'),
	locales('online'),
	manifest('online'),
	scripts('online', env),
	ressources('online', false),
]

const taskExtension = (from, env) => [
	html(from),
	worker(from),
	styles(from),
	locales(from),
	manifest(from),
	ressources(from),
	scripts(from, env),
]

//
// All Exports
//

export const online = async function () {
	watch(filesToWatch, parallel(...taskOnline('DEV')))
}

export const chrome = async function () {
	watch(filesToWatch, parallel(...taskExtension('chrome', 'DEV')))
}

export const edge = async function () {
	watch(filesToWatch, parallel(...taskExtension('edge', 'DEV')))
}

export const firefox = async function () {
	watch(filesToWatch, parallel(...taskExtension('firefox', 'DEV')))
}

export const safari = async function () {
	watch(filesToWatch, parallel(...taskExtension('safari', 'DEV')))
}

export const test = async function () {
	watch(filesToWatch, parallel(...taskOnline('TEST')))
}

export const buildtest = parallel(...taskOnline('TEST'))

export const build = parallel(
	...taskOnline('PROD'),
	...taskExtension('firefox', 'PROD'),
	...taskExtension('chrome', 'PROD'),
	...taskExtension('edge', 'PROD'),
	...taskExtension('safari', 'PROD')
)

//
//	Auto translator tool
//

import * as deepl from 'deepl-node'
import fs from 'node:fs'

export const translate = async function () {
	updateTranslations()
}

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
