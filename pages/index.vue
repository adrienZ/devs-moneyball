<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useFetch } from '#imports'

const { data, pending, error } = await useFetch('/api/github/top-paris')
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Top 50 Developers in Paris</h1>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error" class="text-red-500">Error: {{ error.message }}</div>
    <ul v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <li
        v-for="dev in data"
        :key="dev.login"
        class="p-4 border rounded-lg flex flex-col items-center"
      >
        <img :src="dev.avatarUrl" alt="" class="w-16 h-16 rounded-full mb-2" />
        <p class="font-semibold">{{ dev.name || dev.login }}</p>
        <p class="text-gray-500">@{{ dev.login }}</p>
        <p class="text-sm text-gray-600">{{ dev.followers.totalCount }} followers</p>
      </li>
    </ul>
  </div>
</template>
