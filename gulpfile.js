'use strict';

/**************/
/*  REQUIRES  */
/**************/
var gulp = require('gulp');

// File I/O
var exit = require('gulp-exit');
var eslint = require('gulp-eslint');
var runSequence = require('run-sequence');

// Testing
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');


/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  js: [
    'index.js'
  ],

  tests: [
    'test/index.spec.js'
  ]
};


/***********/
/*  TASKS  */
/***********/
// Lints the JavaScript files
gulp.task('lint', function() {
  var filesToLint = paths.js.concat(paths.tests).concat(['gulpfile.js']);
  return gulp.src(filesToLint)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Runs the Mocha test suite
gulp.task('test', function() {
  return gulp.src(paths.js)
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', function() {
      gulp.src(paths.tests)
        .pipe(mocha({
          reporter: 'spec',
          timeout: 5000
        }))
        .pipe(istanbul.writeReports())
        .pipe(exit());
    });
});

// Re-runs the linter every time a JavaScript file changes
gulp.task('watch', function() {
  gulp.watch(paths.js, ['lint']);
});

// Default task
// Default task
gulp.task('default', function(done) {
  runSequence('lint', 'test', function(error) {
    done(error && error.err);
  });
});
