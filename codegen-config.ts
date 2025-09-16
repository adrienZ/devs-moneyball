import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,

  schema: "codegen-source.ts",
  documents: ["server/**/*.ts"],

  generates: {
    "codegen/": {
      preset: "client",
      plugins: [],

      // not sure what it does
      config: {
        useTypeImports: true,
        immutableTypes: true,
        skipTypename: true,
        maybeValue: "T | null | undefined",
      },
    },
  },
};

export default config;
