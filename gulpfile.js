var gulp = require('gulp'),
    browserSync = require('browser-sync').create();

/* Sources */
var src_path = 'app/client/**/*';

/* Tasks */
gulp.task('default', ['watch']);

// Watch Files For Changes
gulp.task('watch', function () {
    browserSync.init({
        server: {
            baseDir: "./app/client/"
        }
    });

    //Reload builded
    gulp.watch(src_path).on('change', browserSync.reload);
});
