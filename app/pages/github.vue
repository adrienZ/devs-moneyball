<script setup lang="ts">
import { gql } from '@apollo/client/core';
import { useQuery } from '@vue/apollo-composable';

interface Repo {
  name: string;
  stargazerCount: number;
}

interface ViewerData {
  viewer: {
    login: string;
    name: string;
    repositories: {
      nodes: Repo[];
    };
  };
}

const { result, loading, error } = useQuery<ViewerData>(gql`
  query Viewer {
    viewer {
      login
      name
      repositories(orderBy: { field: STARGAZERS, direction: DESC }, first: 5) {
        nodes {
          name
          stargazerCount
        }
      }
    }
  }
`);
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <template v-else>
      <p>Logged in as {{ result?.viewer.login }} ({{ result?.viewer.name }})</p>
      <h2>Top Repositories</h2>
      <ul>
        <li v-for="repo in result?.viewer.repositories.nodes" :key="repo.name">
          {{ repo.name }} (★ {{ repo.stargazerCount }})
        </li>
      </ul>
    </template>
  </div>
</template>
