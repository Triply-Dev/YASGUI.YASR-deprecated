var gulp = require('gulp'),
	browserify = require('browserify'),
	connect = require('gulp-connect'),
	concat = require('gulp-concat'),
	embedlr = require('gulp-embedlr'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	uglify = require("gulp-uglify"),
	rename = require("gulp-rename"),
	streamify = require('gulp-streamify'),
	shim = require('browserify-shim'),
	paths = require("./paths.js");


gulp.task('browserify', function() {
	var baseBundle = browserify({entries: ["./src/main.js"],standalone: "YASR", debug: true, global:true})
		.transform({global:true},shim)
		.exclude('jquery')
		.exclude('codemirror')
		.exclude('./../lib/DataTables/media/js/jquery.dataTables.js') 
		.bundle()
		.pipe(source(paths.bundleName + '.js'))
		.pipe(streamify(jsValidate()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(rename(paths.bundleName + '.min.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(connect.reload());
});



gulp.task('browserifyWithDeps', function() {
	browserify({entries: ["./src/main.js"],standalone: "YASR", debug: true})
		.bundle()
		.pipe(source(paths.bundleName + '.bundled.js'))
		.pipe(embedlr())
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(rename(paths.bundleName + '.bundled.min.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(connect.reload());
});
