// ensuring 'graphql-import is mocked
jest.mock('graphql-import', () => ({
  'graphql-import': undefined
}))

import { changeDefaultSource, gqlImport } from '../src/gql-import'
import { gql } from '../src/gql-tag'
import { normaliseString } from './utils'

describe('gql-import dependencies', () => {
  const FIXTURE_SOURCE_PATH = './test/fixture.graphql'
  changeDefaultSource(FIXTURE_SOURCE_PATH)

  it('works without graphql-import', () => {
    jest.mock('graphql-import', () => ({
      'graphql-import': undefined
    }))

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
})
