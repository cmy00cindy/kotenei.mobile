var gulp   = require('gulp');
var less   = require('gulp-less');
var path   = require('path');
var fs     = require('fs');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var through2 = require('through2');

var configPath = path.join(__dirname, 'build.config');
var config     = JSON.parse(fs.readFileSync(configPath, 'utf8'));

//将所有 kw 合成一份定义
var build = function(){
    return through2.obj(function(file, enc, callback) {
        var soure   = file.contents.toString('utf8');
        var jsPath  = path.join(__dirname, 'src');
        var modules = [];
        //列出所有文件
        fs.readdirSync(jsPath).forEach(function(fileName){
            if(fileName.indexOf('.js') !== -1 && 
               fileName.indexOf('.') !== 0){
                var files = fileName.split('.');
                files.pop();
                modules.push(files.join('.'));
            }
        });
        var reqs = modules.map(function(v){
            return '"km/' + v + '"';
        });

        var safeModules = modules.map(function(v){
            return '_' + v ;
        });

        var def = [];
        def.push('define("km", [' + reqs.join(', ') + '], function(' + safeModules.join(', ') + '){');
        def.push('    return {');
        var attr = [];
        modules.forEach(function(v){
            if(config['function'].indexOf('km/' + v) === -1){
                //首字母大写
                var names = v.split('');
                names[0] = names[0].toUpperCase(); 
                attr.push('        "' + names.join('') + '" : _' + v);
            }
            else{
                attr.push('        "' + v + '" : _' + v);
            }
        });
        def.push(attr.join(',\n')); 
        def.push('    };');
        def.push('});');

        file.contents = new Buffer(soure + '\n;\n' + def.join('\n'));
       
        callback(null, file);
    });
};

gulp.task('less', function () {
    gulp.src([
        './less/*.less',
        '!./less/_*.less'
    ])
    .pipe(less({
      paths: [path.join(__dirname, 'style')]
    }))
    .pipe(gulp.dest('./dist/css'));
});

gulp.task('scripts', function(){
    gulp.src([
        './src/*.js'
    ])
    .pipe(concat('km.all.js'))
    .pipe(build())
    .pipe(gulp.dest('./dist'))
    .pipe(rename('km.all.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function(){
    gulp.watch([
        './less/*.less',
    ], ['less']);

    gulp.watch([
        './src/*.js',
    ], ['scripts']);
});

gulp.task('default', ['less', 'scripts', 'watch']);