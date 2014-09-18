var gulp = require('gulp'),
	concat = require('gulp-concat'),
	source = require('vinyl-source-stream'),
	browserify = require('browserify'),
	connect = require('gulp-connect'),
	embedlr = require('gulp-embedlr'),
	notify = require("gulp-notify"),
	uglify = require('gulp-uglify'),
	paths = require('./paths.js'),
	jsValidate = require('gulp-jsvalidate');


gulp.task('browserify', function() {
	gulp.src("./src/*.js").pipe(jsValidate()).on('error', 
		notify.onError({
			message: "Error: <%= error.message %>",
			title: "Failed running browserify"
		})).on('finish', function(){
			browserify("./src/main.js")
			.bundle({standalone: "YASR", debug: true}).on('error', notify.onError({
		        message: "Error: <%= error.message %>",
		        title: "Failed running browserify"
		      })).on('prebundle', function(bundle) {
		    	  console.log("prebundle!");
		    	})
		    .pipe(source(paths.bundleName + '.js'))
		    .pipe(embedlr())
		    .pipe(gulp.dest(paths.bundleDir))
		    .pipe(connect.reload());
		});
});
gulp.task('minifyJs', function() {
	return gulp.src(paths.bundleDir + "/" + paths.bundleName + ".js")
	.pipe(concat(paths.bundleName + '.min.js'))
    .pipe(uglify())
	.pipe(gulp.dest(paths.bundleDir));
});