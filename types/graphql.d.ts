declare module '*.gql' {
  import { DocumentNode } from 'graphql';
  const document: DocumentNode;
  export default document;
}

declare module '*.gql?raw' {
  const query: string;
  export default query;
}
