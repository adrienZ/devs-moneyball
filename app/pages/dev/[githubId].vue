<script setup lang="ts">
import { useFetch } from 'nuxt/app';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

interface UserMetrics {
  login: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
}

const route = useRoute();
const githubId = (route.params as { githubId: string }).githubId;

const { data: user, pending: loading, error } = await useFetch<UserMetrics>(
  `/api/github/users/${githubId}`
);

const followersPerRepo = computed(() => {
  if (user.value && user.value.public_repos > 0) {
    return (user.value.followers / user.value.public_repos).toFixed(2);
  }
  return null;
});

const accountAge = computed(() => {
  if (user.value) {
    const diff = Date.now() - new Date(user.value.created_at).getTime();
    return (diff / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
  }
  return null;
});
</script>

<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <template v-else>
      <h2>{{ user?.login }}</h2>
      <ul>
        <li>Followers: {{ user?.followers }}</li>
        <li>Following: {{ user?.following }}</li>
        <li>Public Repositories: {{ user?.public_repos }}</li>
        <li>Public Gists: {{ user?.public_gists }}</li>
        <li v-if="followersPerRepo !== null">Followers per Repo: {{ followersPerRepo }}</li>
        <li v-if="accountAge !== null">Account Age (years): {{ accountAge }}</li>
        <li>Account Created: {{ user?.created_at }}</li>
      </ul>
    </template>
  </div>
</template>

