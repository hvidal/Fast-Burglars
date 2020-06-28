var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var buffer = require('vinyl-buffer');
var del = require('del');

gulp.task("cleanup", function(callback) {
	return del(['dist/*']);
});

gulp.task("copy-assets", ["cleanup"], function () {
	return gulp.src(['assets/**/*', '!assets/**/*.psd', '!assets/**/*.blend'])
		.pipe(gulp.dest("dist/assets/"));
});

gulp.task("copy-html", ["cleanup"], function () {
	return gulp.src(['src/*.html']).pipe(gulp.dest("dist"));
});

gulp.task('copy-minify-html', ["cleanup"], function() {
	return gulp.src('src/*.html')
		.pipe(htmlmin({collapseWhitespace:true, minifyCSS: true}))
		.pipe(gulp.dest('dist'));
});

gulp.task("scripts", ["cleanup"], function() {
	return browserify({
		basedir: '.',
		entries: ['src/app.ts'],
		cache: {},
		packageCache: {}
	})
	.plugin(tsify)
	.bundle()
	.pipe(source('bundle.js'))
	.pipe(buffer())
	.pipe(uglify())
	.pipe(gulp.dest("dist"));
});

gulp.task("scripts-debug", ["cleanup"], function() {
	return browserify({
		basedir: '.',
		debug: true,
		entries: ['src/app.ts'],
		cache: {},
		packageCache: {}
	})
	.plugin(tsify)
	.bundle()
	.pipe(source('bundle.js'))
	.pipe(gulp.dest("dist"));
});

gulp.task("debug", ["copy-assets", "copy-html", "scripts-debug"]);
gulp.task("default", ["copy-assets", "copy-minify-html", "scripts"]);
