import { gql } from '../src/gql-tag'
import { normaliseString } from './utils'

describe('gql-tag', () => {
  it('returns corect string from literal template', () => {
    const fixture = gql`
      type Test {
        id: ID!
        name: String
      }
    `

    const result = `
    type Test {
      id: ID!
      name: String
    }
    `

    expect(normaliseString(fixture)).toBe(normaliseString(result))
  })

  it('resolves interpolations', () => {
    const interpolatedVal = 'String!'

    const fixture = gql`
      type Test {
        id: ID!
        name: ${interpolatedVal}
      }
    `

    const result = `
    type Test {
      id: ID!
      name: String!
    }
    `

    expect(normaliseString(fixture)).toBe(normaliseString(result))
  })
})
