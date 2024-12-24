import fs, { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cp, copyFile, writeFile, watch } from 'node:fs/promises'
import { extname } from 'node:path'
import { exec } from 'node:child_process'
import { argv } from 'node:process'
import http from 'node:http'
import esbuild from 'esbuild'

const args = argv.slice(2)
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
		styles: ['src/styles/style.css', `release/${platform}/src/styles/style.css`],
		locales: ['_locales/', `release/${platform}/_locales/`],
		htmls: {
			index: ['src/index.html', `release/${platform}/index.html`],
			settings: ['src/settings.html', `release/${platform}/settings.html`],
		},
		assets: {
			interface: ['src/assets/interface', `release/${platform}/src/assets/interface`],
			weather: ['src/assets/weather', `release/${platform}/src/assets/weather`],
			labels: ['src/assets/labels', `release/${platform}/src/assets/labels`],
			move: ['src/assets/move', `release/${platform}/src/assets/move`],
			favicons: {
				ico: ['src/assets/favicon.ico', `release/${platform}/src/assets/favicon.ico`],
				128: ['src/assets/favicon-128x128.png', `release/${platform}/src/assets/favicon-128x128.png`],
				512: ['src/assets/favicon-512x512.png', `release/${platform}/src/assets/favicon-512x512.png`],
			},
		},
	},
	extension: {
		manifest: [`src/manifests/${platform}.json`, `release/${platform}/manifest.json`],
		scripts: {
			serviceworker: ['src/scripts/services/service-worker.js', `release/${platform}/src/scripts/service-worker.js`],
			storage: ['src/scripts/services/webext-storage.js', `release/${platform}/src/scripts/webext-storage.js`],
		},
	},
	online: {
		icon: ['src/assets/apple-touch-icon.png', 'release/online/src/assets/apple-touch-icon.png'],
		manifest: ['src/manifests/manifest.webmanifest', 'release/online/manifest.webmanifest'],
		screenshots: ['src/assets/screenshots', 'release/online/src/assets/screenshots'],
		serviceworker: ['src/scripts/services/service-worker.js', 'release/online/service-worker.js'],
	},
	edge: {
		favicon: ['src/assets/monochrome.png', 'release/edge/src/assets/monochrome.png'],
	},
}

// Main

console.clear()

if (args.includes('translate')) {
	updateTranslations()
}

if ((ENV_DEV || ENV_TEST) && PLATFORM_ONLINE) {
	liveServer()
}

if (ENV_DEV && PLATFORMS.includes(platform)) {
	builder()
	watcher()
}

if (ENV_PROD && PLATFORMS.includes(platform)) {
	builder()
}

