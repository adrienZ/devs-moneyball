import type { DocumentNode } from 'graphql';
import PopularUsers from './popularUsers.gql';

export type PopularUsersQuery = {
  search: {
    nodes: Array<{
      login: string;
      name: string | null;
      followers: {
        totalCount: number;
      };
    } | null>;
  };
};

export type PopularUsersQueryVariables = Record<string, never>;

export type TypedDocumentNode<Result, Variables> = DocumentNode & {
  __resultType?: Result;
  __variablesType?: Variables;
};

export const PopularUsersDocument = PopularUsers as TypedDocumentNode<
  PopularUsersQuery,
  PopularUsersQueryVariables
>;
