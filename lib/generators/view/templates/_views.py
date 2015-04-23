# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.views.generic import {{viewImports}}
from django.core.urlresolvers import reverse
from apps.{{appName}}.models import {{modelName}}
{{#if includeForm}}
from apps.{{appName}}.forms.{{lower modelName}} import {{modelName}}Form
{{/if}}
{{#if options.list}}
{{> ListView}}
{{/if}}
{{#if options.detail}}
{{> DetailView}}
{{/if}}
{{#if options.create}}
{{> CreateView}}
{{/if}}
{{#if options.update}}
{{> UpdateView}}
{{/if}}
{{#if options.del}}
{{> DeleteView}}
{{/if}}