if (ENV_PROD && platform === undefined) {
	if (fs.existsSync('./release')) {
		fs.rmSync('./release/', { recursive: true })
	}

	for (const platform of PLATFORMS) {
		exec(`node ./build.config.js ${platform} prod`, (error, stdout, _) => {
			error ? console.error(error) : console.log(`${stdout.replace('\n', '')} <- ${platform}`)
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

function watcher() {
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
		if (readdirSync('release')?.includes(platform)) {
			return
		}
	} catch (error) {
		console.error('First build')
	}

	mkdirSync(`release/${platform}/src/assets`, { recursive: true })
	mkdirSync(`release/${platform}/src/scripts`, { recursive: true })
	mkdirSync(`release/${platform}/src/styles`, { recursive: true })
}

// Tasks

function html() {
	let data = readFileSync(paths.shared.htmls.index[0], 'utf8')

	const icon = '<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />'
	const manifest = '<link rel="manifest" href="manifest.webmanifest">'
	const storage = '<script src="src/scripts/webext-storage.js"></script>'

	if (PLATFORM_ONLINE) data = data.replace('<!-- icon -->', icon)
	if (PLATFORM_ONLINE) data = data.replace('<!-- manifest -->', manifest)
	if (PLATFORM_EXT) data = data.replace('<!-- webext-storage -->', storage)
	if (PLATFORM_EDGE) data = data.replace('favicon.ico', 'monochrome.png')

	writeFile(paths.shared.htmls.index[1], data)
	copyFile(...paths.shared.htmls.settings)
}

function styles() {
	const [input, output] = paths.shared.styles

	try {
		esbuild.buildSync({
			entryPoints: [input],
			outfile: output,
			bundle: true,
			minify: ENV_PROD,
			loader: {
				'.svg': 'dataurl',
			},
		})
	} catch (_) {
		if (ENV_PROD) {
			throw ''
		}

		return
	}
}

function scripts() {
	const [input, output] = paths.shared.scripts

	try {
		esbuild.buildSync({
			entryPoints: [input],
			outfile: output,
			format: 'iife',
			bundle: true,
			sourcemap: ENV_DEV,
			minifySyntax: ENV_PROD,
			minifyWhitespace: ENV_PROD,
			define: {
				ENV: `"${env.toUpperCase()}"`,
			},
		})
	} catch (_) {
		if (ENV_PROD) {
			throw ''
		}

		return
	}

	if (PLATFORM_ONLINE) copyFile(...paths.online.serviceworker)
	if (PLATFORM_EXT) copyFile(...paths.extension.scripts.serviceworker)
	if (PLATFORM_EXT) copyFile(...paths.extension.scripts.storage)
}

function assets() {
	copyDir(...paths.shared.assets.interface)
	copyDir(...paths.shared.assets.weather)
	copyDir(...paths.shared.assets.move)
	copyDir(...paths.shared.assets.labels)
	copyFile(...paths.shared.assets.favicons.ico)
	copyFile(...paths.shared.assets.favicons[128])
	copyFile(...paths.shared.assets.favicons[512])

	if (PLATFORM_ONLINE) copyDir(...paths.online.screenshots)
	if (PLATFORM_ONLINE) copyFile(...paths.online.icon)
	if (PLATFORM_EDGE) copyFile(...paths.edge.favicon)
	if (!PLATFORM_EDGE) copyFile(...paths.shared.assets.favicons.ico)
}

function manifests() {
	if (PLATFORM_ONLINE) copyFile(...paths.online.manifest)
	if (PLATFORM_EXT) copyFile(...paths.extension.manifest)
}

function locales() {
	const langs = readdirSync('_locales').filter((dir) => dir !== '.DS_Store')
	const [input, output] = paths.shared.locales

	for (const lang of langs) {
		mkdirSync(output + lang, { recursive: true })
		copyFile(`${input}${lang}/translations.json`, `${output}${lang}/translations.json`)

		if (PLATFORM_EXT) {
			copyFile(`${input}${lang}/messages.json`, `${output}${lang}/messages.json`)
		}
	}
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

function liveServer() {
	const server = http.createServer()
	const PORT = 8080

	const contentTypeList = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'text/javascript',
		'.ico': 'image/x-icon',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
	}

	server.listen(PORT, () => {
		console.log(`Live server: http://127.0.0.1:${PORT}`)
	})

	server.on('request', (req, res) => {
		const path = `release/online/${req.url === '/' ? 'index.html' : req.url}`
		const filePath = new URL(path, import.meta.url)

		fs.access(filePath, fs.constants.F_OK, (err) => {
			if (err) {
				res.writeHead(404, { 'Content-Type': 'text/plain' })
				res.end('Not Found')
				return
			}

			fs.readFile(filePath, (err, data) => {
				if (err) {
					res.writeHead(500, { 'Content-Type': 'text/html' })
					res.end('<h1>500 Internal Server Error</h1>')
					return
				}

				const contentType = contentTypeList[extname(filePath.toString())]

				res.writeHead(200, {
					'Content-Type': contentType || 'application/octet-stream',
					'cache-control': 'no-cache',
				})

				res.end(data)
			})
		})
	})
}

function copyDir(...args) {
	// cosmetic abstraction, i'm sure its fine
	cp(...args, { recursive: true })
}

//	Auto translator tool

async function updateTranslations() {
	const langs = readdirSync('./_locales/')
	const englishDict = JSON.parse(readFileSync(`./_locales/en/translations.json`, 'utf8'))
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
		const path = `https://claude-translator.victr.workers.dev/`
		const json = await (await fetch(path, init)).json()
		const trns = JSON.parse(json.content[0].text)
		const map = new Map()

		for (const [en, trn] of trns) {
			map.set(en, trn)
		}

		return map
	}
}
