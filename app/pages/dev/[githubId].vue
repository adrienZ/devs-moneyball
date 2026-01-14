<script setup lang="ts">
import { useAsyncData, useLazyAsyncData } from "nuxt/app";
import { shallowRef } from "vue";
import { useRoute } from "vue-router";
import { LazyClientOnly, UTable, UTooltip, UTabs, UAvatar, NuxtTime } from "#components";
import UserCohortModalTrigger from "~/components/UserCohortModalTrigger.vue";
import type { TabsItem, TableColumn } from "@nuxt/ui";

interface PullRequestItem {
  title: string;
  url: string;
  number: number;
  createdAt: string;
  mergedAt: string;
  repository: {
    stars: number;
    nameWithOwner: string;
    url: string;
    ownerAvatarUrl: string;
  };
}

interface RatingsResponse {
  criteria: Array<{
    code: string;
    label: string;
    description: string;
    value: number | null;
    windowWeeks: number;
  }>;
}

const route = useRoute();
const githubId = (route.params as { githubId: string }).githubId;

const { data: user, pending: loading, error } = useAsyncData(
  "user-metrics",
  () => $fetch(`/api/github/users/${githubId}`),
);

const { data: contributions } = useLazyAsyncData(
  "user-contributions",
  () => $fetch<PullRequestItem[]>(
    `/api/github/users/${githubId}/contributions`,
  ),
  {
    default: () => [],
  },
);

const { data: ratings } = useAsyncData<RatingsResponse | null>(
  "user-ratings",
  () => $fetch<RatingsResponse>(`/api/github/users/ratings/${githubId}`),
  {
    default: () => null,
  },
);

const tableColumns: TableColumn<PullRequestItem>[] = [
  { id: "mergedAt", header: "Merged at" },
  { id: "repository", header: "Repository" },
  { id: "commit", header: "Commit" },
  { id: "stars", header: "Stars ⭐️" },
] as const;

const tabsItems = shallowRef<TabsItem[]>([
  {
    label: "Overview",
    icon: "i-lucide-user",
    slot: "overview" as const,

  },
  {
    label: "History",
    icon: "i-lucide-history",
    slot: "history" as const,
  },
]);
</script>

<template>
  <UContainer>
    <div class="mt-6 mb-2">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-primary font-medium hover:underline transition-colors text-base px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
      >
        <UIcon
          name="i-heroicons-arrow-left"
          class="w-4 h-4"
        />
        Back to Home
      </NuxtLink>
    </div>
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
        <h1 class="text-2xl font-bold flex items-center gap-2">
          {{ user.login }}
          <a
            :href="`https://github.com/${user.login}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline text-base font-normal"
            aria-label="View GitHub profile"
          >
            <UIcon
              name="i-simple-icons-github"
              class="inline-block align-middle"
            />
            <span class="sr-only">GitHub</span>
          </a>
        </h1>
        <p class="text-gray-500">
          {{ user?.bio || 'No description provided.' }}
        </p>
      </div>
    </div>

    <UTabs
      v-if="user"
      :items="tabsItems"
      class="w-full gap-0 my-6"
    >
      <template #overview>
        <div class="my-6 grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <!-- LEFT PANEL -->
          <div class="lg:col-span-2 space-y-6">
            <UCard v-if="ratings">
              <h3 class="text-lg font-bold mb-2">
                Ratings
              </h3>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="text-left border-b border-gray-200">
                    <th class="py-2 pr-4 font-semibold">
                      Code
                    </th>
                    <th class="py-2 pr-4 font-semibold">
                      Metric
                    </th>
                    <th class="py-2 pr-4 font-semibold">
                      Note / 20
                    </th>
                    <th class="py-2 font-semibold">
                      Cohort
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="criterion in ratings.criteria"
                    :key="criterion.code"
                    class="border-b border-gray-100"
                  >
                    <td class="py-2 pr-4 font-medium">
                      {{ criterion.code }}
                    </td>
                    <td class="py-2 pr-4">
                      <UTooltip :text="criterion.description">
                        <div>
                          {{ criterion.label }}
                        </div>
                      </UTooltip>
                    </td>
                    <td class="py-2 pr-4 font-semibold">
                      {{ criterion.value ?? "N/A" }}
                    </td>
                    <td class="py-2">
                      <LazyClientOnly>
                        <UserCohortModalTrigger :githubId="githubId" />
                      </LazyClientOnly>
                    </td>
                  </tr>
                </tbody>
              </table>
            </UCard>

            <!-- Overall rating -->
            <UCard>
              <template #header>
                <span class="text-sm">Overall Rating</span>
              </template>
              <div class="flex flex-col items-start">
                <UTooltip :text="`${user?.devScore} / 100`">
                  <UBadge
                    :color="user?.devScore >= 85 ? 'success'
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
          </div>
        </div>
      </template>

      <template #history>
        <UTable
          :data="contributions"
          :columns="tableColumns"
        >
          <template #mergedAt-cell="{ row }">
            <NuxtTime :datetime="row.original.mergedAt" />
          </template>

          <template #commit-cell="{ row }">
            <a
              :href="row.original.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
              :title="row.original.title"
            >
              {{ row.original.title.length > 20 ? row.original.title.slice(0, 20) + '...' : row.original.title }}
            </a>
          </template>

          <template #repository-cell="{ row }">
            <ULink
              :href="row.original.repository.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >

              <UAvatar
                :src="row.original.repository.ownerAvatarUrl"
                size="xs"
              />

              <span class="text-xs ml-2">{{ row.original.repository.nameWithOwner }}</span>
            </ULink>
          </template>

          <template #stars-cell="{ row }">
            <span class="text-sm">{{ row.original.repository.stars }}</span>
          </template>
        </UTable>
      </template>
    </UTabs>
  </UContainer>
</template>
