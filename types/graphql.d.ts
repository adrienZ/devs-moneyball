declare module '*.gql' {
  import type { DocumentNode } from 'graphql'

  const document: DocumentNode
  export default document
}

declare module '*.gql?raw' {
  const query: string
  export default query
}
