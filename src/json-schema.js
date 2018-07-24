import _ from 'lodash';

// Test whether a key is a special Swagger extension.
function isExtension(value, key) {
  return _.startsWith(key, 'x-');
}

function convertSubSchema(schema, references) {
  // TODO somehow collect $ref references
  let actualSchema = _.omit(schema, ['discriminator', 'readOnly', 'xml', 'externalDocs', 'example']);
  actualSchema = _.omitBy(actualSchema, isExtension);

  if (schema['$ref']) {
    references.push(schema['$ref']);
  }

  if (schema['x-nullable']) {
    if (actualSchema.type) {
      actualSchema.type = [actualSchema.type, 'null'];
    } else if (actualSchema.enum === undefined) {
      actualSchema.type = 'null';
    }

    if (actualSchema.enum && !actualSchema.enum.includes(null)) {
      actualSchema.enum.push(null);
    }
  }

  if (schema.allOf) {
    actualSchema.allOf = schema.allOf.map(convertSubSchema, references);
  }

  if (schema.anyOf) {
    actualSchema.anyOf = schema.anyOf.map(convertSubSchema, references);
  }

  if (schema.oneOf) {
    actualSchema.oneOf = schema.oneOf.map(convertSubSchema, references);
  }

  if (schema.not) {
    actualSchema.not = convertSubSchema(schema.not, references);
  }

  // Array

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      actualSchema.items = schema.items.map(convertSubSchema, references);
    } else {
      actualSchema.items = convertSubSchema(schema.items, references);
    }
  }

  if (schema.additionalItems && typeof schema.additionalItems === 'object') {
    actualSchema.additionalItems = convertSubSchema(schema.additionalItems, references);
  }

  // Object

  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      actualSchema.properties[key] = convertSubSchema(schema.properties[key], references);
    });
  }

  if (schema.patternProperties) {
    Object.keys(schema.patternProperties).forEach((key) => {
      actualSchema.patternProperties[key] = convertSubSchema(schema.patternProperties[key], references);
    });
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    actualSchema.additionalProperties = convertSubSchema(schema.additionalProperties, references);
  }

  return actualSchema;
}

/** Convert Swagger schema to JSON Schema
 */
export default function convertSchema(schema, root) {
  // TODO make this non-recursive so we don't hit stack depth limit

  const references = [];
  const result = convertSubSchema(schema, references);

  if (references.length !== 0) {
    result.definitions = {};
  }

  while (references.length !== 0) {
    const id = references.pop().replace('#/definitions/', '');

    if (result.definitions[id] === undefined) {
      const referenceSchema = root.definitions[id];
      result.definitions[id] = root.definitions[id];
    }
  }

  return result;
}
