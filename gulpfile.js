const gulp = require('gulp');
const fs = require('fs');
const del = require('del');
const sass = require('node-sass');
const $ = require("gulp-load-plugins")({ lazy: false });

gulp.task('default', async () => {
    await del('dist/**/*');
    buildJs();
    buildCss();
    $.watch('public/js/**/*.js', buildJs);
    $.watch('public/**/*.scss', buildCss);
});

function buildJs() {
    console.log('Bunding js...');
    return gulp.src([
        'public/js/lib/jquery-3.2.1.min.js',
        'public/js/lib/Chart.bundle.min.js',
        'public/js/lib/angular.min.js',
        'public/js/lib/bootstrap.min.js',
        'public/js/lib/bootstrap-select.min.js',
        'public/js/lib/**/*.js',
        'public/js/index.js',
        'public/js/**/*.js'
    ])
        .pipe($.concat('_bundle.js'))
        .pipe(gulp.dest('public'))
        .on('finish', () => console.log('Done.'));
}

function buildCss() {
    console.log('Building css...');
    let result = sass.renderSync({
        file: 'public/css/index.scss'
    });

    fs.writeFileSync('public/_styles.css', result.css);

    console.log('Done...');
}