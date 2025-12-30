<script setup lang="ts">
import { useAsyncData, useLazyAsyncData } from "nuxt/app";
import { useRoute } from "vue-router";
import { computed, shallowRef } from "vue";
import TheChart from "~/components/TheChart.vue";
import { UTable, UTooltip, UTabs, UAvatar, NuxtTime } from "#components";
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

interface PullRequestsStats {
  login: string;
  name?: string | null;
  contributionsCollection: {
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
  };
  pullRequests: { totalCount: number };
  mergedPullRequests: { totalCount: number };
  closedPullRequests: { totalCount: number };
  openPullRequests: { totalCount: number };
}

interface RatingsResponse {
  criteria: Array<{
    code: string;
    label: string;
    description: string;
    value: number | null;
  }>;
  cohort: {
    size: number;
    min: number | null;
    max: number | null;
    median: number | null;
    average: number | null;
  };
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

const { data: pullRequestsStats } = useAsyncData<PullRequestsStats | null>(
  "user-pull-requests",
  () => $fetch<PullRequestsStats>(
    `/api/github/users/pull-requests/${githubId}`,
  ),
  {
    default: () => null,
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

const starsPerRepo = computed(() => {
  if (user.value) {
    return user.value.avgStarsPerRepo.toFixed(2);
  }
  return null;
});

const keyMetrics = computed(() => ({
  "Total Stars": user.value?.totalStars,
  "Total Forks": user.value?.totalForks,
  "Average Stars per Repo": starsPerRepo.value,
  "Followers per Repo": followersPerRepo.value,
  "Account Age (years)": accountAge.value,
  "Top Languages": user.value?.topLanguages.join(", "),
}));

const rows = computed(() => {
  return Object.entries(keyMetrics.value).map(([key, value]) => ({
    metric: key,
    value,
  }));
});

const pullRequestsRows = computed(() => {
  if (!pullRequestsStats.value) return [] as Array<{ metric: string; value: number }>;
  return [
    { metric: "Total PRs", value: pullRequestsStats.value.pullRequests.totalCount },
    { metric: "Merged PRs", value: pullRequestsStats.value.mergedPullRequests.totalCount },
    { metric: "Open PRs", value: pullRequestsStats.value.openPullRequests.totalCount },
    { metric: "Closed PRs", value: pullRequestsStats.value.closedPullRequests.totalCount },
    { metric: "PR Contributions", value: pullRequestsStats.value.contributionsCollection.totalPullRequestContributions },
    { metric: "PR Reviews", value: pullRequestsStats.value.contributionsCollection.totalPullRequestReviewContributions },
  ];
});

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
                    <th class="py-2 font-semibold">
                      Note / 20
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
                        <div> {{ criterion.label }}</div>
                      </UTooltip>
                    </td>
                    <td class="py-2 font-semibold">
                      {{ criterion.value ?? "N/A" }}
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

            <!-- Pull Requests Stats Table -->
            <UCard v-if="pullRequestsStats">
              <template #header>
                <h3 class="text-lg font-bold">
                  Pull Requests
                </h3>
              </template>
              <UTable :data="pullRequestsRows" />
            </UCard>

            <UCard v-if="ratings?.cohort">
              <template #header>
                <h3 class="text-lg font-bold">
                  Cohort Summary (PRs)
                </h3>
              </template>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-muted">
                    Size
                  </div>
                  <div class="font-semibold">
                    {{ ratings.cohort.size }}
                  </div>
                </div>
                <div>
                  <div class="text-muted">
                    Min
                  </div>
                  <div class="font-semibold">
                    {{ ratings.cohort.min ?? "N/A" }}
                  </div>
                </div>
                <div>
                  <div class="text-muted">
                    Median
                  </div>
                  <div class="font-semibold">
                    {{ ratings.cohort.median ?? "N/A" }}
                  </div>
                </div>
                <div>
                  <div class="text-muted">
                    Max
                  </div>
                  <div class="font-semibold">
                    {{ ratings.cohort.max ?? "N/A" }}
                  </div>
                </div>
                <div>
                  <div class="text-muted">
                    Average
                  </div>
                  <div class="font-semibold">
                    {{ ratings.cohort.average?.toFixed(1) ?? "N/A" }}
                  </div>
                </div>
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
