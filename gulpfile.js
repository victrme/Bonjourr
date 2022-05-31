const { series, parallel, src, dest, watch, task } = require('gulp'),
	concat = require('gulp-concat'),
	minify = require('gulp-babel-minify'),
	htmlmin = require('gulp-htmlmin'),
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
		const findScriptTags = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
		const stream = src('*.html').pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: false,
			})
		)

		if (platform === 'online') {
			stream.pipe(replace(`<!-- manifest -->`, `<link rel="manifest" href="manifest.webmanifest">`))
		}

		return stream
			.pipe(
				replace(findScriptTags, (match) => (match.includes('script.js') ? match.replace('script.js', 'main.js') : ''))
			)
			.pipe(dest(`release/${platform}`))
	}
}

function scripts(platform, dev) {
	//
	// All scripts except background
	// Online: replaces chrome.storage with homemade storage
	// Chrome & Firefox build: just minify
	//

	return () => {
		const stream = src([
			'src/scripts/lang.js',
			'src/scripts/utils.js',
			'src/scripts/script.js',
			'src/scripts/settings.js',
		]).pipe(concat('main.js'))

		if (platform === 'online') {
			stream
				.pipe(replace('chrome.storage.', 'lsOnlineStorage.'))
				.pipe(replace('sync.clear(', 'clear('))
				.pipe(replace('sync.get(', 'get(false, '))
				.pipe(replace('local.get(', 'get(true, '))
				.pipe(replace('sync.set(', 'set('))
				.pipe(replace('local.set(', 'setLocal('))
				.pipe(replace('sync.remove(', 'remove(false, '))
				.pipe(replace('local.remove(', 'remove(true, '))
		}

		if (!dev) {
			stream.pipe(minify({ mangle: { keepClassName: true } }))
		}

		stream.pipe(dest(`release/${platform}/src/scripts`))
		return stream
	}
}

function ressources(platform) {
	return () => {
		const assetPath = ['src/assets/**', '!src/assets/bonjourr.png']
		if (platform !== 'online') assetPath.push('!src/assets/screenshots/**')

		return src(assetPath).pipe(dest(`release/${platform}/src/assets`))
	}
}

function worker(platform) {
	return () => {
		const file = {
			origin: `src/scripts/${platform === 'online' ? 'service-worker.js' : 'background.js'}`,
			destination: platform ? `release/${platform}` : `release/${platform}/src/scripts/`,
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
		src('src/styles/scss/style.scss')
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
const filesToWatch = ['*.html', './src/scripts/*.js', './src/styles/style.css.map', './src/manifests/*.json']

// prettier-ignore
const taskOnline = (dev) => [
	html('online'),
	styles('online'),
	worker('online'),
	manifest('online'),
	scripts('online', dev),
	ressources('online', false),
]

const taskExtension = (dev, from) => [
	html(from),
	worker(from),
	styles(from),
	locales(from),
	manifest(from),
	ressources(from),
	scripts(from, dev),
	addBackground(from),
]

//
// All Exports
//

exports.online = async function () {
	watch(filesToWatch, series(parallel(...taskOnline(true))))
}

exports.chrome = async function () {
	watch(filesToWatch, series(parallel(...taskExtension(true, 'chrome'))))
}

exports.firefox = async function () {
	watch(filesToWatch, series(parallel(...taskExtension(true, 'firefox'))))
}

exports.build = parallel(...taskOnline(false), ...taskExtension(true, 'firefox'), ...taskExtension(true, 'chrome'))
