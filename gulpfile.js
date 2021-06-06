const { series, parallel, src, dest } = require('gulp'),
	concat = require('gulp-concat'),
	minify = require('gulp-babel-minify'),
	htmlmin = require('gulp-htmlmin'),
	csso = require('gulp-csso'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace')

const path = {
	scss: [
		'src/styles/scss/_global.scss',
		'src/styles/scss/_media.scss',
		'src/styles/scss/_mixins.scss',
		'src/styles/scss/style.scss',
	],
	css: ['src/styles/style.css', 'src/styles/events.css'],
	js: ['src/scripts/lang.js', 'src/scripts/collections.js', 'src/scripts/script.js', 'src/scripts/settings.js'],
}

const scripts = {
	before: `<script src="src/scripts/lang.js"></script><script src="src/scripts/collections.js"></script><script src="src/scripts/script.js"></script><script src="src/scripts/settings.js" defer="defer"></script>`,
	after: `<script src="src/scripts/main.js"></script>`,
}

function scssTask() {
	return src(path.scss)
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(sourcemaps.write('.'))
		.pipe(concat('style.css'))
		.pipe(dest('release/src/styles/'))
}

function cssTask() {
	return src(path.css).pipe(csso()).pipe(concat('style.css')).pipe(dest('release/src/styles/'))
}

function htmlTask() {
	return src(['index.html', 'settings.html'])
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true,
			})
		)
		.pipe(replace(scripts.before, scripts.after))
		.pipe(dest('release/'))
}

function jsTask() {
	return src(path.js)
		.pipe(concat('main.js'))
		.pipe(
			minify({
				mangle: {
					keepClassName: true,
				},
			})
		)
		.pipe(dest('release/src/scripts'))
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
const makeOnline = () => [cssTask, jsTask, ressourcesTask, htmlTask]

exports.chrome = series(parallel(...makeExtension('chrome')))
exports.firefox = series(parallel(...makeExtension('firefox')))
exports.online = series(parallel(...makeOnline()))
