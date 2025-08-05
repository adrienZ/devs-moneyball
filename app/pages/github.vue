<script setup lang="ts">
import { useQuery } from '@vue/apollo-composable';
import { PopularUsersDocument } from '~/graphql/generated';

const { result, loading, error } = useQuery(PopularUsersDocument);
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <template v-else>
      <h2>Top 50 Users in Paris</h2>
      <ul>
        <li v-for="user in result?.search.nodes" :key="user.login">
          {{ user.login }} ({{ user.followers.totalCount }} followers)
        </li>
      </ul>
    </template>
  </div>
</template>
