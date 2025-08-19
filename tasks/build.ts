import { ensureDirSync, existsSync } from '@std/fs'
import { buildSync } from 'esbuild'
import { extname } from '@std/path'

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

function watcher(platform: Platform) {
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

	ensureDirSync(`release/${platform}/src/assets/favicons`)
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
		buildSync({
			entryPoints: ['src/styles/style.css'],
			outfile: `release/${platform}/src/styles/style.css`,
			bundle: true,
			minify: env === 'prod',
			loader: {
				'.svg': 'dataurl',
				'.png': 'file',
			},
		})
	} catch (err) {
		if (env === 'prod') {
			throw (err as Error).message
		} else {
			console.warn((err as Error).message)
		}
	}
}

function scripts(platform: Platform, env: Env) {
	try {
		buildSync({
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
	} catch (err) {
		if (env === 'prod') {
			throw (err as Error).message
		} else {
			console.warn((err as Error).message)
		}
	}

	Deno.copyFileSync(
		'src/scripts/services/help-mode.js',
		`release/${platform}/src/scripts/help-mode.js`,
	)
	Deno.copyFileSync(
		'src/scripts/services/service-worker.js',
		`release/${platform}/src/scripts/service-worker.js`,
	)

	if (platform !== 'online') {
		Deno.copyFileSync(
			'src/scripts/services/webext-storage.js',
			`release/${platform}/src/scripts/webext-storage.js`,
		)
	}
}

function assets(platform: Platform) {
	const source = `src/assets`
	const target = `release/${platform}/src/assets`

	// Huge icons on web application

	if (platform === 'online') {
		Deno.copyFileSync(`${source}/favicons/apple-touch-icon.png`, `${target}/favicons/apple-touch-icon.png`)
		Deno.copyFileSync(`${source}/favicons/favicon-512x512.png`, `${target}/favicons/favicon-512x512.png`)
		copyDir(`${source}/screenshots`, `${target}/screenshots`)
	}

	// Obligatory monochrome icons on microsoft edge

	if (platform === 'edge') {
		Deno.copyFileSync(
			`${source}/favicons/favicon-128x128-monochrome.png`,
			`${target}/favicons/favicon-128x128-monochrome.png`,
		)
	}

	// All other assets

	Deno.copyFileSync(`${source}/favicons/favicon-128x128.png`, `${target}/favicons/favicon-128x128.png`)
	Deno.copyFileSync(`${source}/favicons/favicon.ico`, `${target}/favicons/favicon.ico`)
	copyDir(`${source}/interface`, `${target}/interface`)
	copyDir(`${source}/labels`, `${target}/labels`)
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
	const watcher = Deno.watchFs(path)
	let debounce = 0

	for await (const event of watcher) {
		if (event.paths.length === 0) {
			continue
		}

		if (debounce) {
			clearTimeout(debounce)
		}

		debounce = setTimeout(() => {
			console.time('Built in')
			callback(event.paths[0].replaceAll('\\', '/')) // windows back slashes :(
			console.timeEnd('Built in')
		}, 20)
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
