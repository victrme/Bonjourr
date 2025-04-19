import { ensureDirSync, existsSync } from 'https://deno.land/std@0.224.0/fs/mod.ts'
import { extname } from 'https://deno.land/std@0.224.0/path/mod.ts'
import * as esbuild from 'esbuild'

type Platform = 'chrome' | 'firefox' | 'safari' | 'edge' | 'online'
type Env = 'dev' | 'prod' | 'test'

const PLATFORMS = ['chrome', 'firefox', 'safari', 'edge', 'online']
const ENVS = ['dev', 'prod', 'test']

const args = Deno.args
const platform = args[0]
const env = args[1] ?? 'prod'

const isPlatform = (s: string): s is Platform => PLATFORMS.includes(s)
const _isEnv = (s: string): s is Env => ENVS.includes(s)

// Main

console.clear()

if ((env === 'dev') && platform === 'online') {
	liveServer()
}

if (env === 'dev' && isPlatform(platform)) {
	builder(platform, env)
	watcher(platform)
}

if (env === 'prod' && isPlatform(platform)) {
	builder(platform, env)
}

if (env === 'prod' && platform === undefined) {
	if (existsSync('./release')) {
		Deno.removeSync('./release/', { recursive: true })
	}

	for (const platform of PLATFORMS as Platform[]) {
		builder(platform, env)
	}
}

// Build or Watch

function builder(platform: Platform, env: Env) {
	console.time('Built in')
	addDirectories(platform)
	html(platform)
	assets(platform)
	locales(platform)
	manifests(platform)
	styles(platform, env)
	scripts(platform, env)
	console.timeEnd('Built in')
}

async function watcher(platform: Platform) {
	watchTasks('_locales', (_filename) => {
		locales(platform)
	})

	watchTasks('src', (filename) => {
		if (filename.includes('.html')) {
			html(platform)
		}
		if (filename.includes('assets/')) {
			assets(platform)
		}
		if (filename.includes('manifests/')) {
			manifests(platform)
		}
		if (filename.includes('styles/')) {
			styles(platform, 'dev')
		}
		if (filename.includes('scripts/')) {
			scripts(platform, 'dev')
		}
	})
}

function addDirectories(platform: Platform) {
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

function html(platform: Platform) {
	const indexdata = Deno.readTextFileSync('src/index.html')
	const settingsdata = Deno.readTextFileSync('src/settings.html')

	const icon = '<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />'
	const manifest = '<link rel="manifest" href="manifest.webmanifest">'
	const storage = '<script src="src/scripts/webext-storage.js"></script>'

	let html = indexdata

	if (platform === 'online') {
		html = html.replace('<!-- icon -->', icon)
	}
	if (platform === 'online') {
		html = html.replace('<!-- manifest -->', manifest)
	}
	if (platform !== 'online') {
		html = html.replace('<!-- webext-storage -->', storage)
	}
	if (platform === 'edge') {
		html = html.replace('favicon.ico', 'monochrome.png')
	}

	html = html.replace('<!-- settings -->', settingsdata)

	Deno.writeTextFileSync(`release/${platform}/index.html`, html)
}

function styles(platform: Platform, env: Env) {
	try {
		esbuild.buildSync({
			entryPoints: ['src/styles/style.css'],
			outfile: `release/${platform}/src/styles/style.css`,
			bundle: true,
			minify: env === 'prod',
			loader: {
				'.svg': 'dataurl',
				'.png': 'file',
			},
		})
	} catch (_) {
		if (env === 'prod') {
			throw new Error('?')
		}

		return
	}
}

function scripts(platform: Platform, env: Env) {
	try {
		esbuild.buildSync({
			entryPoints: ['src/scripts/index.ts'],
			outfile: `release/${platform}/src/scripts/main.js`,
			format: 'iife',
			bundle: true,
			sourcemap: env === 'dev',
			minifySyntax: env === 'prod',
			minifyWhitespace: env === 'prod',
			define: {
				ENV: `"${env.toUpperCase()}"`,
			},
		})
	} catch (_) {
		if (env === 'prod') {
			throw new Error('?')
		}

		return
	}

	if (platform === 'online') {
		Deno.copyFileSync(
			'src/scripts/services/service-worker.js',
			`release/${platform}/src/scripts/service-worker.js`,
		)
	} else {
		Deno.copyFileSync(
			'src/scripts/services/service-worker.js',
			`release/${platform}/src/scripts/service-worker.js`,
		)
		Deno.copyFileSync(
			'src/scripts/services/webext-storage.js',
			`release/${platform}/src/scripts/webext-storage.js`,
		)
	}
}

function assets(platform: Platform) {
	// TODO CEST MOCHE

	copyDir(
		'src/assets/interface',
		`release/${platform}/src/assets/interface`,
	)
	copyDir(
		'src/assets/weather',
		`release/${platform}/src/assets/weather`,
	)
	copyDir(
		'src/assets/labels',
		`release/${platform}/src/assets/labels`,
	)
	Deno.copyFileSync(
		'src/assets/favicon.ico',
		`release/${platform}/src/assets/favicon.ico`,
	)
	Deno.copyFileSync(
		'src/assets/favicon-128x128.png',
		`release/${platform}/src/assets/favicon-128x128.png`,
	)
	Deno.copyFileSync(
		'src/assets/favicon-512x512.png',
		`release/${platform}/src/assets/favicon-512x512.png`,
	)

	if (platform === 'online') {
		copyDir(
			'src/assets/screenshots',
			'release/online/src/assets/screenshots',
		)
		Deno.copyFileSync(
			'src/assets/apple-touch-icon.png',
			'release/online/src/assets/apple-touch-icon.png',
		)
	} else {
		Deno.copyFileSync(
			'src/assets/monochrome.png',
			`release/${platform}/src/assets/monochrome.png`,
		)
		Deno.copyFileSync(
			'src/assets/favicon.ico',
			`release/${platform}/src/assets/favicon.ico`,
		)
	}
}

function manifests(platform: Platform) {
	if (platform === 'online') {
		Deno.copyFileSync(
			'src/manifests/manifest.webmanifest',
			'release/online/manifest.webmanifest',
		)
	} else {
		Deno.copyFileSync(
			`src/manifests/${platform}.json`,
			`release/${platform}/manifest.json`,
		)
	}
}

function locales(platform: Platform) {
	const langs = Array.from(Deno.readDirSync('_locales'))
		.filter((entry) => entry.isDirectory && entry.name !== '.DS_Store')
		.map((entry) => entry.name)

	for (const lang of langs) {
		const output = `release/${platform}/_locales/${lang}`

		ensureDirSync(output)

		Deno.copyFileSync(
			`_locales/${lang}/translations.json`,
			`${output}/translations.json`,
		)

		if (platform !== 'online') {
			Deno.copyFileSync(
				`_locales/${lang}/messages.json`,
				`${output}/messages.json`,
			)
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
