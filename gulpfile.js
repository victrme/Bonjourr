const { series, parallel, src, dest, watch } = require('gulp'),
	concat = require('gulp-concat'),
	minify = require('gulp-babel-minify'),
	htmlmin = require('gulp-htmlmin'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace')

function html(isExtension) {
	//
	// Index & settings minified
	// Multiple scripts tags => only main.js
	//

	return () => {
		const findScriptTags = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
		const stream = src('*.html').pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true,
			})
		)

		if (isExtension) stream.pipe(replace(`<link rel="manifest" href="manifest.webmanifest">`, ``))

		return stream
			.pipe(
				replace(findScriptTags, (match) => (match.includes('script.js') ? match.replace('script.js', 'main.js') : ''))
			)
			.pipe(dest('release/'))
	}
}

function scripts(which) {
	//
	// All scripts except background
	// Online: replaces chrome.storage with homemade storage
	// Firefox debugging: only storage.local is allowed
	// Chrome & Firefox build: just minify
	//

	return () => {
		const stream = src([
			'src/scripts/lang.js',
			'src/scripts/utils.js',
			'src/scripts/script.js',
			'src/scripts/settings.js',
		]).pipe(concat('main.js'))

		switch (which) {
			case 'online': {
				stream
					.pipe(replace('chrome.storage.', 'lsOnlineStorage.'))
					.pipe(replace('sync.clear(', 'clear('))
					.pipe(replace('sync.get(', 'get(false, '))
					.pipe(replace('local.get(', 'get(true, '))
					.pipe(replace('sync.set(', 'set('))
					.pipe(replace('local.set(', 'setLocal('))
					.pipe(replace('sync.remove(', 'remove(false, '))
					.pipe(replace('local.remove(', 'remove(true, '))
					.pipe(minify({ mangle: { keepClassName: true } }))
				break
			}

			default:
				stream.pipe(minify({ mangle: { keepClassName: true } }))
				break
		}

		stream.pipe(dest('release/src/scripts'))
		return stream
	}
}

function ressources(isExtension) {
	return () => {
		const assetPath = ['src/assets/**', '!src/assets/bonjourr.png']
		if (isExtension) assetPath.push('!src/assets/screenshots/**')

		return src(assetPath).pipe(dest('release/src/assets'))
	}
}

function worker(online) {
	return () => {
		const file = {
			origin: `src/scripts/${online ? 'service-worker.js' : 'background.js'}`,
			destination: online ? 'release/' : 'release/src/scripts/',
		}
		return src(file.origin).pipe(dest(file.destination))
	}
}

function manifest(which) {
	return () => {
		if (which === 'online') {
			return src(`src/manifests/manifest.webmanifest`).pipe(dest('release/'))
		}

		return src(`src/manifests/${which === 'firefox' ? 'firefox' : 'chrome'}.json`)
			.pipe(rename('manifest.json'))
			.pipe(dest('release/'))
	}
}

function css() {
	return src('src/styles/style.css').pipe(csso()).pipe(dest('release/src/styles/'))
}

function addBackground() {
	return src('src/scripts/background.js').pipe(dest('release/src/scripts'))
}

function locales() {
	return src('_locales/**').pipe(dest('release/_locales/'))
}

//
// Tasks
//

// Watches style map to make sure everything is compiled
const filesToWatch = ['*.html', './src/scripts/*.js', './src/styles/style.css.map', './src/manifests/*.json']

// prettier-ignore
const makeOnline = () => [
	css,
	html(false),
	worker('online'),
	scripts('online'),
	ressources(false),
	manifest('online'),
]

const makeExtension = (manifestFrom, scriptFrom) => [
	css,
	locales,
	addBackground,
	html(true),
	worker(false),
	ressources(true),
	scripts(scriptFrom),
	manifest(manifestFrom),
]

//
// All Exports
//

exports.online = async function () {
	watch(filesToWatch, series(parallel(...makeOnline())))
}

exports.chrome = async function () {
	watch(filesToWatch, series(parallel(...makeExtension('chrome'))))
}

exports.firefox = async function () {
	watch(filesToWatch, series(parallel(...makeExtension('firefox'))))
}
