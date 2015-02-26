'use strict';
var yeoman = require('yeoman-generator');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.Base.apply(this, arguments);

    this.argument('appname', {
      type: String,
      required: false
    });
  },

  initializing: function () {

  },

  writing: {
    appDirectories: function () {
      var structJSON = this.src.readJSON('../struct.json');

      var self = this;

      generateFileStruct(structJSON);

      //////////////////////////////

      /**
       * Recursion function for creating directory structure by
       * structure map json.
       *
       * @param sj {Object}
       * @param path {String}
       */
      function generateFileStruct(sj, path) {
        path = path || './';

        var dirName = path + _(sj.name, {appName: self.appname});

        self.dest.mkdir(dirName);

        if (sj.dirs) {
          self._.each(sj.dirs, function(d) {
            generateFileStruct(d, dirName + '/');
          });
        }
      }

      /**
       * Get formating string and params and return result string.
       *
       * Usage:
       *
       * _('I'm {age} years old', {age: 10})
       *
       * @param tpl {String}
       * @param opts {Object}
       * @returns {String}
       * @private
       */
      function _(tpl, opts) {
        self._.each(self._.keys(opts), function (opt){
          tpl = tpl.replace('{'+opt+'}', opts[opt]);
        }); return tpl;
      }
    }
  }
});
