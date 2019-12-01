const {series, parallel, src, dest, watch, pipe} = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-babel-minify');
const htmlmin = require('gulp-htmlmin');
const csso = require('gulp-csso');
const autoprefixer = require('gulp-autoprefixer');

/*const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const sourcemaps = require('gulp-sourcemaps');
*/

const path = {
    scss: ["src/styles/scss/_global.scss", "src/styles/scss/_media.scss", "src/styles/scss/_mixins.scss", "src/styles/scss/style.scss"],
    css: ["src/styles/style.css", "src/styles/events.css"],
    js: ["src/scripts/lang.js", "src/scripts/script.js", "src/scripts/settings.js"]
}

function defaultTask(cb) {
  // place code for your default task here
  cb();
}

function scssTask(){
    return src(path.scss)
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(sourcemaps.write('.'))
        .pipe(concat('style.css'))
        .pipe(dest("src/styles")
    );
}

function cssTask(){
    return src(path.css)
        .pipe(autoprefixer())
        .pipe(csso())
        .pipe(concat('stylesheet.css'))
        .pipe(dest("release/src/styles")
    );
}

function htmlTask() {
    return src(["index.html", "settings.html"])
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(dest('release/'));
}

function jsTask() {
    return src(path.js)
        .pipe(concat('main.js'))
        .pipe(minify({
            mangle: {
                    keepClassName: true
                }
            }))
        .pipe(dest('release/src/scripts')
    );
}


function watchTask(){
    watch(
        path.css,
        parallel(scssTask)
    );
}

exports.default = series(
    parallel(cssTask, jsTask, htmlTask)/*,
    watchTask*/);