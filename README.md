# gql-impo‍rt

> Regex-powered tool for reusable GraphQL SDL 🤹‍♂️

- No dependencies (`graphql-import` is optional)
- No cryptic errors
- Tested
- TypeScript

## Why

I wanted to reuse parts of large auto-generated schema from [Prisma](https://github.com/prisma/prisma) without pain of maintaining all details. Using Graphql-in-ts approach I can do powerful schema manipulation without risking bugs or out-of-sync schema.

### Few ideas of possibilities

- Shared definitions for both `input` and `type` objects
- Modifying schemas before delegation
- Fake interfaces without complicated resolvers and caching
- Creating fragments or fake-fragments
- Choosing schema functionalities via config

I mean, this make sense, yeah?

## Installation

From git tag

```sh
  yarn add vadistic/gql-import# gql-import-v0.1.0-gitpkg

  # or as devDep if schema is compiled and saved
```

## Features

### Import whole type `.node`

```ts
const post = gql`
  ${gqlImport.get('Post').node}
`

// or

const _post = gqlImport.get('Post').node
```

### Or just its `.fields`

> useful for mixins or creating fake interfaces/ fragments

```ts
const article = gql`
  type Article {
    ${gqlImport.get('Post').fields}
  }

`
```

### From cached default source

> useful for pointing to your single generated schema

```ts
import {changeDefaultSource} from 'gql-import'

// somewhere before using this util

changeDefaultSource('./src/generated/schema.graphql)
```

### But it can be overridden on the go

```ts
// not persistent!
const post = gqlImport.source('./src/post.graphql').get('Post').node
```

### `.pick` just some fields

```ts
const article = gql`
  type Article {
    ${gqlImport.get('Post').pick('author').fields}
  }
`
```

### Or `.omit` some

```ts
const article = gql`
  type User {
    ${gqlImport.get('User').omit('password').fields}
    myApiField: String
  }
`
```

### And chain it (if you can find use-case for it)

```ts
const user = gqlImport
  .get('User')
  .pick('meta.*')
  .omit('metaPassword').node
```

### Using regex or strings for selectors

`FieldSelectors = string | string[] | RegExp | regexInString`

```ts
const article = gql`
  type User {
    ${gqlImport.get('User').omit('password').fields}
    ${gqlImport.get('Person').pick(['name', 'photo']).fields}
    ${gqlImport.get('Person').pick(/(created|deleted).*/).fields}
    myApiField: String
  }
`
```

### While keeping it stringified with noop `gql-tag`

This tool is meant for editing server-side schemas with graphql-in-ts approach and parsing your schema to `DocumentNode`s with [graphql-tag](https://github.com/apollographql/graphql-tag) is just not necessary (i.e. you can just use `parse` from [graphql](https://github.com/graphql/graphql-js) on the last step to create typeDefs).

```ts
import { gql } from 'gql-import'

const mixin = gql`/* ... */`

const stringSchema: string = gql`
type User {
  id: ID!
  ${mixin}
}
`
```

### With or without graphql-import

With [graphql-import](https://github.com/prisma/graphql-import) installed this util will use it to load specified source (allowing usage of #import declarations there) - but it's `optionalDependency`.

### Enjoing debuggable error reporting

- Cannot locate source S
- Specified type T not found in S
- Picked/Omitted fields F not found in type T
- Pick/Omit before specifying type (only stacktrace 😅)
- etc...

Which makes updates after datamodel changes a breeze

## TODO

- option to allow some invalid actions?
- polish API
- test edge cases
- publish?
