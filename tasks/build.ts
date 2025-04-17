import { ensureDirSync, existsSync } from 'https://deno.land/std@0.224.0/fs/mod.ts'
import { extname } from 'https://deno.land/std@0.224.0/path/mod.ts'
import * as esbuild from 'esbuild'

const args = Deno.args
const platform = args[0]
const PLATFORMS = ['chrome', 'firefox', 'safari', 'edge', 'online']
const PLATFORM_ONLINE = platform === 'online'
const PLATFORM_EDGE = platform === 'edge'
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
			serviceworker: [
				'src/scripts/services/service-worker.js',
				`release/${platform}/src/scripts/service-worker.js`,
			],
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
	if (existsSync('./release')) {
		Deno.removeSync('./release/', { recursive: true })
	}

	for (const platform of PLATFORMS) {
		// run things
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
	watchTasks('_locales', (_filename) => {
		locales()
	})

	watchTasks('src', (filename) => {
		if (filename.includes('.html')) {
			html()
		}
		if (filename.includes('styles/')) {
			styles()
		}
		if (filename.includes('assets/')) {
			assets()
		}
		if (filename.includes('scripts/')) {
			scripts()
		}
		if (filename.includes('manifests/')) {
			manifests()
		}
	})
}

function addDirectories() {
	try {
		if (existsSync(`release/${platform}`)) {
			return
		}
	} catch (_) {
		console.error('First build')
	}

	ensureDirSync(`release/${platform}/src/assets`)
	ensureDirSync(`release/${platform}/src/scripts`)
	ensureDirSync(`release/${platform}/src/styles`)
}

// Tasks

function html() {
	let data = Deno.readTextFileSync(paths.shared.htmls.index[0])
	const settings = Deno.readTextFileSync(paths.shared.htmls.settings[0])

	const icon = '<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />'
	const manifest = '<link rel="manifest" href="manifest.webmanifest">'
	const storage = '<script src="src/scripts/webext-storage.js"></script>'

	if (PLATFORM_ONLINE) {
		data = data.replace('<!-- icon -->', icon)
	}
	if (PLATFORM_ONLINE) {
		data = data.replace('<!-- manifest -->', manifest)
	}
	if (PLATFORM_EXT) {
		data = data.replace('<!-- webext-storage -->', storage)
	}
	if (PLATFORM_EDGE) {
		data = data.replace('favicon.ico', 'monochrome.png')
	}

	data = data.replace('<!-- settings -->', settings)

	Deno.writeTextFileSync(paths.shared.htmls.index[1], data)
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
				'.png': 'file',
			},
		})
	} catch (_) {
		if (ENV_PROD) {
			throw new Error('?')
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
			throw new Error('?')
		}

		return
	}

	if (PLATFORM_ONLINE) {
		Deno.copyFileSync(...paths.online.serviceworker)
	}
	if (PLATFORM_EXT) {
		Deno.copyFileSync(...paths.extension.scripts.serviceworker)
	}
	if (PLATFORM_EXT) {
		Deno.copyFileSync(...paths.extension.scripts.storage)
	}
}

function assets() {
	copyDir(...paths.shared.assets.interface)
	copyDir(...paths.shared.assets.weather)
	copyDir(...paths.shared.assets.labels)
	Deno.copyFileSync(...paths.shared.assets.favicons.ico)
	Deno.copyFileSync(...paths.shared.assets.favicons[128])
	Deno.copyFileSync(...paths.shared.assets.favicons[512])

	if (PLATFORM_ONLINE) {
		copyDir(...paths.online.screenshots)
	}
	if (PLATFORM_ONLINE) {
		Deno.copyFileSync(...paths.online.icon)
	}
	if (PLATFORM_EDGE) {
		Deno.copyFileSync(...paths.edge.favicon)
	}
	if (!PLATFORM_EDGE) {
		Deno.copyFileSync(...paths.shared.assets.favicons.ico)
	}
}

function manifests() {
	if (PLATFORM_ONLINE) {
		Deno.copyFileSync(...paths.online.manifest)
	}
	if (PLATFORM_EXT) {
		Deno.copyFileSync(...paths.extension.manifest)
	}
}

function locales() {
	const langs = Array.from(Deno.readDirSync('_locales'))
		.filter((entry) => entry.isDirectory && entry.name !== '.DS_Store')
		.map((entry) => entry.name)

	const [input, output] = paths.shared.locales

	for (const lang of langs) {
		ensureDirSync(output + lang)
		Deno.copyFileSync(`${input}${lang}/translations.json`, `${output}${lang}/translations.json`)

		if (PLATFORM_EXT) {
			Deno.copyFileSync(`${input}${lang}/messages.json`, `${output}${lang}/messages.json`)
		}
	}
}

// Deno stuff

async function watchTasks(path: string, callback: (filename: string) => void) {
	// debounce because IDEs do multiple fast saves which triggers watcher
	const watcher = Deno.watchFs(path)
	let debounce: number | null = null

	for await (const event of watcher) {
		if (event.paths.length === 0) continue

		if (debounce) {
			clearTimeout(debounce)
		}

		debounce = setTimeout(() => {
			console.time('Built in')
			callback(event.paths[0].replaceAll('\\', '/')) // windows back slashes :(
			console.timeEnd('Built in')
		}, 30)
	}
}

function liveServer() {
	const contentTypeList: Record<string, string> = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'text/javascript',
		'.ico': 'image/x-icon',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
	}

	console.info(`Live server: http://127.0.0.1:8000`)

	Deno.serve(async (req) => {
		const url = new URL(req.url)
		const path = `./release/online${url.pathname === '/' ? '/index.html' : url.pathname}`

		try {
			// Check if file exists
			const fileInfo = await Deno.stat(path)

			if (!fileInfo.isFile) {
				return new Response('Not Found', { status: 404 })
			}

			const data = await Deno.readFile(path)
			const contentType = contentTypeList[extname(path)] || 'application/octet-stream'

			return new Response(data, {
				status: 200,
				headers: {
					'Content-Type': contentType,
					'cache-control': 'no-cache',
				},
			})
		} catch (err) {
			if (err instanceof Deno.errors.NotFound) {
				return new Response('Not Found', { status: 404 })
			}

			return new Response('Internal Server Error', { status: 500 })
		}
	})
}

function copyDir(source: string, destination: string) {
	ensureDirSync(destination)

	for (const dirEntry of Deno.readDirSync(source)) {
		const srcPath = `${source}/${dirEntry.name}`
		const destPath = `${destination}/${dirEntry.name}`

		if (dirEntry.isDirectory) {
			copyDir(srcPath, destPath)
		} else {
			Deno.copyFileSync(srcPath, destPath)
		}
	}
}
