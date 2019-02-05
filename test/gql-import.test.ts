import fs from 'fs'
import {
  changeDefaultSource,
  gqlImport,
  gqlImportCache,
  resetCache
} from '../src/gql-import'
import { gql } from '../src/gql-tag'
import { normaliseString } from './utils'

describe('gql-import cache', () => {
  const FIXTURE_SOURCE_PATH = './test/fixture.graphql'
  changeDefaultSource(FIXTURE_SOURCE_PATH)

  it('changes default source', () => {
    const newDefaultSourcePath = gqlImportCache.defaultSourcePath

    expect(newDefaultSourcePath).toMatch(`/test/fixture.graphql`)
  })

  it('initial cache is clean', () => {
    const initalCache = gqlImportCache.defaultSourceCache

    expect(initalCache).toBe(undefined)
  })

  it('cache gets, well cached, after any get operation', () => {
    gqlImport.get('Post')

    const cache = gqlImportCache.defaultSourceCache as string

    const result = fs.readFileSync(FIXTURE_SOURCE_PATH, 'utf-8')

    expect(normaliseString(cache).length).toBe(normaliseString(result).length)
  })

  it('cache can be resetted', () => {
    resetCache()
    const cache = gqlImportCache.defaultSourceCache

    expect(cache).toBe(undefined)
  })
})

describe('gql-import get type', () => {
  const FIXTURE_SOURCE_PATH = './test/fixture.graphql'
  changeDefaultSource(FIXTURE_SOURCE_PATH)

  it('get node', () => {
    const fixture = gql`
      type Post {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        published: Boolean!
        title: String!
        content: String
        author: User!
      }
    `

    const result = gql`
      ${gqlImport.get('Post').node}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('get fields', () => {
    const fixture = gql`
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        published: Boolean!
        title: String!
        content: String
        author: User!
    `

    const result = gql`
      ${gqlImport.get('Post').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('get from custom source', () => {
    const fixture = gql`
      type UniquePost {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        published: Boolean!
        title: String!
        content: String
        author: User!
      }
    `

    const result = gql`
      ${gqlImport.source('test/another-fixture.graphql').get('UniquePost').node}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('dissallow submodule imports', () => {
    expect(() => {
      const submodule = gqlImport.get('Query.Post').node
    }).toThrow()
  })

  it('report type not found error', () => {
    expect(() => {
      const notFound = gqlImport.get('Cumulus').node
    }).toThrowError('find')
  })
})

const sourcePreview = gql`
  type Post {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    published: Boolean!
    title: String!
    content: String
    author: User!
  }
`

describe('gql-import pick & omit', () => {
  const FIXTURE_SOURCE_PATH = './test/fixture.graphql'
  changeDefaultSource(FIXTURE_SOURCE_PATH)

  it('pick works', () => {
    const fixture = gql`
        createdAt: DateTime!
    `

    const result = gql`
      ${gqlImport.get('Post').pick('createdAt').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('omit works', () => {
    const fixture = gql`
      id: ID!
      updatedAt: DateTime!
      published: Boolean!
      title: String!
      content: String
      author: User!
    `

    const result = gql`
      ${gqlImport.get('Post').omit('createdAt').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('omit > pick works', () => {
    const fixture = gql`
        updatedAt: DateTime!
    `

    const result = gql`
      ${gqlImport
        .get('Post')
        .pick('.+At')
        .omit('createdAt').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('cannot pick without specifying type', () => {
    expect(() => {
      const unspecifiedType = gqlImport.pick('something').node
    }).toThrowError('get')
  })

  it('cannot ommit without specifying type', () => {
    expect(() => {
      const unspecifiedType = gqlImport.pick('something').node
    }).toThrowError('get')
  })
})

describe('gql-import pick & omit selections input', () => {
  const FIXTURE_SOURCE_PATH = './test/fixture.graphql'
  changeDefaultSource(FIXTURE_SOURCE_PATH)

  it('pick by string', () => {
    const fixture = gql`
        createdAt: DateTime!
    `

    const result = gql`
      ${gqlImport.get('Post').pick('createdAt').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('pick by regex provided as string', () => {
    const fixture = gql`
        createdAt: DateTime!
        updatedAt: DateTime!
    `

    const result = gql`
      ${gqlImport.get('Post').pick('.+At').fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('pick by regex as instance of RegExp', () => {
    const fixture = gql`
        createdAt: DateTime!
        updatedAt: DateTime!
    `

    const result = gql`
      ${gqlImport.get('Post').pick(/.+At/).fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })

  it('pick by array of string names', () => {
    const fixture = gql`
        createdAt: DateTime!
        updatedAt: DateTime!
    `

    const result = gql`
      ${gqlImport.get('Post').pick(['createdAt', 'updatedAt']).fields}
    `

    expect(normaliseString(result)).toBe(normaliseString(fixture))
  })
})
