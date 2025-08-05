import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://raw.githubusercontent.com/octokit/graphql-schema/master/schema.graphql',
  documents: ['app/graphql/**/*.gql'],
  generates: {
    'app/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
};

export default config;
