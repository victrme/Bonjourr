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
	js: ['src/scripts/lang.js', 'src/scripts/script.js', 'src/scripts/settings.js'],
}

function cssTask() {
	return src(path.css).pipe(csso()).pipe(dest('release/src/styles/'))
}

function htmlTask() {
	const scripts = {
		before: `<script src="src/scripts/lang.js"></script></script><script src="src/scripts/script.js"></script><script src="src/scripts/settings.js" defer="defer"></script>`,
		after: `<script src="src/scripts/main.js"></script>`,
	}

	return src(path.html)
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true,
			})
		)
		.pipe(replace(scripts.before, scripts.after))
		.pipe(dest('release/'))
}

function jsTask(online) {
	const stream = src(path.js).pipe(concat('main.js'))

	if (online) {
		const storage = {
			sync: ['chrome.storage.sync', 'lsOnlineStorage'],
			bgget: ['chrome.storage.local.get(null,', 'lsOnlineStorage.get("backgrounds",'],
			bgset: ['chrome.storage.local.set', 'lsOnlineStorage.bgset'],
		}

		stream
			.pipe(replace(storage.sync[0], storage.sync[1]))
			.pipe(replace(storage.bgget[0], storage.bgget[1]))
			.pipe(replace(storage.bgset[0], storage.bgset[1]))
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
