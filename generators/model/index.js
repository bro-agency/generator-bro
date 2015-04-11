'use strict';
var yeoman = require('yeoman-generator');
var _ = require('lodash');
var generateFilesStruct = require('../../utils/generateFilesStruct');
var gfs = generateFilesStruct.generateFileStruct;
var f = generateFilesStruct.f;
var addToFile = generateFilesStruct.addToFile;


module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.Base.apply(this, arguments);

    // args
    this.argument('appModelName', {
      type: String, required: true});

    // options
    this.option('def-save', {
      type: Boolean, defaults: false});
  },

  initializing: function () {
    this.modelFieldTypes = this.fs.readJSON(
      this.templatePath('../model_field_types.json'));
  },

  /**
   * Parsing arguments.
   */
  parseArgs: function () {
    var self = this;

    var appModelName = this.appModelName.split(':');
    var fieldArgs = _.slice(this.arguments, 1); // get all args without first

    this.appName = _.first(appModelName);
    this.modelName = _.last(appModelName);

    var fieldsObj = _.map(fieldArgs, getFieldObj);
    this.fields = _.map(fieldsObj, serializeModelField);

    var isName = _.chain(fieldsObj)
      .find(where)
      .result('name', undefined)
      .value();

    this.isSlug = _.result(_.find(fieldsObj, 'name', 'slug'), 'name');

    this.isNameOrSlug = isName || isSlug;

    this.factoryFields = [];

    function where(f) {
      return f.name === 'name' || f.name === 'title';
    }

    /**
     * Convert raw string to file object.
     *
     * Usage:
     *
     * var rawField = 'title:char:blank=True,null=True';
     * getFieldObj(rawField);
     * {name: 'title',
     *  args: {blank: True, null: True, max_length: 255, verbose_name: '_("Title")'},
     *  fieldType: 'models.CharField'}
     *
     * @param rawField
     * @returns {{name: *, args: Object, fieldType: *}}
     */
    function getFieldObj(rawField) {

      var nameTypeArgs = rawField.split(':');

      if (nameTypeArgs.length < 2) {
        throw new Error('Validation error');
      }

      var name = nameTypeArgs[0];
      var ftype = nameTypeArgs[1];
      var args = nameTypeArgs[2];

      var opts = getDefaultArgsForField(ftype, name); // options for field

      if (args) {
        var listKeyVal = args.split(',');

        _.transform(listKeyVal, function (res, val){
          var keyVal = val.split('=');

          if (keyVal.length === 1) {
            res[keyVal[0]] = '';
          } else if(keyVal.length === 2) {
            res[keyVal[0]] = keyVal[1];
          } else {
            throw new Error('Validation error');
          }
        }, opts);
      }

      var fromModule = 'models.';

      return {
        name: name,
        args: opts,
        fieldType: f('{{from}}{{ftype}}', {
          from: fromModule, ftype: self.modelFieldTypes[ftype].name})
      };

      /**
       * Get default args object for field initialize. Default args for field
       * must be set in file `model_field_types.json` for `field` param.
       * Default args building from two objects: model_field_types[field]
       * and `defaultArgsForAll` private variable.
       *
       * Will be removed in next minor version.
       *
       * @deprecated
       *
       * @private
       *
       * @param field {String}
       * @param name {String}
       * @returns {Object}
       */
      function getDefaultArgsForField(field, name) {
        var defaultArgsForAll = {
          verbose_name: f('_("{{name}}")', {name: name})};  // jshint ignore:line

        var defaultArgsForThis = self.modelFieldTypes[field].defaultArgs || {};

        return _.merge(defaultArgsForAll, defaultArgsForThis);
      }
    }

    /**
     * Get string from object in django model field format.
     *
     * Usage:
     *
     * var field = {
     *  name: 'title',
     *  args: {max_length: 255, verbose_name: '_("Title")'},
     *  fieldType: 'models.CharField'};
     * serializeModelField(field);*
     * "title = models.CharField(max_length=255, verbose_name=_(\"Title\"))"
     *
     * @param field {Object}
     * @returns {String}
     */
    function serializeModelField(field) {
      field.opts = getOptions(field.args);
      return f('{{name}} = {{fieldType}}({{opts}})', field);

      /**
       * Get args and kwargs as string format for initializing
       * django model field. Sorting parameters begin args and then kwargs.
       *
       * Usage:
       *
       * var opts = {blank: True, null: True, News: ''};
       * getOptions(opts);
       * "\"News\", blank=True, null=True"
       *
       * @private
       *
       * @param args {Object}
       * @returns {String}
       */
      function getOptions(args) {
        var argsKwargs = _.chain(args)
          .map(getKeyVal).sortBy(sort).value();
        return argsKwargs.join(', ');

        function getKeyVal(v, k) {
          return v? k + '=' + v : '"' + k + '"';
        }

        function sort(param, i) {
          return _.indexOf(param, '=') === -1 ? (i * -1) : i;
        }
      }
    }
  },

  /**
   * Parsing options.
   */
  parseOpts: function () {
    this.defSave = this.options.defSave;
  },

  /**
   * Creating new files and directories.
   */
  writing: function () {
    var structJSON = this.fs.readJSON(
      this.templatePath('../struct.json'));

    gfs(structJSON, './', this);  // generate file struct for this generator
  },

  /**
   * Updating already existing files.
   */
  updateExistingFiles: function () {
    addToFile(
      f('server/apps/{{appName}}/models/__init__.py', this),
      f('from apps.{{appName}}.models.{{modelName.toLowerCase()}} import *', this),
      this.fs);

    addToFile(
      f('server/apps/{{appName}}/admin/__init__.py', this),
      f('from apps.{{appName}}.admin.{{modelName.toLowerCase()}} import *', this),
      this.fs);
  }
});
