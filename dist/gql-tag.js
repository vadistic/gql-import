"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Noop gql-tag replacement - flattens interpolations and returns string
 */
exports.gql = (literals, ...interpolations) => {
    let output = '';
    let index;
    for (index = 0; index < interpolations.length; index++) {
        output += literals[index] + interpolations[index];
    }
    output += literals[index];
    return output.trim();
};
//# sourceMappingURL=gql-tag.js.map