<script setup lang="ts">
import { useFetch } from 'nuxt/app'
import { ref, computed } from 'vue'
import { NuxtLink, UFormField, UInputNumber, USlider, USelect, UProgress, UAlert } from '#components'

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

const sortFieldOptions = [
  { label: 'Followers', value: 'followers' },
  { label: 'Account Age', value: 'age' },
]
const sortOrderOptions = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' },
]

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
    <UProgress v-if="loading" class="mb-4" />
    <UAlert
      v-if="error"
      color="red"
      :title="`Error: ${error.message}`"
      class="mb-4"
    />
    <h2>Top 50 Users in Paris</h2>
    <div class="filters">
      <UFormField :label="`Min Followers: ${minFollowers ?? 0}`">
        <USlider v-model="minFollowers" :min="0" :max="100000" />
      </UFormField>
      <UFormField label="Max Followers">
        <UInputNumber v-model="maxFollowers" />
      </UFormField>
      <UFormField label="Min Age (years)">
        <UInputNumber v-model="minAge" />
      </UFormField>
      <UFormField label="Max Age (years)">
        <UInputNumber v-model="maxAge" />
      </UFormField>
      <UFormField label="Sort By">
        <USelect v-model="sortField" :options="sortFieldOptions" />
      </UFormField>
      <UFormField label="Order">
        <USelect v-model="sortOrder" :options="sortOrderOptions" />
      </UFormField>
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
  </div>
</template>
