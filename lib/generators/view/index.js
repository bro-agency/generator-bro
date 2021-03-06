'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var format = require('util').format;
var colors = require('colors');
var yeoman = require('yeoman-generator');
var handlebars = require('../../utils/handlebars');
var generateFilesStruct = require('../../utils/generateFilesStruct');
var f = generateFilesStruct.f;
var helpers = require('../../core/helpers');
var core = require('../../core/generators/core');
var gHelper = require('../../core/generators/helper');

var selfGenerator = {
  _setArguments: function () {
    this.argument('appModelName', {
      desc: 'App name and model name in next format: app:ModelName',
      type: String, required: true
    });
  },

  _setOptions: function () {
    this.option('list', {
      desc: 'Create generic view ListView for model',
      type: Boolean, defaults: false});

    this.option('detail', {
      desc: 'Create generic view DetailView for model',
      type: Boolean, defaults: false});

    this.option('create', {
      desc: 'Create generic view CreateView for model',
      type: Boolean, defaults: false});

    this.option('update', {
      desc: 'Create generic view UpdateView for model',
      type: Boolean, defaults: false});

    this.option('del', {
      desc: 'Create generic view DeleteView for model',
      type: Boolean, defaults: false});

    this.option('force', {
      alias: 'f',
      desc: 'Overwrite files that already exist',
      type: Boolean, defaults: false});

    // options for list view
    this.option('paginate', {
      desc: 'Set paginate_by property for list view.',
      type: Number, defaults: 5});

    // options for detail view
    this.option('slug-field', {
      desc: 'Set slug_field property for detail view.',
      type: String, defaults: 'slug'});

    // options for delete view
    this.option('delete-success-url', {
      desc: 'Set success_url property for delete view.',
      type: String, defaults: '\'/\''});

    this.option('model', {
      desc: 'File with model (file name only)',
      type: String});

    this.option('view', {
      desc: 'File for view (file name only)',
      type: String});
  },

  _afterInit: function () {
    this.conflicter.force = this.opts.force;
    
    this.opts.views = {};
    this.root = path.dirname(this.config.path);
    this.includeForm = this.options.create || this.options.update;
    
    // Parsing arguments.

    var appModelName = this.appModelName.split(':');

    if(appModelName.length !== 2) {
      this.error(format(
        'First arg must be app name and models name in next format %s',
        colors.green('yo bro:view app:ModelName')));
    }

    this.appName = _.first(appModelName).toLowerCase();
    this.opts.modelName = _.last(appModelName);

    // Load model in json format.
    var pathToModelPackage = format(
      '%s/%s/models', this.config.get('apps'), this.appName);

    var fileModelName = this.opts.modelName.toLowerCase();

    var pathToModel = !fs.existsSync(pathToModelPackage) ?
      pathToModelPackage + '.py' :
      path.join(pathToModelPackage, (this.opts.model || fileModelName) + '.py');

    if (!this.fs.exists(pathToModel)) {
      this.error(format('File %s not found', pathToModel));
    }

    this.opts.modelFields = this.getModelFields(
      this.opts.modelName, this.fs.read(pathToModel));

    // Register views.
    var self = this;

    var lowerModelName = self.opts.modelName.toLowerCase();

    self.opts.views.list = {
      className: 'ListView',
      userClass: format('%sListView', self.opts.modelName),
      optionName: 'list',
      urlpattern: format(
        'url(r\'^%s/$\', %sListView.as_view(), name=\'%s.list\')',
        lowerModelName, self.opts.modelName, lowerModelName),
      viewContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          paginateBy: self.opts.paginateBy
        };
        return context;
      },
      templateContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          fields: _.map(self.opts.modelFields, mapFields)
        };
        return context;

        function mapFields(field) {
          return format('{{ item.%s }}', field);
        }
      },
      dstPath: format('server/templates/%s/%s_list.html',
        self.appName, self.opts.modelName.toLowerCase()),
      srcTemplatePath: self.templatePath('templates/_list.html'),
      srcCodePath: self.templatePath('views/_list.py')
    };

    self.opts.views.detail = {
      className: 'DetailView',
      userClass: format('%sDetailView', self.opts.modelName),
      optionName: 'detail',
      urlpattern: format(
          'url(r\'^%s/%s/$\', %sDetailView.as_view(), name=\'%s.detail\')',
          lowerModelName, this.isSlug ? '(?P<slug>[-a-zA-Z0-9_]+)' : '(?P<pk>\\d+)',  //jshint ignore:line
          self.opts.modelName, lowerModelName),
      viewContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          slugField: self.opts.slugField
        };
        return context;
      },
      templateContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          fields: _.map(self.opts.modelFields, mapFields)
        };
        return context;

        function mapFields(field) {
          return format('{{ object.%s }}', field);
        }
      },
      dstPath: format('server/templates/%s/%s_detail.html', self.appName,
          self.opts.modelName.toLowerCase()),
      srcTemplatePath: self.templatePath(format('templates/_detail.html')),
      srcCodePath: self.templatePath('views/_detail.py')
    };

    self.opts.views.create = {
      className: 'CreateView',
      userClass: format('%sCreateView', self.opts.modelName),
      optionName: 'create',
      urlpattern: format('url(r\'^%s/create/$\', ' +
        '%sCreateView.as_view(), name=\'%s.create\')',
        lowerModelName, self.opts.modelName, lowerModelName),
      viewContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName
        };
        return context;
      },
      templateContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          fields: _.map(self.opts.modelFields, mapFields)
        };
        return context;

        function mapFields(field) {
          var djangoHtml = '' +
              '<div class="form-create__field">\n' +
              '            {{ form.%s.errors }}\n' +
              '            {{ form.%s.label_tag }}\n' +
              '            {{ form.%s }}\n' +
              '        </div>';
          return format(djangoHtml, field, field, field);
        }
      },
      dstPath: format('server/templates/%s/%s_form.html', self.appName,
          self.opts.modelName.toLowerCase()),
      srcTemplatePath: self.templatePath(format('templates/_form.html')),
      srcCodePath: self.templatePath('views/_create.py')
    };

    self.opts.views.update = {
      className: 'UpdateView',
      userClass: format('%sUpdateView', self.opts.modelName),
      optionName: 'update',
      urlpattern: format('url(r\'^%s/update/(?P<pk>\\d+)/$\', ' +
          '%sUpdateView.as_view(), name=\'%s.update\')',
          lowerModelName, self.opts.modelName, lowerModelName),
      viewContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName
        };
        return context;
      },
      templateContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          fields: _.map(self.opts.modelFields, mapFields)
        };
        return context;

        function mapFields(field) {
          var djangoHtml = '' +
              '<div class="form-create__field">\n' +
              '            {{ form.%s.errors }}\n' +
              '            {{ form.%s.label_tag }}\n' +
              '            {{ form.%s }}\n' +
              '        </div>';
          return format(djangoHtml, field, field, field);
        }
      },
      dstPath: format('server/templates/%s/%s_form.html', self.appName,
          self.opts.modelName.toLowerCase()),
      srcTemplatePath: self.templatePath(format('templates/_form.html')),
      srcCodePath: self.templatePath('views/_update.py')
    };

    self.opts.views.delete = {
      className: 'DeleteView',
      userClass: format('%sDeleteView', self.opts.modelName),
      optionName: 'del',
      viewContext: function () {
        var context = {
          appName: self.appName,
          modelName: self.opts.modelName,
          deleteSuccessUrl: getSuccessUrl(self.opts.deleteSuccessUrl)
        };
        return context;

        function getSuccessUrl(defaultUrl) {
          var reverseExp = format(
            '%s:%s.list', self.appName, self.opts.modelName.toLowerCase());

          var isListViewExists = self.options.list ||
            self.fs.read(format('server/apps/%s/urls.py', self.appName))
              .indexOf(_.last(reverseExp.split(':'))) !== -1;

          if (isListViewExists) {
            return format('reverse(\'%s\')', reverseExp);
          } else {
            return defaultUrl;
          }
        }
      },
      srcCodePath: self.templatePath('views/_del.py'),
      urlpattern: format('url(r\'^%s/delete/(?P<pk>\\d+)/$\', ' +
          '%sDeleteView.as_view(), name=\'%s.delete\')',
          lowerModelName, self.opts.modelName, lowerModelName)
    };

    // Create active views object. From all registered views
    // choose those that is in options list.
    self.activeViews = _.transform(self.opts.views, filterViews);

    function filterViews(res, view, name) {
      if (self.options[view.optionName]) {
        res[name] = view;
      }
    }
  },

  _setContext: function() {
    return {
      app: path.join(this.config.get('apps'), this.appName),
      templates: this.config.get('templates'),
      modelFields: this.opts.modelFields,
      appName: this.appName,
      modelName: this.opts.modelName,
      defSave: this.opts.defSave,
      force: this.opts.force,
      paginateBy: this.opts.paginateBy,
      slugField: this.opts.slugField,
      deleteSuccessUrl: this.opts.deleteSuccessUrl,
      views: this.opts.views,
      root: this.root,
      includeForm: this.includeForm
    };
  },

  creating: {
    // views/model_name.py || views.py
    viewNamed: {
      src: '_views.py',
      dst: '{{app}}/{{fileName}}.py',
      replacement: function(self, content, src, dst, context) {
        self.opts.viewInserted = 0;

        _.forEach(self.activeViews, addViewsToContent);

        self.log(
          format('%s views were added on to %s', self.opts.viewInserted, dst));

        if (self.opts.viewInserted === 0) {
          process.exit(1);
        }

        // Next code do some operations with imports. Build imports,
        // inserts imports, check that this imports is not imported.

        var viewImportsList = _
            .chain(self.activeViews)
            .values()
            .pluck('className')
            .value();

        var imports = [
            f('from apps.{{appName}}.models.{{cameltosnack modelName}} import {{modelName}}', context)
        ];

        if (self.includeForm) {
          imports.push(format(
              '\nfrom apps.%s.forms.%s import %sForm', self.appName.toLowerCase(),
              self.opts.modelName.toLowerCase(), self.opts.modelName));
        }

        if(viewImportsList.length) {
          imports.push(format('\nfrom django.views.generic import %s',
              viewImportsList.join(', ')));
        }

        content = self.includeImports(imports, content, dst);

        return content;

        function addViewsToContent(view) {
          if (content.indexOf(view.userClass) === -1) {
            content += f(self.fs.read(view.srcCodePath), context);
            self.opts.viewInserted += 1;
          }
        }
      },
      context: function(self, globalContext) {
        var fileName = 'views';
        var viewsPackage = self
            .destinationPath(f('{{app}}/views', globalContext));
        var viewsCode = _
            .map(self.activeViews, getCodeView);
        var viewImportsList = _
            .chain(self.activeViews)
            .values()
            .pluck('className')
            .value();

        if (fs.existsSync(viewsPackage)) {
          fileName = 'views/' + (self.opts.view || self.opts.modelName).toLowerCase();
        }

        return {
          viewImports: viewImportsList.join(', '),
          fileName: fileName,
          viewsCode: viewsCode
        };

        function getCodeView(view) {
          var viewTemplate = fs
              .readFileSync(view.srcCodePath)
              .toString();

          var context = _.merge(globalContext, view.viewContext);

          return f(viewTemplate, context);
        }
      }
    },

    // urls.py
    urls: {
      dst: '{{app}}/urls.py',
      isRun: function (self, src, dst) {
        return fs.existsSync(dst);
      },
      replacement: function (self, content, src, dst) {
        var urlpattern = _.first(self.getFunctionCall('patterns', content));

        if (!urlpattern) {
          return false;
        }

        var fixUrlpattern = urlpattern;

        _.forEach(self.activeViews, addUrlPattern);

        var changeContent = content
          .replace(urlpattern, fixUrlpattern.replace(/\$/g, '$$$'));

        // Next code do some operations with imports. Build imports,
        // inserts imports, check that this imports is not imported.

        var imports = [];

        var viewImportsList = _
            .chain(self.activeViews)
            .values()
            .pluck('userClass')
            .value();

        if(viewImportsList.length) {
          imports.push(format('\nfrom apps.%s.views import %s',
            self.appName, viewImportsList.join(', ')));
        }

        return self.includeImports(imports, changeContent, dst);

        function addUrlPattern(view) {
          var isUrlPatternExists = fixUrlpattern
            .indexOf(view.urlpattern.replace(/\$\$/g, '$')) === -1;

          if (isUrlPatternExists) {
            fixUrlpattern = fixUrlpattern
                .replace(/(patterns\(\n?(\s*)'[\w_.]*?',(\s|.)+)\)/, replacer);
          }

          function replacer(str, p1, p2) {
            return p1 + p2 + view.urlpattern + ',\n)';
          }
        }
      }
    },

    // forms/__init__.py
    formInit: {
      dst: '{{app}}/forms/__init__.py',
      isRun: function(self, src, dst) {
        return self.options.update || self.options.create;
      },
      replacement: function(self, content) {
        var imports = [
          format('from apps.%s.forms.%s import %sForm', self.appName,
            self.opts.modelName.toLowerCase(), self.opts.modelName)
        ];
        return self.includeImports(imports, content);
      }
    },

    // views/__init__.py
    viewsInit: {
      dst: '{{app}}/views/__init__.py',
      isRun: function(self, src, dst) {
        return fs.existsSync(path.dirname(dst));
      },
      replacement: function(self, content, dst) {
        var imports = [];

        var viewImportsList = _
            .chain(self.activeViews)
            .values()
            .pluck('userClass')
            .value();

        if(viewImportsList.length) {
          imports.push(format('\nfrom apps.%s.views.%s import %s', self.appName,
            self.opts.modelName.toLowerCase(), viewImportsList.join(', ')));
        }

        return self.includeImports(imports, content, dst);
      }
    },

    // models/*.py
    models: {
      dst: '{{app}}/{{fileName}}.py',
      isRun: function(self, src, dst, context) {
        return self.options.detail;
      },
      replacement: function(self, content, src, dst, context) {
        var modelBody = self.getClassBody(self.opts.modelName, content);

        if (!modelBody) {
          self.warning(format(
            'Model %s not found in file %s', self.opts.modelName, path));
          return false;
        }

        var modelMethods = self
            .getClassMethods(self.opts.modelName, content);

        if(modelMethods.indexOf('get_absolute_url') !== -1) {
          return false;
        }

        var getAbsoluteUrlMethod = getMethod();

        var methodsAfterMustBeInsert = ['__unicode__', 'save'];

        var methodAfter = _
            .chain(modelMethods)
            .intersection(methodsAfterMustBeInsert)
            .last()
            .value();

        if (!methodAfter) {
          content = content.replace(
              modelBody, modelBody + getAbsoluteUrlMethod);
        } else {
          // insert method to end model
          var methodBody = self.getMethodBody(methodAfter, modelBody);

          content = content.replace(modelBody, modelBody.replace(
              methodBody, methodBody + getAbsoluteUrlMethod));
        }

        var imports = ['from django.core.urlresolvers import reverse'];

        content = self.includeImports(imports, content, path);

        return content;

        function getMethod() {
          var spaces = 4;

          return format('\n\n%sdef get_absolute_url(self):\n' +
              '%sreturn reverse(\'%s:%s.detail\', args=(%s,))',
              _.repeat(' ', spaces), _.repeat(' ', spaces*2), self.appName,
              self.opts.modelName.toLowerCase(), self.isSlug ? 'self.slug' : 'self.pk');
        }
      },
      context: function(self, globalContext) {
        var fileName = 'models';
        var modelsPackage = self
            .destinationPath(f('{{app}}/models', globalContext));

        if (fs.existsSync(modelsPackage)) {
          fileName = 'models/' + (self.opts.model || self.opts.modelName).toLowerCase();
        }

        return {
          fileName: fileName
        };
      }
    },

    // forms/model_name.py
    form: {
      src: '_form.py',
      dst: '{{app}}/forms/{{cameltosnack modelName}}.py',
      isRun: function(self, src, dst) {
        return self.options.update || self.options.create;
      },
      context: function(self, globalContext) {
        var basePath = format('apps.%s.models', self.appName);

        if (fs.existsSync(path.join(globalContext.app, 'models'))) {
          basePath += format('.%s', self.opts.model || self.opts.modelName.toLowerCase());
        }

        return {
          modelPythonPath: basePath
        };
      }
    },

    // templates/app_name/model_name_detail.html
    templateDetail: {
      src: 'templates/_detail.html',
      dst: '{{templates}}/{{appName}}/{{cameltosnack modelName}}_detail.html',
      isRun: function(self, src, dst) {
        return self.options.detail && !fs.existsSync(dst);
      },
      context: function(self, global) {
        return _.isFunction(self.opts.views.detail.templateContext) ?
            self.opts.views.detail.templateContext() :
            self.opts.views.detail.templateContext;
      }
    },

    // templates/app_name/model_name_form.html
    templateForm: {
      src: 'templates/_form.html',
      dst: '{{templates}}/{{appName}}/{{cameltosnack modelName}}_form.html',
      isRun: function(self, src, dst) {
        return (self.options.update || self.create) && !fs.existsSync(dst);
      },
      context: function(self, global) {
        return _.isFunction(self.opts.views.create.templateContext) ?
            self.opts.views.create.templateContext() :
            self.opts.views.create.templateContext;
      }
    },

    // templates/app_name/model_name_list.html
    templateList: {
      src: 'templates/_list.html',
      dst: '{{templates}}/{{appName}}/{{cameltosnack modelName}}_list.html',
      isRun: function(self, src, dst) {
        return self.options.list && !fs.existsSync(dst);
      },
      context: function(self) {
        return _.isFunction(self.opts.views.list.templateContext) ?
            self.opts.views.list.templateContext() :
            self.opts.views.list.templateContext;
      }
    }
  },

  _afterEnd: function () {
    this.log(format('%s Your views was created!', colors.green('Finish!')));
  }
};

module.exports = helpers.extendOf(gHelper, core, selfGenerator);
