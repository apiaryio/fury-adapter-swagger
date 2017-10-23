/* eslint-disable class-methods-use-this */

import _ from 'lodash';

/*
 * Data Structure Generator
 * Generates a dataStructure element from a JSON schema.
 *
 * >>> const generator = new DataStructureGenerator(minimNamespace);
 * >>> const dataStructure = generator.generateDataStructure({type: 'string'});
*/
export default class DataStructureGenerator {
  constructor(minim) {
    this.minim = minim;
  }

  // Generates a data structure element representing the given schema
  generateDataStructure(schema) {
    const element = this.generateElement(schema);

    if (!element) {
      return null;
    }

    const { DataStructure } = this.minim.elements;
    const dataStructure = new DataStructure(element);
    return dataStructure;
  }

  // Generates a member element for a property in a schema
  generateMember(name, property) {
    const {
      String: StringElement,
      Member: MemberElement,
    } = this.minim.elements;

    const member = new MemberElement();
    member.key = new StringElement(name);
    member.value = this.generateElement(property);

    if (property.description) {
      member.description = property.description;
    }

    return member;
  }

  // Generates an enum element for the given enum schema
  generateEnum(schema) {
    const { Array: ArrayElement, Element } = this.minim.elements;

    const element = new Element();
    element.element = 'enum';

    element.attributes.set('enumerations', new ArrayElement(schema.enum));

    return element;
  }

  // Generates an object element from the given object schema
  generateObject(schema) {
    const {
      Array: ArrayElement,
      Object: ObjectElement,
      String: StringElement,
    } = this.minim.elements;

    let properties = schema.properties || {};
    let required = schema.required || [];

    if (schema.allOf && Array.isArray(schema.allOf)) {
      // Merge all of the object allOf into properties and required
      const allOf = schema.allOf.filter(subschema => subschema.type === 'object');

      const allProperties = allOf
        .filter(subschema => subschema.properties)
        .map(subschema => subschema.properties);
      properties = Object.assign(properties, ...allProperties);

      required = allOf
        .filter(subschema => subschema.required)
        .map(subschema => subschema.required)
        .reduce((accumulator, property) => accumulator.concat(property), required);
    }

    const element = new ObjectElement();
    element.content = _.map(properties, (subschema, property) => {
      const member = this.generateMember(property, subschema);

      const isRequired = required.includes(property);
      member.attributes.typeAttributes = new ArrayElement([
        new StringElement(isRequired ? 'required' : 'optional'),
      ]);

      return member;
    });

    return element;
  }

  // Generates an array element from the given array schema
  generateArray(schema) {
    const { Array: ArrayElement } = this.minim.elements;
    const element = new ArrayElement();

    if (schema.items) {
      if (_.isArray(schema.items)) {
        schema.items.forEach((item) => {
          const itemElement = this.generateElement(item);
          if (itemElement) {
            element.push(itemElement);
          }
        });
      } else {
        const itemElement = this.generateElement(schema.items);
        if (itemElement) {
          element.push(itemElement);
        }
      }
    }

    return element;
  }

  // Generates an array of descriptions for each validation rule in the given schema.
  generateValidationDescriptions(schema) {
    const validations = {
      // String
      pattern: value => `Matches regex pattern: \`${value}\``,
      maxLength: value => `Length of string must be less than, or equal to ${value}`,
      minLength: value => `Length of string must be greater than, or equal to ${value}`,

      // Number
      multipleOf: value => `Number must be a multiple of ${value}`,
      maximum: value => `Number must be less than, or equal to ${value}`,
      minimum: value => `Number must be more than, or equal to ${value}`,
      exclusiveMaximum: value => `Number must be less than ${value}`,
      exclusiveMinimum: value => `Number must be more than ${value}`,

      // Object
      minProperties: value => `Object must have more than, or equal to ${value} properties`,
      maxProperties: value => `Object must have less than, or equal to ${value} properties`,

      // Array
      maxItems: value => `Array length must be less than, or equal to ${value}`,
      minItems: value => `Array length must be more than, or equal to ${value}`,
      uniqueItems: () => 'Array contents must be unique',

      // Other
      format: value => `Value must be of format '${value}'`,
    };

    return _
      .chain(validations)
      .map((value, key) => {
        if (schema[key]) {
          return value(schema[key]);
        }

        return null;
      })
      .compact()
      .value();
  }

  // Generates an element representing the given schema
  generateElement(schema) {
    const {
      String: StringElement,
      Number: NumberElement,
      Boolean: BooleanElement,
      Null: NullElement,
      Ref: RefElement,
    } = this.minim.elements;

    const typeGeneratorMap = {
      boolean: BooleanElement,
      string: StringElement,
      number: NumberElement,
      integer: NumberElement,
      null: NullElement,
    };

    let element;

    if (schema['$ref']) {
      const id = schema['$ref'].replace('#/definitions/', '');
      element = new RefElement(id);
    } else if (schema.enum) {
      element = this.generateEnum(schema);
    } else if (schema.type === 'array') {
      element = this.generateArray(schema);
    } else if (schema.type === 'object') {
      element = this.generateObject(schema);
    } else if (schema.type && typeGeneratorMap[schema.type]) {
      element = new typeGeneratorMap[schema.type]();
    } else if (_.isArray(schema.type)) {
      // TODO: Support multiple `type`
    }

    if (element) {
      if (schema.title) {
        element.title = new StringElement(schema.title);
      }

      if (schema.description) {
        element.description = new StringElement(schema.description);
      }

      if (schema.default !== undefined && !_.isArray(schema.default) &&
          !_.isObject(schema.default)) {
        // TODO Support defaults for arrays and objects
        element.attributes.set('default', schema.default);
      }

      if (schema.examples && (schema.type === 'string' || schema.type === 'boolean' || schema.type === 'number')) {
        // TODO examples for array/object or multiple types
        element.attributes.set('samples', schema.examples);
      }

      const validationDescriptions = this.generateValidationDescriptions(schema);

      if (validationDescriptions.length > 0) {
        const description = validationDescriptions.map(value => `- ${value}`);

        if (element.description && element.description.toValue()) {
          description.splice(0, 0, `${element.description.toValue()}\n`);
        }

        element.description = new StringElement(description.join('\n'));
      }
    }

    return element;
  }
}
