

var gulp = require('gulp'),
	watchify = require('watchify'),
	connect = require('gulp-connect'),
	paths = require('./paths.js'),
	livereload = require('gulp-livereload');



gulp.task('connect', function() {
	connect.server({
		port : 4000,
		livereload: true
	});
});
gulp.task('watch', function() {
	gulp.watch(["./src/**/*.js", './lib/*.js'], [ 'browserify' ]);
	gulp.watch(paths.style, [ 'minifyCss' ]);
	  gulp.watch(
		'./*.html'
	, function(files) {
		gulp.src(files.path).pipe(connect.reload());
	});
});
