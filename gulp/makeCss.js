var gulp = require("gulp"),
  concat = require("gulp-concat"),
  paths = require("./paths.js"),
  connect = require("gulp-connect"),
  deleteLines = require('gulp-delete-lines'),
  sourcemaps = require("gulp-sourcemaps");
sass = require("gulp-sass"), autoprefixer = require("gulp-autoprefixer"), cssImport = require(
  "gulp-cssimport"
), rename = require("gulp-rename"), notify = require("gulp-notify"), minifyCSS = require("gulp-clean-css");

gulp.task("makeCss", ["copyCssDeps", "copyCssImages"], function() {
  return gulp
    .src(paths.style)
    .pipe(cssImport()) //needed, because css files are not -actually- imported by sass, but remain as css statement...
    .pipe(sass())
    .on(
      "error",
      notify.onError(function(error) {
        return error.message;
      })
    )
    .pipe(
      autoprefixer({
        browsers: ["> 5%"]
      })
    )
    .pipe(concat(paths.bundleFileName + ".css"))
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(
      minifyCSS({
        //the minifyer does not work well with lines including a comment. e.g.
        ///* some comment */ }
        //is completely removed (including the final bracket)
        //So, disable the 'advantaced' feature. This only makes the minified file 100 bytes larger
        noAdvanced: true
      })
    )
    .pipe(rename(paths.bundleFileName + ".min.css"))
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(connect.reload());
});
var cssDeps = [
  "./node_modules/datatables.net-dt/css/jquery.dataTables.css",
  "./node_modules/pivottable/dist/pivot.css",
  "./node_modules/codemirror/lib/codemirror.css",
  "./node_modules/codemirror/addon/fold/foldgutter.css",
  "./node_modules/leaflet/dist/leaflet.css"
];
gulp.task("copyCssDeps", function() {
  return gulp
    .src(cssDeps)
    .pipe(deleteLines({
      'filters': [
        /url\("\./i
      ]
    }))
    .pipe(
      rename({
        prefix: "_",
        extname: ".scss"
      })
    )
    .pipe(gulp.dest("./src/scss/cssIncludes"));
});
gulp.task('copyCssImages', function() {
   gulp.src('./node_modules/leaflet/dist/images/*.png')
   .pipe(gulp.dest(paths.bundleDir+'/images'));
});
