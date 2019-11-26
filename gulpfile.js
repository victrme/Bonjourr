const {series, parallel, src, dest, watch, pipe} = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-babel-minify');

const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const path = {
    scss: ["src/styles/scss/_global.scss", "src/styles/scss/_media.scss", "src/styles/scss/_mixins.scss", "src/styles/scss/style.scss"],
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
        /*.pipe(postcss([autoprefixer(), cssnano()]))*/
        .pipe(sourcemaps.write('.'))
        .pipe(concat('style.css'))
        .pipe(dest("src/styles")
    );
}

function jsTask(){
    return src(path.js)
        .pipe(concat('main.js'))
        .pipe(minify({
            mangle: {
                    keepClassName: true
                }
            }))
        .pipe(dest('src/scripts')
    );
}


function watchTask(){
    watch(
        path.scss,
        parallel(scssTask)
    );
}

exports.default = series(
    parallel(scssTask, jsTask),
    watchTask);