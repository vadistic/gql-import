"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
// tslint:disable-next-line:no-implicit-dependencies
const graphql_import_1 = require("graphql-import");
const path = __importStar(require("path"));
const gql_tag_1 = require("./gql-tag");
const DEFAULT_SOURCE_PATH = path.resolve(process.cwd(), 'src/generated/schema.graphql');
class GqlImportCache {
    constructor() {
        this.defaultSourcePath = DEFAULT_SOURCE_PATH;
        this.getSource = (sourcePath) => {
            let rawSource;
            try {
                rawSource = fs.readFileSync(sourcePath, 'utf-8');
            }
            catch (err) {
                throw Error(`Could not read source: ${sourcePath} \n${err}`);
            }
            // support usage with graphql-import
            if (graphql_import_1.importSchema) {
                let parsedSource;
                try {
                    parsedSource = graphql_import_1.importSchema(rawSource);
                }
                catch (err) {
                    throw Error(`'graphql-import' error in: ${sourcePath} \n${err}`);
                }
                return parsedSource;
            }
            else {
                // support usage without graphql-import
                return rawSource;
            }
        };
    }
    getCache() {
        if (!this.defaultSourceCache) {
            this.defaultSourceCache = this.getSource(this.defaultSourcePath);
        }
        return this.defaultSourceCache;
    }
    resetCache() {
        this.defaultSourceCache = undefined;
    }
    changeDefaultSource(sourcePath) {
        this.defaultSourcePath = sourcePath;
        this.resetCache();
    }
}
exports.gqlImportCache = new GqlImportCache();
exports.resetCache = () => exports.gqlImportCache.resetCache();
exports.changeDefaultSource = (sourcePath) => exports.gqlImportCache.changeDefaultSource(sourcePath);
class GqlImport {
    constructor() {
        this.typeName = '';
        this.typeBody = '';
    }
    get fields() {
        const result = this.deconstruct().fields.join('\n');
        this.clean();
        return result;
    }
    get node() {
        const result = this.typeBody;
        this.clean();
        return result;
    }
    /** change type source */
    source(source) {
        this.sourcePath = source;
        return this;
    }
    /**
     * Imports type by name
     */
    get(name) {
        // in case of Query.name or Mutation.otherName
        const subFieldsNameRegex = /[A-z]+\.[A-z]+/;
        if (subFieldsNameRegex.test(name)) {
            throw Error(`graphql-import-style submodule imports (Query.typename) are not yet supported`);
        }
        const rawSource = this.sourcePath
            ? // use getSource() in case of custom source
                exports.gqlImportCache.getSource(this.sourcePath)
            : // use cache in case of default source
                exports.gqlImportCache.getCache();
        const typeBodyRegex = new RegExp(`(type|input) ${name} (implements [A-z, ]+ )?{\n(.+\n)+}`, 'g');
        const typeBodyMatch = rawSource.match(typeBodyRegex);
        if (!typeBodyMatch) {
            throw Error(`gqlImport: could not find type: '${name}' in '${this.sourcePath ||
                exports.gqlImportCache.defaultSourcePath}'`);
        }
        this.typeName = name;
        this.typeBody = typeBodyMatch[0];
        return this;
    }
    /**
     *  Pick fields from selected type using strings or RegExp
     */
    pick(names) {
        this.validate();
        const { heading } = this.deconstruct();
        const { fields } = this.getFields(names);
        if (!fields) {
            throw Error(`gqlImport.pick could not match any fields.
        Type '${this.typeName}' matching provided: '${names}'`);
        }
        // rebuild
        this.typeBody = gql_tag_1.gql `
      ${heading}
        ${fields.join('\n  ')}
      }
    `;
        return this;
    }
    /**
     *  Omit fields from selected type using strings or RegExp
     */
    omit(names) {
        this.validate();
        const { heading } = this.deconstruct();
        const { fields: omittedFields, fieldNames: ommitedFieldNames } = this.getFields(names);
        // get all fields, but parsed the same as ommitted fields
        const { fields, fieldNames } = this.getFields('[A-z_-]+');
        // those typechecks are equivalent it's just lazy typeguard
        if (!omittedFields || !fields || !ommitedFieldNames || !fieldNames) {
            throw Error(`gqlImport.omit could not match any fields.
        Type '${this.typeName}' matching provided: '${names}'`);
        }
        const resultFields = fields.filter((field, i) => !ommitedFieldNames.includes(fieldNames[i]));
        this.typeBody = gql_tag_1.gql `
    ${heading}
      ${resultFields.join('\n  ')}
    }
  `;
        return this;
    }
    // validate that some type was selected before using pic/omit methods
    validate() {
        if (this.typeName === '' || this.typeBody === '') {
            throw Error(`gqlImport: specify .get(typeName) before chaining other methods!`);
        }
    }
    // reset current operation (to be usead with getters)
    clean() {
        this.typeName = '';
        this.typeBody = '';
        this.sourcePath = undefined;
    }
    getFields(selection) {
        const getFieldsByNameRegex = (name) => new RegExp(`(${name})(?:\\(?:[A-z\\s:,!]+\\):|:) [A-z!]+`, 'mg');
        const getFieldNamesbyNameRegex = (name) => new RegExp(`(${name})(?=(?:\\(?:[A-z\\s:,!]+\\):|:) [A-z!]+)`, 'mg');
        const normaliseSelection = (_selection) => {
            if (Array.isArray(_selection)) {
                return _selection.join('|');
            }
            else if (_selection instanceof RegExp) {
                return _selection.source;
            }
            else {
                return _selection;
            }
        };
        const normalisedSelection = normaliseSelection(selection);
        // It's better to use global regex because user can provide custom capture groups
        const fieldNames = this.typeBody.match(getFieldNamesbyNameRegex(normalisedSelection));
        const fields = this.typeBody.match(getFieldsByNameRegex(normalisedSelection));
        return { fields, fieldNames };
    }
    deconstruct() {
        // match any number of (one line) directives and then TypeDef header
        const typeHeadingRegex = /(((@.+\n)+)?.+{)/g;
        // match fields content
        const allFieldsRegex = /([A-z]+(\([^\)]+\))?: .+)/g;
        const heading = this.typeBody.match(typeHeadingRegex);
        const fields = this.typeBody.match(allFieldsRegex);
        if (!heading) {
            throw Error(`gqlImport: cannot parse type ${this.typeName}`);
        }
        if (!fields) {
            throw Error(`gqlImport: type ${this.typeName} appear to have no fields`);
        }
        return {
            heading: heading[0],
            fields
        };
    }
}
exports.gqlImport = new GqlImport();
//# sourceMappingURL=gql-import.js.map