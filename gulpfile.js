const gulp = require('gulp');
const fs = require('fs');
const del = require('del');
const sass = require('node-sass');
const $ = require("gulp-load-plugins")({ lazy: false });

gulp.task('default', async () => {
    await del('dist/**/*');
    buildPlatformJs();
    buildPlatformCss();
    $.watch('node_modules/@lunarade/module-*/src/client/components/**/*.js', { follow: true, followSymlinks: true }, buildModuleJs);
    $.watch('public/js/**/*.js', buildPlatformJs);
    $.watch('public/**/*.scss', buildPlatformCss);
});

function buildPlatformJs() {
    console.log('Building platform js...');
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
        .on('finish', async () => {
            await concatJsBundles();
            console.log('Done.');
        });
}

async function buildModuleJs() {
    console.log('Building module js...');
    await new Promise(r => gulp.src([
        'node_modules/@lunarade/module-*/src/client/components/**/*.js'
    ])
        .pipe($.concat('_a_bundle.js'))
        .pipe(gulp.dest('public'))
        .on('finish', r));
    await concatJsBundles();
    console.log('Done.');
}

async function concatJsBundles() {
    await new Promise(r => gulp.src([
        'public/_bundle.js',
        'public/_a_bundle.js'
    ])
        .pipe($.concat('bundle.js'))
        .pipe(gulp.dest('public'))
        .on('finish', r));
}

function buildPlatformCss() {
    console.log('Building css...');
    let result = sass.renderSync({
        file: 'public/css/index.scss'
    });

    fs.writeFileSync('public/_styles.css', result.css);

    console.log('Done...');
}