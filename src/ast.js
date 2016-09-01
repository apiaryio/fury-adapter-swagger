// A module for dealing with YAML syntax trees and looking up source map
// location information.

import _ from 'lodash';
import yamlAst from 'yaml-js';

export default class Ast {
  constructor(source) {
    this.root = yamlAst.compose(source);
  }

  // Look up a position in the original source based on a JSON path, for
  // example ['paths', '/test', 'get', 'responses', '200']. Also supported
  // is using a string ('paths./test.get') but it does not understand any
  // escaping.
  getPosition(path) {
    const pieces = _.isArray(path) ? [].concat(path) : path.split('.');
    let end;
    let node = this.root;
    let piece = pieces.shift();
    let start;

    if (!node) {
      return null;
    }

    while (piece !== undefined) {
      let newNode = null;

      if (node.tag === 'tag:yaml.org,2002:map') {
        // This is a may / object with key:value pairs.
        for (const subNode of node.value) {
          if (subNode[0] && subNode[0].value === piece) {
            newNode = subNode[1];

            if (!pieces.length) {
              // This is the last item!
              start = subNode[0].start_mark.pointer;
              end = subNode[1].end_mark.pointer;
            }
            break;
          } else if (subNode[0] && subNode[0].value === '$ref') {
            if (subNode[1].value.indexOf('#') === 0) {
              // This is an internal reference! First, we reset the node to the
              // root of the document, shift the ref item off the pieces stack
              // and then add the referenced path to the pieces.
              const refPaths = subNode[1].value.substr(2).split('/');
              newNode = this.root;
              Array.prototype.unshift.apply(pieces, refPaths.concat([piece]));
              break;
            } else {
              /* eslint-disable no-console */
              // TODO: Communicate this in some other way?
              console.log(`External reference ${subNode[1].value} not supported for source maps!`);
              /* eslint-enable no-console */
            }
          }
        }
      } else if (node.tag === 'tag:yaml.org,2002:seq') {
        // This is a sequence, i.e. array. Access it by index.
        newNode = node.value[piece];

        if (!pieces.length) {
          // This is the last item!

          if (!newNode && piece > 0 && node.value[piece - 1]) {
            // Element in sequence does not exist. It could have been empty
            // Let's provide the end of previous element
            const previousNode = node.value[piece - 1];
            start = previousNode.end_mark.pointer;
            end = start + 1;
          } else {
            start = newNode.start_mark.pointer;
            end = newNode.end_mark.pointer;
          }
        }
      } else {
        // Unknown piece, which will just return no source map.
      }

      if (newNode) {
        node = newNode;
      } else {
        return null;
      }

      piece = pieces.shift();
    }

    return {start, end};
  }
}
