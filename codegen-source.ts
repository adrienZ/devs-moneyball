// // @ts-expect-error we are not supposed to do commonjs but it is what it is
module.exports = import("@octokit/graphql-schema").then(({ schema }) => schema.json);
