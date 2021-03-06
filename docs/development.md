# Creating generators

This part describes about creating new sub generators for generator-bro. Before
you want create sub generator read this document.

## Place

All sub generators placed in **generator-bro/lib/generators**

## Struct

Struct generator must be like this

```
subgenerator
├─ templates
|  └─ your_template
├─ test
|  └─ test-subgenerator.app.js
├─ index.js
└─ struct.json
```

**templates**

Directory with templates for generating files. If template file name starts with
**_** sign then this file will be compiled with handlebars.

**test**

Directory with tests. Read [docs](http://http://yeoman.io/authoring/testing.html) in yeoman site.

**index.js**

Main file with generator code. More info about this read above.

See stub for index.js in next listing:

```javascript
'use strict';

var _ = require('lodash');

var helpers = require('../../core/helpers');
var core = require('../../core/generators/core');
var gHelper = require('../../core/generators/helper');

var selfGenerator = {
  _setArguments: function() {
    // Your arguments this.
    this.argument('my_argument', {
      desc: 'Description for my argument',
      type: String});

    // Other args ...
  },

  _setOptions: function () {
    // Your options this.
    this.option('my_option', {
      desc: 'Description for my option',
      type: String});

    // Other opts ...

    // After user input your options you can get in this.opts object.
  },

  _questions: function () {
    // List with your questions
    return [{
      type: 'input',
      name: 'myQuestion',
      message: 'Question text',
      default: 'default',
      validate: validateAnswer, // must be named function. Placed it in above.
      store: true
    }];

    // Your functions for validate answers.
    function validateAnswer(answer) {
      return !!answer;
    }
  },

  _beforeInit: function () {
    // before end init
  },

  _afterInit: function () {
    // after end init
  },

  // This is global context, this function must will be return object always.
  // Returned object using in template generating as context for handlebars.
  _setContext: function () {
    return {
      myVar: 'My var value'
    };
  },

  // Creating section describe files which will be creating or updating.
  // Every object describe one file and it should look like this:
  //
  // fileAlias: {
  //   src: 'path/to/your/template.py',
  //   dst: 'path/where/file/will/be/saved.py',
  //   isRun: function (self, src, dst, context) {},
  //   replacement: function (self, content, src, dst, context) {},
  //   context: function (self, globalContext) {} || {}
  // }
  //
  // src: Contain path to template for creating file. May be empty if you want
  //      update file and not create. Path may be look like this: '/path/{{somethigVar}}/my_file.py',
  //      but in this case `somethigVar` must be defined in global context or local context.
  //
  // dst: Same that src, but is required. Contain destination path when file will
  //      be created or updated.
  //
  // isRun: This function must be return bool value. If this function not defined it be equivalently
  //        as true value. If function defined and return false then this block not be running.
  //
  //        Function takes next args:
  //          * self: generator
  //          * src: complete src
  //          * dst: complete dst
  //          * context: merged local and global context
  //
  // replacement: Function return string. This string will be write do `dst` path.
  //              Use this function if you want update file.
  //
  //              Function takes next args:
  //                * self: generator
  //                * content: string with file content
  //                * src: complete src
  //                * dst: complete dst
  //                * context: merged local and global context
  //
  // context: Function or Object. Local context which using for generating file.
  //
  //          Function takes next args:
  //            * self: generator
  //            * globalContext: global context
  //
  // You can use only src and dst keys for simple copy file. File will be copied
  // with handlebar usages. See examples bellow. But if you want only copy files
  // without conditions and dynamic paths use struct.json, read next part.

  creating: {
    //path/to/your_new_file.py
    createFileIfMyVarExists: {
      src: 'template.py',
      dst: '{{path}}/destination_file.py',
      isRun: function(self, src, dst, context) {
        return _.has(context, 'myVar'); // file will be copied if myVar exists in context
      },
      context: function (self, globalContext) {
        path: '/root/',
        myVar: 'test' // file will be copied because we initialize var myVar
      }
    },

    //path/to/your_old_file.py
    updateFileEverything: {
      dst: '{{path}}/destination_file.py',
      replacement: function(self, content, src, dst) {
        return content + 'print "hello Yeoman!"\n'; // add this print to file
      }
    }
  },

  _beforeEnd: function () {
    // before end hook
  },

  _afterEnd: function () {
    // after end hook
  }
};

module.exports = helpers.extendOf(gHelper, core, selfGenerator);
```

**struct.json**

This file describe generating file structure in json format. If sub generator
have a file with name **struct.json** generator will be copy files from templates
to destination paths. File must be have next format data:

```javascript
[
  {
    "name": "root_dir_name",
    "files": [
      ["template_one", "some/path/to/file_one"],
      ["template_two", "some/path/to/file_two"]
    ],
    "dirs": [
      {
        "name": "dir_with_files",
        "files": [
          ["some_template", "path/file_name"]
        ]
      }
    ]
  },
  {
    "name": "path/to/some/dir",
    "files": [
      ["template_file", "destination_file"]
    ]
  }
]
```

Key **files** takes a list, every list have a two strings.

First is path to file
in templates directory relative this. If template name starts from **_** template
will be compiled with help handlebars using global context from **index.js** file.
If template file name don't starts from **_** sign then this file will be just copy.

Second is destination path relative of your project root directory.

Dir and file paths may be written in next format:

```javascript
[
  {
    "name": "apps/{{myApp}}/models.py"
  }
]
```

But variable **myApp** must be defined in global context.