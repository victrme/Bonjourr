const { series, parallel, src, dest, watch } = require('gulp')
const concat = require('gulp-concat')
const minify = require('gulp-babel-minify')
const htmlmin = require('gulp-htmlmin')
const csso = require('gulp-csso')
const rename = require('gulp-rename')

const path = {
	scss: [
		'src/styles/scss/_global.scss',
		'src/styles/scss/_media.scss',
		'src/styles/scss/_mixins.scss',
		'src/styles/scss/style.scss',
	],
	css: ['src/styles/style.css', 'src/styles/events.css'],
	js: ['src/scripts/lang.js', 'src/scripts/script.js', 'src/scripts/settings.js'],
}

function scssTask() {
	return src(path.scss)
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(sourcemaps.write('.'))
		.pipe(concat('style.css'))
		.pipe(dest('src/styles'))
}

function cssTask() {
	return src(path.css).pipe(csso()).pipe(concat('style.css')).pipe(dest('release/src/styles'))
}

function htmlTask() {
	return src(['index.html', 'settings.html'])
		.pipe(
			htmlmin({
				collapseWhitespace: true,
				removeComments: true,
			})
		)
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

function manifestTask(which) {
	return src(`manifest-${which}.json`).pipe(rename('manifest.json')).pipe(dest('release/'))
}

function watchTask() {
	watch(
		path.css,
		parallel(scssTask, jsTask, htmlTask, () => manifestTask('chrome'))
	)
}

exports.chrome = series(parallel(cssTask, jsTask, htmlTask, () => manifestTask('chrome')))
exports.firefox = series(parallel(cssTask, jsTask, htmlTask, () => manifestTask('firefox')))
exports.online = series(parallel(cssTask, jsTask, htmlTask))

exports.watcher = watchTask
