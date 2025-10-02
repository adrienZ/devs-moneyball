import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,

  schema: "codegen-source.ts",
  documents: ["server/**/*.ts"],

  generates: {
    "codegen/": {
      preset: "client",
      plugins: [],

      // https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#config-api
      config: {
        useTypeImports: true,
        immutableTypes: true,
        maybeValue: "T | null | undefined",
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
