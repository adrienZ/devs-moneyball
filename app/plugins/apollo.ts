import { defineNuxtPlugin, useRuntimeConfig } from "nuxt/app";
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { DefaultApolloClient } from "@vue/apollo-composable";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const httpLink = createHttpLink({
    uri: "https://api.github.com/graphql",
  });

  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      authorization: `Bearer ${config.public.githubToken}`,
    },
  }));

  const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });

  nuxtApp.vueApp.provide(DefaultApolloClient, apolloClient);
});
