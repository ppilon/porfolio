'use strict';

require('dotenv').config()

const gulp = require('gulp');
const sass = require('gulp-sass');
const cleanCSS = require('gulp-clean-css');
const rename = require("gulp-rename");
const browserSync = require('browser-sync').create();
const browserify = require('gulp-browserify');
const fs          = require("fs")
const gulpSSH = require('gulp-ssh');
const awspublish  = require('gulp-awspublish')
const htmlreplace = require('gulp-html-replace')
const cdnAbsolutePath = require('gulp-cdn-absolute-path');
const htmlmin     = require('gulp-html-minifier')
const imagemin    = require('gulp-imagemin')
const concat      = require('gulp-concat')
const minify      = require('gulp-minify')
const cssUrls = require('gulp-css-urls');

const productionConfig = {
  host: 'philippilon.com',
  port: 22,
  username: 'ec2-user',
  privateKey: fs.readFileSync(process.env.PRODUCTION_KEY)
}

const productionSSH = new gulpSSH({
  ignoreErrors: false,
  sshConfig: productionConfig
})

const headers = {
  'Cache-Control': 'max-age=315360000, no-transform, public'
}

const publisher = awspublish.create({
  params: {
    Bucket: process.env.AWS_BUCKET_NAME
  },
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

gulp.task('minify:images', function() {
  return gulp.src('./app/images/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(imagemin({
      verbose: true
    }))
    .pipe(gulp.dest('./dist/images'))
})

gulp.task('publish:assets', function() {
  return gulp.src(['./dist/**/*', '!./dist/vendor/**/*', '!./dist/*.html', '!./dist/*.docx'])
    .pipe(publisher.publish(headers))
    .pipe(publisher.sync())
    .pipe(awspublish.reporter())
})

gulp.task('copy:favicon', function(){
  gulp.src(['./app/*.png', './app/*.xml', './app/*.ico', './app/*.webmanifest', './app/*.svg'])
  .pipe(gulp.dest('./dist'))
})

gulp.task('copy:fonts', function(){
  gulp.src(['./app/fonts/**/*'])
  .pipe(gulp.dest('./dist/fonts'))
})


gulp.task('deploy:production',
  ['minify:html',
  'css',
  'js',
  'minify:images',
  'copy:favicon',
  'copy:fonts'
  ], function() {
  gulp.src(['./**/*', '!./node_modules/**/*'])
  .pipe(productionSSH.dest('/srv/philippilon.com'))
  gulp.start('publish:assets')
})

// Copy third party libraries from /node_modules into /vendor
gulp.task('vendor', function() {

  // Font Awesome
  gulp.src([
      './node_modules/font-awesome/**/*',
      '!./node_modules/font-awesome/{less,less/*}',
      '!./node_modules/font-awesome/.*',
      '!./node_modules/font-awesome/*.{txt,json,md}'
    ])
    .pipe(gulp.dest('./vendor/font-awesome'))

  // jQuery
  gulp.src([
      './node_modules/jquery/dist/*',
      '!./node_modules/jquery/dist/core.js'
    ])
    .pipe(gulp.dest('./vendor/jquery'))

  // jQuery Easing
  gulp.src([
      './node_modules/jquery.easing/*.js'
    ])
    .pipe(gulp.dest('./vendor/jquery-easing'))

  // Magnific Popup
  gulp.src([
      './node_modules/magnific-popup/src/css/*.scss',
      './node_modules/magnific-popup/dist/*.js'
    ])
    .pipe(gulp.dest('./vendor/magnific-popup'))

});

gulp.task('css:compile', function() {
  return gulp.src('./app/scss/index.scss')
    .pipe(sass.sync({
      outputStyle: 'expanded'
    }).on('error', sass.logError))
    .pipe(concat('index.css'))
    .pipe(gulp.dest('./app/css'))
    .pipe(browserSync.stream({match: '**/*.css'}))
  })

// Minify CSS
gulp.task('css:minify', ['css:compile'], function() {
  return gulp.src([
      './app/css/*.css'
    ])
    .pipe(cssUrls(function(url) {
      if (url.indexOf('../') === 0) {
        return url.replace('../', 'https://assets.philippilon.com/');
      } else {
        return url;
      }
    }))
    .pipe(cleanCSS())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./dist/css'))
});

// CSS
gulp.task('css', ['css:compile', 'css:minify']);

gulp.task('js:minify', function() {
    return gulp.src('app/js/bundle.js')
      .pipe(minify({
        ext: '.min.js',
        noSource: true
      }))
      .pipe(gulp.dest('./dist/js'))
  });

gulp.task('js:compile', function() {
    return gulp.src('app/js/index.js')
      .pipe(browserify())
      .pipe(rename('bundle.js'))
      .pipe(gulp.dest('./app/js'))
  });

gulp.task('minify:html', function() {
  gulp.src('./app/*.html')
    .pipe(htmlreplace({
      'css': 'css/index.min.css',
      'js': {
        src: 'js/bundle.min.js',
        tpl: '<script src="%s"></script>'
      }
    }))
    .pipe(cdnAbsolutePath({asset: './app', cdn: 'https://assets.philippilon.com'}))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./dist'))
})

// JS
gulp.task('js', ['js:compile', 'js:minify']);

// Configure the browserSync task
gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: ["./app", "./vendor"]
    },
    notify: false
  });
});

// Dev task
gulp.task('dev', ['css:compile', 'js:compile', 'browserSync'], function() {
  gulp.watch('./app/scss/*.scss', ['css:compile']);
  gulp.watch(['./app/js/*.js', '!./app/js/bundle.js'], ['js:compile']);
  gulp.watch('./app/*.html', browserSync.reload);
});
