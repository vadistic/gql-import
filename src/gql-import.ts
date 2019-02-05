import * as fs from 'fs'
// tslint:disable-next-line:no-implicit-dependencies
import { importSchema } from 'graphql-import'
import * as path from 'path'

import { gql } from './gql-tag'

const DEFAULT_SOURCE_PATH = path.resolve(
  process.cwd(),
  'src/generated/schema.graphql'
)

class GqlImportCache {
  defaultSourcePath = DEFAULT_SOURCE_PATH
  defaultSourceCache: string | undefined

  getSource = (sourcePath: string) => {
    let rawSource: string | undefined
    try {
      rawSource = fs.readFileSync(sourcePath, 'utf-8')
    } catch (err) {
      throw Error(`Could not read source: ${sourcePath} \n${err}`)
    }

    // support usage with graphql-import
    if (importSchema) {
      let parsedSource: string | undefined
      try {
        parsedSource = importSchema(rawSource)
      } catch (err) {
        throw Error(`'graphql-import' error in: ${sourcePath} \n${err}`)
      }
      return parsedSource
    } else {
      // support usage without graphql-import
      return rawSource
    }
  }

  getCache() {
    if (!this.defaultSourceCache) {
      this.defaultSourceCache = this.getSource(this.defaultSourcePath)
    }
    return this.defaultSourceCache
  }

  resetCache() {
    this.defaultSourceCache = undefined
  }

  changeDefaultSource(sourcePath: string) {
    this.defaultSourcePath = sourcePath
    this.resetCache()
  }
}

export const gqlImportCache = new GqlImportCache()

export const resetCache = () => gqlImportCache.resetCache()

export const changeDefaultSource = (sourcePath: string) =>
  gqlImportCache.changeDefaultSource(sourcePath)

type GqlImportSelection = string | string[] | RegExp

class GqlImport {
  typeName = ''
  sourcePath: string | undefined

  private typeBody = ''

  get fields() {
    const result = this.deconstruct().fields.join('\n')
    this.clean()
    return result
  }

  get node() {
    const result = this.typeBody
    this.clean()
    return result
  }

  /** change type source */
  source(source: string) {
    this.sourcePath = source
    return this
  }

  /**
   * Imports type by name
   */
  get(name: string) {
    // in case of Query.name or Mutation.otherName
    const subFieldsNameRegex = /[A-z]+\.[A-z]+/

    if (subFieldsNameRegex.test(name)) {
      throw Error(
        `graphql-import-style submodule imports (Query.typename) are not yet supported`
      )
    }

    const rawSource: string = this.sourcePath
      ? // use getSource() in case of custom source
        gqlImportCache.getSource(this.sourcePath)
      : // use cache in case of default source
        gqlImportCache.getCache()

    const typeBodyRegex = new RegExp(
      `(type|input) ${name} (implements [A-z, ]+ )?{\n(.+\n)+}`,
      'g'
    )

    const typeBodyMatch = rawSource.match(typeBodyRegex)

    if (!typeBodyMatch) {
      throw Error(
        `gqlImport: could not find type: '${name}' in '${this.sourcePath ||
          gqlImportCache.defaultSourcePath}'`
      )
    }

    this.typeName = name
    this.typeBody = typeBodyMatch[0]

    return this
  }

  /**
   *  Pick fields from selected type using strings or RegExp
   */
  pick(names: GqlImportSelection) {
    this.validate()

    const { heading } = this.deconstruct()
    const { fields } = this.getFields(names)

    if (!fields) {
      throw Error(`gqlImport.pick could not match any fields.
        Type '${this.typeName}' matching provided: '${names}'`)
    }

    // rebuild
    this.typeBody = gql`
      ${heading}
        ${fields.join('\n  ')}
      }
    `
    return this
  }

  /**
   *  Omit fields from selected type using strings or RegExp
   */
  omit(names: string[] | string | RegExp) {
    this.validate()

    const { heading } = this.deconstruct()

    const {
      fields: omittedFields,
      fieldNames: ommitedFieldNames
    } = this.getFields(names)

    // get all fields, but parsed the same as ommitted fields
    const { fields, fieldNames } = this.getFields('[A-z_-]+')

    // those typechecks are equivalent it's just lazy typeguard
    if (!omittedFields || !fields || !ommitedFieldNames || !fieldNames) {
      throw Error(`gqlImport.omit could not match any fields.
        Type '${this.typeName}' matching provided: '${names}'`)
    }

    const resultFields = fields.filter(
      (field, i) => !ommitedFieldNames.includes(fieldNames[i])
    )

    this.typeBody = gql`
    ${heading}
      ${resultFields.join('\n  ')}
    }
  `
    return this
  }

  // validate that some type was selected before using pic/omit methods
  private validate() {
    if (this.typeName === '' || this.typeBody === '') {
      throw Error(
        `gqlImport: specify .get(typeName) before chaining other methods!`
      )
    }
  }

  // reset current operation (to be usead with getters)
  private clean() {
    this.typeName = ''
    this.typeBody = ''
    this.sourcePath = undefined
  }

  private getFields(selection: GqlImportSelection) {
    const getFieldsByNameRegex = (name: string) =>
      new RegExp(`(${name})(?:\\(?:[A-z\\s:,!]+\\):|:) [A-z!]+`, 'mg')

    const getFieldNamesbyNameRegex = (name: string) =>
      new RegExp(`(${name})(?=(?:\\(?:[A-z\\s:,!]+\\):|:) [A-z!]+)`, 'mg')

    const normaliseSelection = (_selection: GqlImportSelection) => {
      if (Array.isArray(_selection)) {
        return _selection.join('|')
      } else if (_selection instanceof RegExp) {
        return _selection.source
      } else {
        return _selection
      }
    }

    const normalisedSelection = normaliseSelection(selection)

    // It's better to use global regex because user can provide custom capture groups
    const fieldNames = this.typeBody.match(
      getFieldNamesbyNameRegex(normalisedSelection)
    )
    const fields = this.typeBody.match(
      getFieldsByNameRegex(normalisedSelection)
    )

    return { fields, fieldNames }
  }

  private deconstruct() {
    // match any number of (one line) directives and then TypeDef header
    const typeHeadingRegex = /(((@.+\n)+)?.+{)/g
    // match fields content
    const allFieldsRegex = /([A-z]+(\([^\)]+\))?: .+)/g

    const heading = this.typeBody.match(typeHeadingRegex)
    const fields = this.typeBody.match(allFieldsRegex)

    if (!heading) {
      throw Error(`gqlImport: cannot parse type ${this.typeName}`)
    }

    if (!fields) {
      throw Error(`gqlImport: type ${this.typeName} appear to have no fields`)
    }

    return {
      heading: heading[0],
      fields
    }
  }
}

export const gqlImport = new GqlImport()
