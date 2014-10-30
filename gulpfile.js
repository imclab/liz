var path = require('path');
var gulp = require('gulp');
var concat = require('gulp-concat');
var react = require('gulp-react');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var minifyCSS = require('gulp-minify-css');
var gulpif = require('gulp-if');

var SRC_JS = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.min.js',
  //'node_modules/bootflat/bootflat/js/icheck.min.js',
  //'node_modules/bootflat/bootflat/js/jquery.fs.selecter.min.js', // this one is outdated
  //'node_modules/bootflat/bootflat/js/jquery.fs.stepper.min.js',
  'node_modules/moment/min/moment.min.js',
  'node_modules/promise-js/promise.js',
  'node_modules/juration/juration.js',

  'node_modules/react/dist/react.min.js',

  'client/assets/react-radiogroup/react-radiogroup.jsx',
  'node_modules/selectize/dist/js/standalone/selectize.min.js',
  'client/assets/selectize/Selectize.jsx',

  'shared/*',
  'client/util/*',

  // app
  'client/components/*.jsx',
  'client/pages/*.jsx',
  'client/app.jsx'
];

var SRC_CSS = [
  'node_modules/bootstrap/dist/css/bootstrap.min.css',
  'node_modules/bootflat/bootflat/css/bootflat.min.css',
  'node_modules/selectize/dist/css/selectize.bootstrap3.css',
  'client/app.css'
];

var DEST = './client/';

function isJSX (file) {
  return path.extname(file.path) == '.jsx';
}

function isNonMinified (file) {
  var ext = path.extname(file.path);
  var base = path.basename(file.path, ext); // remove extension
  return path.extname(base) !== '.min';
}

gulp.task('bundle-js', function () {
  // replace one line comments in order to remove references to source maps
  var replaceComments = replace(/^\/\/.*$/mg, '');

  return gulp.src(SRC_JS)
      .pipe(gulpif(isJSX, react()))
      .pipe(gulpif(isNonMinified, uglify(), replaceComments))
      .pipe(concat('app.min.js'))
      .pipe(gulp.dest(DEST));
});

gulp.task('bundle-css', function () {
  return gulp.src(SRC_CSS)
      .pipe(gulpif(isNonMinified, minifyCSS()))
      .pipe(concat('app.min.css'))
      .pipe(gulp.dest(DEST));
});

// The default task (called when you run `gulp`)
gulp.task('default', ['bundle-js', 'bundle-css']);

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', ['default'], function () {
  gulp.watch([
    'client/app.jsx',
    'client/app.css',
    'client/assets/**/*',
    'client/shared/**/*',
    'client/components/**/*',
    'client/pages/**/*',
    'client/util/**/*'
  ], ['default']);
});
