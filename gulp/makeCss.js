var gulp = require('gulp'),
	concat = require('gulp-concat'),
	minifyCSS = require('gulp-minify-css'),
	paths = require('./paths.js'),
	connect = require('gulp-connect');


gulp.task('concatCss', function() {
  gulp.src(paths.style)
  	.pipe(concat(paths.bundleName + '.css'))
    .pipe(gulp.dest(paths.bundleDir))
    ;
});
gulp.task('minifyCss', ['concatCss'], function() {
	gulp.src(paths.bundleDir + "/" + paths.bundleName + ".css")
	.pipe(concat(paths.bundleName + '.min.css'))
    .pipe(minifyCSS())
	.pipe(gulp.dest(paths.bundleDir))
	 .pipe(connect.reload());
	
});