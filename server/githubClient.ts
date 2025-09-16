import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { graphql as octo } from "@octokit/graphql";
import { print } from "graphql";
import { useRuntimeConfig } from "#imports";
import type { RequestParameters } from "@octokit/graphql/types";

export function getGithubClient() {
  const config = useRuntimeConfig();
  const client = octo.defaults({
    headers:
    {
      authorization: `Bearer ${config.public.githubToken}`,
    },
  });

  async function call<TData, TVars extends RequestParameters>(
    doc: TypedDocumentNode<TData, TVars>,
    vars: TVars,
  ): Promise<TData> {
    return client<TData>(print(doc), vars);
  };

  return { call };
}
