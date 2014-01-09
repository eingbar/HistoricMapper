module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    express: {
        options: {
            port: process.env.PORT || 9000
        },        
        dev: {
          options: {
              script: 'app.js',
              debug: true
          }
        },
        prod: {
          options: {
              script: 'app.js'
          }
        }
    },
    watch: {
      // coffee: {
      //     files: ['<%= yeoman.app %>/scripts/{,*/}*.coffee'],
      //     tasks: ['coffee:dist']
      // },
      // coffeeTest: {
      //     files: ['test/spec/{,*/}*.coffee'],
      //     tasks: ['coffee:test']
      // },
      // compass: {
      //     files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
      //     tasks: ['compass']
      // },
      css:{
        files: ['public/stylesheets/*.css', '!public/stylesheets/output.css'],
        tasks: ['cssmin'],
        options: {
          livereload: true
        }
      },
      ejs:{
        files: ['views/{,*/}*.ejs', 'views/{,*/}*/{,*/}*.ejs'],
        tasks: [],
        options: {
          livereload: true
        }
      },
      publicJS:{
        files: ['public/javascripts/{,*/}*.js', '!public/javascripts/HistoricMapper.min.js', '!public/javascripts/jqueryFiles.min.js'],
        tasks: ['uglify'],
        options: {
          livereload: true
        }
      },
      express: {
          files: [
              'app.js',
              'dataservices/*.js',
              'routes/*.js',
              'config/{,*/}*.js',
              'config/{,*/}/{,*/}*.js',
              'schemas/*.js',
              'util/{,*/}*.js',
          ],
          tasks: ['express:dev'],
          options: {
              livereload: true,
              nospawn: true //Without this option specified express won't be reloaded
          }
      }
    },    
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: {except: ['jQuery', 'ko', 'L']}
      },
      buildJS: {
        files: {
          'public/javascripts/<%= pkg.name %>.min.js': ['public/javascripts/<%= pkg.name %>.js'],
          'public/javascripts/jqueryFiles.min.js': ['public/javascripts/jquery-1.10.2.js', 'public/javascripts/jquery.lazyload.js', 'public/javascripts/lightbox-2.6.min.js', 'public/javascripts/jquery.validate.js', 'public/javascripts/additional-methods.js', 'public/javascripts/twitter-bootstrap-3.0.0.js', 'public/javascripts/knockout-3.0.0.js'],
          'public/javascripts/leafletFiles.min.js': ['public/javascripts/leaflet.js', 'public/javascripts/leaflet.markercluster-src.js', 'public/javascripts/leaflet.draw.js', 'public/javascripts/esri-leaflet-src.js', 'public/javascripts/leaflet.awesome-markers.js']
        }
      }
    },
    cssmin: {
      compress: {
        files: {
          'public/stylesheets/output.css': 
            ['public/stylesheets/leaflet.css', 
              'public/stylesheets/MarkerCluster.css', 
              'public/stylesheets/MarkerCluster.Default.css',            
              'public/stylesheets/leaflet.draw.css', 
              'public/stylesheets/twitter-bootstrap-3.0.0.css', 
              'public/stylesheets/font-awesome.css', 
              'public/stylesheets/leaflet.awesome-markers.css', 
              'public/stylesheets/lightbox.css',
              'public/stylesheets/style.css'
            ]
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');

  // Default task(s).
  grunt.registerTask('default', ['uglify', 'cssmin', 'express:dev', 'watch']);

};