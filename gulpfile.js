const { series, parallel, src, dest } = require('gulp'),
	concat = require('gulp-concat'),
	minify = require('gulp-babel-minify'),
	htmlmin = require('gulp-htmlmin'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace')

const path = {
	css: 'src/styles/style.css',
	html: ['index.html', 'settings.html'],
	js: ['src/scripts/lang.js', 'src/scripts/utils.js', 'src/scripts/script.js', 'src/scripts/settings.js'],
}

function css() {
	return src(path.css).pipe(csso()).pipe(dest('release/src/styles/'))
}

function html() {
	const findScriptTags = /<script[\s\S]*?>[\s\S]*?<\/script>/gi

	return src(path.html)
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
	const stream = src(path.js).pipe(concat('main.js'))

	switch (which) {
		case 'online': {
			stream
				.pipe(replace('chrome.storage.', 'lsOnlineStorage.'))
				.pipe(replace('sync.get(', 'get(false, '))
				.pipe(replace('local.get(', 'get(true, '))
				.pipe(replace('sync.set(', 'set('))
				.pipe(replace('local.set(', 'setLocal('))
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

function ressources() {
	return src('src/assets/**').pipe(dest('release/src/assets'))
}

function manifest(which) {
	return src(`manifest-${which}.json`).pipe(rename('manifest.json')).pipe(dest('release/'))
}

function locales() {
	return src('_locales/**').pipe(dest('release/_locales/'))
}

function addBackground() {
	return src('src/scripts/background.js').pipe(dest('release/src/scripts'))
}

const makeExtension = (manif, js) => [html, css, locales, addBackground, ressources, () => scripts(js), () => manifest(manif)]
const makeOnline = () => [() => js('online'), css, ressources, html]

exports.online = series(parallel(...makeOnline()))
exports.chrome = series(parallel(...makeExtension('chrome')))
exports.firefox = series(parallel(...makeExtension('firefox')))
exports.firefoxdev = series(parallel(...makeExtension('firefox', 'firefox-dev')))
