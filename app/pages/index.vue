<script setup lang="ts">
import { useFetch } from 'nuxt/app'
import { ref, computed } from 'vue'
import { NuxtLink } from '#components'

interface User {
  login: string
  followers: { totalCount: number }
  name: string | null
  createdAt: string
}

const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365
const getAge = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / MS_IN_YEAR

const minFollowers = ref<number | undefined>()
const maxFollowers = ref<number | undefined>()
const minAge = ref<number | undefined>()
const maxAge = ref<number | undefined>()
const sortField = ref<'followers' | 'age'>('followers')
const sortOrder = ref<'asc' | 'desc'>('desc')

const { data: users, pending: loading, error } = await useFetch<User[]>('/api/github/popular-users', {
  query: {
    minFollowers,
    maxFollowers,
    minAge,
    maxAge,
    sortField,
    sortOrder,
  },
  watch: [minFollowers, maxFollowers, minAge, maxAge, sortField, sortOrder],
})

const safeUsers = computed(() => users.value || [])
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
      <div class="filters">
        <label>
          Min Followers: {{ minFollowers ?? 0 }}
          <input
            v-model.number="minFollowers"
            type="range"
            min="0"
            max="100000"
          >
        </label>
        <label>
          Max Followers:
          <input
            v-model.number="maxFollowers"
            type="number"
          >
        </label>
        <label>
          Min Age (years):
          <input
            v-model.number="minAge"
            type="number"
          >
        </label>
        <label>
          Max Age (years):
          <input
            v-model.number="maxAge"
            type="number"
          >
        </label>
        <label>
          Sort By:
          <select v-model="sortField">
            <option value="followers">Followers</option>
            <option value="age">Account Age</option>
          </select>
        </label>
        <label>
          Order:
          <select v-model="sortOrder">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>
      <ul>
        <li
          v-for="user in safeUsers"
          :key="user.login"
        >
          <NuxtLink :to="`/dev/${user.login}`">{{ user.login }}</NuxtLink>
          ({{ user.followers.totalCount }} followers, {{ Math.floor(getAge(user.createdAt)) }} years)
        </li>
      </ul>
    </template>
  </div>
</template>
