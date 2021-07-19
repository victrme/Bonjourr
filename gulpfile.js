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

function cssTask() {
	return src(path.css).pipe(csso()).pipe(dest('release/src/styles/'))
}

function htmlTask() {
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

function jsTask(online) {
	const stream = src(path.js).pipe(concat('main.js'))

	if (online) {
		const storage = {
			chrome: ['chrome.storage.', 'lsOnlineStorage.'],
			syncGet: ['sync.get(', 'get(false, '],
			localGet: ['local.get(', 'get(true, '],
			syncSet: ['sync.set(', 'set('],
			localSet: ['local.set(', 'setLocal('],
		}

		stream
			.pipe(replace(storage.chrome[0], storage.chrome[1]))
			.pipe(replace(storage.syncGet[0], storage.syncGet[1]))
			.pipe(replace(storage.syncSet[0], storage.syncSet[1]))
			.pipe(replace(storage.localGet[0], storage.localGet[1]))
			.pipe(replace(storage.localSet[0], storage.localSet[1]))
	} else {
		stream.pipe(
			minify({
				mangle: {
					keepClassName: true,
				},
			})
		)
	}

	stream.pipe(dest('release/src/scripts'))

	return stream
}

function ressourcesTask() {
	return src('src/assets/**').pipe(dest('release/src/assets'))
}

function manifestTask(which) {
	return src(`manifest-${which}.json`).pipe(rename('manifest.json')).pipe(dest('release/'))
}

function localesTask() {
	return src('_locales/**').pipe(dest('release/_locales/'))
}

function addBackground() {
	return src('src/scripts/background.js').pipe(dest('release/src/scripts'))
}

const makeExtension = (which) => [
	htmlTask,
	cssTask,
	jsTask,
	localesTask,
	addBackground,
	ressourcesTask,
	() => manifestTask(which),
]
const makeOnline = () => [() => jsTask(true), cssTask, ressourcesTask, htmlTask]

exports.chrome = series(parallel(...makeExtension('chrome')))
exports.firefox = series(parallel(...makeExtension('firefox')))
exports.online = series(parallel(...makeOnline()))
