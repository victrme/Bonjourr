const { series, parallel, src, dest, watch } = require('gulp'),
	concat = require('gulp-concat'),
	minify = require('gulp-babel-minify'),
	htmlmin = require('gulp-htmlmin'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace')

function html() {
	//
	// Index & settings minified
	// Multiple scripts tags => only main.js
	//

	const findScriptTags = /<script[\s\S]*?>[\s\S]*?<\/script>/gi

	return src('*.html')
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true,
			})
		)
		.pipe(replace(findScriptTags, (match) => (match.includes('script.js') ? match.replace('script.js', 'main.js') : '')))
		.pipe(dest('release/'))
}

function scripts(which) {
	//
	// All scripts except background
	// Online: replaces chrome.storage with homemade storage
	// Firefox debugging: only storage.local is allowed
	// Chrome & Firefox build: just minify
	//

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
				.pipe(replace('sync.get(', 'get(false, '))
				.pipe(replace('local.get(', 'get(true, '))
				.pipe(replace('sync.set(', 'set('))
				.pipe(replace('local.set(', 'setLocal('))
				.pipe(replace('sync.remove(', 'remove(false, '))
				.pipe(replace('local.remove(', 'remove(true, '))
				.pipe(minify({ mangle: { keepClassName: true } }))
			break
		}

		case 'firefox-dev':
			stream.pipe(replace('.sync.', '.local.'))
			break

		default:
			stream.pipe(minify({ mangle: { keepClassName: true } }))
			break
	}

	stream.pipe(dest('release/src/scripts'))
	return stream
}

//
// These one-liners must be functions, not const
//

function css() {
	return src('src/styles/style.css').pipe(csso()).pipe(dest('release/src/styles/'))
}

function addBackground() {
	return src('src/scripts/background.js').pipe(dest('release/src/scripts'))
}

function ressources() {
	return src('src/assets/**').pipe(dest('release/src/assets'))
}

function locales() {
	return src('_locales/**').pipe(dest('release/_locales/'))
}

function worker(online) {
	const file = {
		origin: online ? 'service-worker.js' : 'src/scripts/background.js',
		destination: online ? 'release/' : 'release/src/scripts/',
	}
	return src(file.origin).pipe(dest(file.destination))
}

function manifest(which) {
	return src(`manifest-${which}.json`).pipe(rename('manifest.json')).pipe(dest('release/'))
}

//
// Tasks
//

// Watches style map to make sure everything is compiled
const filesToWatch = ['*.html', './src/scripts/*.js', './src/styles/style.css.map']

// prettier-ignore
const makeOnline = () => [
	css,
	html,
	ressources,
	() => worker('online'),
	() => scripts('online')
]

const makeExtension = (manifestFrom, scriptFrom) => [
	css,
	html,
	worker,
	locales,
	ressources,
	addBackground,
	() => scripts(scriptFrom),
	() => manifest(manifestFrom),
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

exports.firefoxdev = async function () {
	watch(filesToWatch, series(parallel(...makeExtension('firefox', 'firefox-dev'))))
}
