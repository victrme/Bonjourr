const { series, parallel, src, dest, watch } = require('gulp'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	sass = require('gulp-sass')(require('sass'))

function html(platform) {
	//
	// Index & settings minified
	// Multiple scripts tags => only main.js
	//

	return () => {
		const stream = src('src/*.html')

		if (platform === 'online') {
			stream.pipe(replace(`<!-- manifest -->`, `<link rel="manifest" href="manifest.webmanifest">`))
		}

		return stream.pipe(dest(`release/${platform}`))
	}
}

function scripts(platform) {
	//
	// All scripts except background
	// Online: replaces chrome.storage with homemade storage
	// Chrome & Firefox build: just minify
	//

	return () => {
		const stream = src('release/main.js')

		if (platform === 'online') {
			stream.pipe(replace('chrome.storage.', 'online.storage.'))
		}

		stream.pipe(dest(`release/${platform}/src/scripts`))
		return stream
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
		const file = {
			origin: `src/scripts/${platform === 'online' ? 'service-worker.js' : 'background.js'}`,
			destination: platform === 'online' ? `release/${platform}` : `release/${platform}/src/scripts/`,
		}
		return src(file.origin).pipe(dest(file.destination))
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
			.pipe(csso())
			.pipe(dest(`release/${platform}/src/styles/`))
}

function addBackground(platform) {
	return () => src('src/scripts/background.js').pipe(dest(`release/${platform}/src/scripts`))
}

function locales(platform) {
	return () => src('_locales/**').pipe(dest(`release/${platform}/_locales/`))
}

//
// Tasks
//

// Watches style map to make sure everything is compiled
const filesToWatch = ['./src/*.html', './src/scripts/*.*', './src/styles/**', './src/manifests/*.json']

// prettier-ignore
const taskOnline = () => [
	html('online'),
	styles('online'),
	worker('online'),
	manifest('online'),
	scripts('online'),
	ressources('online', false),
]

const taskExtension = (from) => [
	html(from),
	worker(from),
	styles(from),
	locales(from),
	manifest(from),
	ressources(from),
	scripts(from),
	addBackground(from),
]

//
// All Exports
//

exports.online = async function () {
	watch(filesToWatch, series(parallel(...taskOnline())))
}

exports.chrome = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('chrome'))))
}

exports.firefox = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('firefox'))))
}

exports.build = parallel(...taskOnline(), ...taskExtension('firefox'), ...taskExtension('chrome'))
