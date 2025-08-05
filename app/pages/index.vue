<script setup lang="ts">
import { useFetch } from 'nuxt/app'
import { NuxtLink } from '#components'

interface User {
  login: string
  followers: { totalCount: number }
  name: string | null
}

interface PopularUsersQuery {
  search: { nodes: (User | null)[] }
}

const { data: result, pending: loading, error } = await useFetch<PopularUsersQuery>('/api/github/popular-users')
</script>

<template>
  <div>
    <p v-if="loading">
      Loading...
    </p>
    <p v-else-if="error">
      Error: {{ error.message }}
    </p>
    <template v-else>
      <h2>Top 50 Users in Paris</h2>
      <ul>
        <li
          v-for="user in result?.search.nodes || []"
          :key="user?.login"
        >
          <NuxtLink :to="`/dev/${user?.login}`">{{ user?.login }}</NuxtLink>
          ({{ user?.followers.totalCount }} followers)
        </li>
      </ul>
    </template>
  </div>
</template>
