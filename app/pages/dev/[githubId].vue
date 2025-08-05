<script setup lang="ts">
import { useFetch } from 'nuxt/app'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import TheChart from '~/components/TheChart.vue'
import { UTable, UTooltip } from '#components'

interface UserMetrics {
  login: string
  followers: number
  following: number
  public_repos: number
  public_gists: number
  created_at: string
  totalStars: number
  totalForks: number
  avgStarsPerRepo: number
  topLanguages: string[]
  devScore: number
  letter: string
  summary: string
  criteria: Record<string, number>
  pros: string[]
  cons: string[]
}

const route = useRoute()
const githubId = (route.params as { githubId: string }).githubId

const { data: user, pending: loading, error } = await useFetch<UserMetrics>(
  `/api/github/users/${githubId}`,
)

const followersPerRepo = computed(() => {
  if (user.value && user.value.public_repos > 0) {
    return (user.value.followers / user.value.public_repos).toFixed(2)
  }
  return null
})

const accountAge = computed(() => {
  if (user.value) {
    const diff = Date.now() - new Date(user.value.created_at).getTime()
    return (diff / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
  }
  return null
})

// const formattedCreatedAt = computed(() => {
//   if (user.value) {
//     return new Date(user.value.created_at).toLocaleDateString(undefined, {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//     })
//   }
//   return null
// })

const starsPerRepo = computed(() => {
  if (user.value) {
    return user.value.avgStarsPerRepo.toFixed(2)
  }
  return null
})

const keyMetrics = computed(() => ({
  'Total Stars': user.value?.totalStars,
  'Total Forks': user.value?.totalForks,
  'Average Stars per Repo': starsPerRepo.value,
  'Followers per Repo': followersPerRepo.value,
  'Account Age (years)': accountAge.value,
  'Top Languages': user.value?.topLanguages.join(', '),
}))

const rows = computed(() => {
  return Object.entries(keyMetrics.value).map(([key, value]) => ({
    metric: key,
    value,
  }))
})
</script>

<template>
  <UContainer>
    <UAlert
      v-if="loading"
      color="primary"
      class="mb-6"
    >
      Loading...
    </UAlert>
    <UAlert
      v-else-if="error"
      color="error"
      class="mb-6"
    >
      Error loading user data.
    </UAlert>
    <!-- Header section: avatar and username -->
    <div
      v-if="user"
      class="flex items-center space-x-4 mt-8"
    >
      <img
        :src="`https://github.com/${user.login}.png`"
        alt="avatar"
        class="w-16 h-16 rounded-full border"
      >
      <div>
        <h1 class="text-2xl font-bold">
          {{ user.login }}
        </h1>
        <p class="text-gray-500">
          GitHub Developer Profile
        </p>
      </div>
    </div>
    <div
      v-if="user"
      class="grid lg:grid-cols-3 gap-6 py-6 max-w-7xl mx-auto"
    >
      <!-- LEFT PANEL -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Overall rating -->
        <UCard>
          <template #header>
            <span class="text-sm">Overall Rating</span>
          </template>
          <div class="flex flex-col items-start">
            <UTooltip :text="`${user?.devScore} / 100`">
              <UBadge
                :color="
                  user?.devScore >= 85 ? 'success'
                  : user?.devScore >= 70 ? 'warning'
                    : user?.devScore >= 50 ? 'secondary'
                      : 'error'
                "
                size="md"
                class="text-2xl font-bold px-4 py-2 mb-2"
              >
                {{ user?.letter }}
              </UBadge>
            </UTooltip>
            <span class="mt-2 text-yellow-400 font-medium">{{ user?.summary }}</span>
          </div>
        </UCard>

        <!-- Pros -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-bold mb-2">
              Pros
            </h3>
          </template>
          <ul class="space-y-2">
            <li
              v-for="pro in user?.pros"
              :key="pro"
              class="flex items-center"
            >
              <UIcon
                name="i-heroicons-check-circle-solid"
                class="text-green-500 mr-2"
              />
              <span class="text-green-700">{{ pro }}</span>
            </li>
          </ul>
        </UCard>

        <!-- Cons -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-bold mb-2">
              Cons
            </h3>
          </template>
          <ul class="space-y-2">
            <li
              v-for="con in user?.cons"
              :key="con"
              class="flex items-center"
            >
              <UIcon
                name="i-heroicons-x-circle-solid"
                class="text-red-500 mr-2"
              />
              <span class="text-red-700">{{ con }}</span>
            </li>
          </ul>
        </UCard>
      </div>

      <!-- RIGHT PANEL -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Radar Chart -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-bold">
              Criteria Breakdown
            </h3>
          </template>
          <div class="max-w-md mx-auto">
            <TheChart
              :criteria="user?.criteria"
              :dark="true"
            />
          </div>
        </UCard>

        <!-- Key Metrics Table -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-bold">
              Key Metrics
            </h3>
          </template>
          <UTable :data="rows" />
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
