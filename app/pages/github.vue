<script setup lang="ts">
import { gql } from '@apollo/client/core';
import { useQuery } from '@vue/apollo-composable';

const { result, loading, error } = useQuery(gql`
  query Viewer {
    viewer {
      login
      name
    }
  }
`);
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <p v-else>Logged in as {{ result?.viewer.login }} ({{ result?.viewer.name }})</p>
  </div>
</template>
