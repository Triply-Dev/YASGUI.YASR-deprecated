
var gulp = require('gulp'),
	concat = require('gulp-concat'),
	source = require('vinyl-source-stream'),
	browserify = require('browserify'),
	notify = require("gulp-notify"),
	jsValidate = require('gulp-jsvalidate');



gulp.task('makeDocJs', function() {
	gulp.src("./doc/*.js").pipe(jsValidate()).on('error', 
			notify.onError({
				message: "Error: <%= error.message %>",
				title: "Failed running browserify"
			})).on('finish', function(){
				browserify("./doc/main.js")
				.bundle({debug: true}).on('error', notify.onError({
			        message: "Error: <%= error.message %>",
			        title: "Failed running browserify"
			      }))
			    .pipe(source('bundles.js'))
			    .pipe(gulp.dest('doc'));
			});
});
gulp.task('makeDocCss', function() {
	gulp.src(['node_modules/twitter-bootstrap-3.0.0/dist/css/bootstrap.css', './doc/main.css', 'node_modules/yasgui-yasqe/dist/yasqe.css'])
  	.pipe(concat('bundles.css'))
    .pipe(gulp.dest("doc"))
    ;
	
});
gulp.task('makedoc', ['makeDocJs', 'makeDocCss']);