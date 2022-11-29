const { series, parallel, src, dest, watch } = require('gulp'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	htmlmin = require('gulp-htmlmin'),
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

		return stream.pipe(htmlmin({ collapseWhitespace: true })).pipe(dest(`release/${platform}`))
	}
}

function scripts(platform) {
	return () => src('release/main.js').pipe(dest(`release/${platform}/src/scripts`))
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
		}

		return src(`src/scripts/services/background-${platform === 'chrome' ? 'chrome' : 'browser'}.js`)
			.pipe(rename('background.js'))
			.pipe(dest('release/' + platform + '/src/scripts'))
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

function locales(platform) {
	return () => src('_locales/**/messages.json').pipe(dest(`release/${platform}/_locales/`))
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

exports.safari = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('safari'))))
}

exports.build = parallel(...taskOnline(), ...taskExtension('firefox'), ...taskExtension('chrome'), ...taskExtension('safari'))
