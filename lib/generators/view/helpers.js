'use strict';

var _ = require('lodash');
var path = require('path');
var colors = require('colors');
var format = require('util').format;
var yeoman = require('yeoman-generator');
var handlebars = require('../../utils/handlebars');

module.exports = yeoman.generators.Base.extend({
  copyTpl: function (from, to, context) {
    var srcContent = this.fs.read(from);
    var compileContent = handlebars.compile(srcContent);
    this.fs.write(to, compileContent(context));
  },
  error: function(message) {
    this.log(format('%s %s', colors.red('Error!'), message));
    process.exit(1);
  },
  warning: function(message) {
    this.log(format('%s %s', colors.yellow('Warning!'), message));
  },
  includeImports: function (imports, content, file) {
    if (!/((from|import).*)/.test(content)) {
      // todo improve algorithm for insert imports

      this.warning(format(
          'Did not find where to insert imports, do this manually: ' +
          '\n%s~~~%s\n~~~', file + '\n' || '', imports));

      return content;
    }

    _.forEach(imports, includeImport);

    return content;

    function includeImport(i) {
      var isFrom = i
        .indexOf() !== -1;
      var spliting = i
        .split('import');
      var path = _
        .first(spliting)
        .replace('from', '')
        .trim();
      var objs = _
        .chain(_.last(spliting).split(','))
        .map(_.trim)
        .filter(checkImport)
        .value();
      var importString = _.trimLeft(format('\n%s%s import %s\n',
        isFrom ? 'from ' : '', path, objs.join(', ')));

      content = content
        .replace(/((from|import).*)/, '$1' + importString);

      function checkImport(im) {
        return !new RegExp(format('import\s+.*%s', im)).test(content);
      }
    }
  }
});