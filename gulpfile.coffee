gulp = require 'gulp'
gutil = require 'gulp-util'
parentDir = "app/"

#load all module
$ = require('gulp-load-plugins')({
	pattern: ['gulp-*', 'gulp.*'],
	replaceString: /\bgulp[\-.]/
})

browserSync = require 'browser-sync'
reload = browserSync.reload
runSequence = require('run-sequence');

gulp.task 'default', ->
	console.log 'gulp!'

#coffee compile
gulp.task 'coffee', ->
	gulp
	.src ['src/coffee/*.coffee']
	.pipe $.plumber()
	.pipe $.coffee()
	.pipe gulp.dest parentDir + 'js'

#typescript compile
gulp.task 'typescript', () ->
	gulp
	.src 'src/*.ts'
	.pipe $.plumber()
	.pipe $.tsc()
	.pipe gulp.dest parentDir + 'js'

#run server / watch
gulp.task 'serve', ['default'], ->
	browserSync
		notify: false
		server:
			baseDir: [parentDir]
	#	gulp.watch ['src/coffee/*.coffee'], ['script']
	gulp.watch ['src/*.ts'], ['script_type']
	gulp.watch [parentDir + '*.html'], reload

#concat javascript
gulp.task 'concat', ->
	gulp
	.src ["app/temp/*.js"]
	.pipe $.concat 'all.js'
	.pipe gulp.dest 'app/dist/'

#coffee compile&reload
gulp.task 'script', ->
	runSequence 'coffee', reload

#typescript compile&reload
gulp.task 'script_type', ->
	runSequence 'typescript','concat', reload
