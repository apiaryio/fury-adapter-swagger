# Fury Swagger 2.0 Adapter

[![Build Status](https://img.shields.io/travis/apiaryio/fury-adapter-swagger.svg)](https://travis-ci.org/apiaryio/fury-adapter-swagger) [![Coverage Status](https://img.shields.io/coveralls/apiaryio/fury-adapter-swagger.svg)](https://coveralls.io/r/apiaryio/fury-adapter-swagger) [![NPM version](https://img.shields.io/npm/v/fury-adapter-swagger.svg)](https://www.npmjs.org/package/fury-adapter-swagger) [![License](https://img.shields.io/npm/l/fury-adapter-swagger.svg)](https://www.npmjs.org/package/fury-adapter-swagger)

This adapter provides support for parsing [Swagger 2.0](http://swagger.io/) in [Fury.js](https://github.com/apiaryio/fury.js)). It does not yet provide a serializer.

## Install

```sh
npm install fury-adapter-swagger
```

## Usage

```js
import fury from 'fury';
import swaggerAdapter from 'fury-adapter-swagger';

fury.use(swaggerAdapter);

fury.parse({source: '... your Swagger 2.0 document ...'}, (err, result) => {
  if (err) {
    console.log(err);
    return;
  }

  // The returned `result` is a Minim parse result element.
  console.log(result.api.title);
});
```

### Parser Codes

The following codes are used by the parser when creating warning and error annotations.

Warnings:

Code | Description
---: | -----------
   2 | Source maps are unavailable due either to the input format or an issue parsing the input.
   3 | Data is being lost in the conversion.
   4 | Swagger validation error.

Errors:

Code | Description
---: | -----------
   1 | Error parsing input (e.g. malformed YAML).

Result is a [minim](https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md) - wrapper for [Refract](https://github.com/refractproject/refract-spec) instance.

## Mapping and transformations

Mapping and transformation from [Swagger 2.0](http://swagger.io/specification) to [API Description Refract Namesapce](https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md)

### Pre-process Swagger

- *Dereferencing* [Reference objects][reference] in:
  - [operation][operation] parameters
  - [path][path] parameters
  - [responses object][response] values
  - operation object reference in [path][path]

- *Dereferencing* JSON Schemas from [path](#pathsObject) [operation][operation] [parameter][parameters] type (`in`) `body`

- *Dereferencing* JSON Schemas from [path][path] [operation][operation] [responses][response] schema object

### Convert

**From Swagger:**
  - [Path Templates][path_templates] in each [path object][path]
  - [operation][operation] parameters type (`in`) `path`
  - [operation][operation] parameters type (`in`) `query`

**Transform:** Convert to [URI Template](https://tools.ietf.org/html/rfc6570)

**To Refract:** [resource][resource] `attributes.href` ([Href][href-type])

- - -

**From Swagger:** [operation][operation] `summary`

**Transform:** None

**To Refract:** [transition][transition] `meta.title`

- - -

**From Swagger:** [operation][operation] `description`

**Transform:** None

**To Refract:** [transition][transition] `content` ([Copy](https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md#copy-element)) `content`

- - -

**From Swagger:** [operation][operation] `operationId`

**Transform:** None

**To Refract:** [transition][transition] `attributes.relation`

- - -

**From Swagger:**

**Transform:** Empty string

**To Refract:** [resource][resource] `meta.title`


[path]: http://swagger.io/specification/#pathsObject
[path_templates]: http://swagger.io/specification/#pathTemplating
[operation]: http://swagger.io/specification/#operationObject
[parameters]: http://swagger.io/specification/#parameterObject
[responses]: http://swagger.io/specification/#responsesDefinitionsObject
[response]: http://swagger.io/specification/#responseObject
[reference]: http://swagger.io/specification/#referenceObject


[resource]: https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md#resource-element
[transition]: https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md#transition-element
[href-type]: https://github.com/refractproject/refract-spec/blob/master/namespaces/api-description-namespace.md#href-string
