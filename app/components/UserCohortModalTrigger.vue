<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLazyFetch } from "nuxt/app";
import { ClientOnly, UAlert, UButton, UModal, UProgress } from "#components";
import CohortPullRequestsChart from "~/components/CohortPullRequestsChart.vue";

interface CohortPullRequestPoint {
  login: string;
  pullRequestsCount: number;
}

interface PullRequestsStats {
  login: string;
  pullRequests: { totalCount: number };
}

interface CohortPullRequestsResponse {
  cohort: CohortPullRequestPoint[];
  cohortKeyNumbers: {
    size: number;
    min: number | null;
    max: number | null;
    median: number | null;
    average: number | null;
  };
  current: PullRequestsStats | null;
  lookbackWeeks: number;
}

const props = defineProps<{
  githubId: string;
}>();

const open = ref(false);

const { data, pending, error, execute, status } = useLazyFetch<CohortPullRequestsResponse>(
  "/api/github/users/cohort/pull-request-cohort-points",
  {
    query: { username: props.githubId },
    immediate: false,
    server: false,
    default: () => ({
      cohort: [],
      cohortKeyNumbers: {
        size: 0,
        min: null,
        max: null,
        median: null,
        average: null,
      },
      current: null,
      lookbackWeeks: 0,
    }),
  },
);

watch(open, (value) => {
  if (value && status.value === "idle") {
    execute();
  }
});

const cohortPoints = computed(() => data.value?.cohort ?? []);
const currentPullRequests = computed(() => data.value?.current ?? null);
const cohortKeyNumbers = computed(() => data.value?.cohortKeyNumbers ?? null);
const lookbackWeeks = computed(() => data.value?.lookbackWeeks ?? 0);
const hasData = computed(() => status.value === "success");
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Cohort data for ${githubId}`"
    description="Cohort merged pull request chart and summary."
  >
    <UButton
      icon="i-lucide-chart-scatter"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="View cohort data"
    />

    <template #body>
      <div class="space-y-4">
        <div
          v-if="pending"
          class="flex flex-col items-center justify-center gap-3 py-6"
        >
          <UProgress class="w-full" />
          <p class="text-sm text-muted">
            Loading cohort data...
          </p>
        </div>
        <UAlert
          v-else-if="error"
          color="error"
          :title="`Error: ${error.message}`"
        />
        <template v-else-if="hasData">
          <ClientOnly>
            <CohortPullRequestsChart
              :cohort="cohortPoints"
              :current="currentPullRequests"
              :githubId="githubId"
              :lookbackWeeks="lookbackWeeks"
            />
            <template #fallback>
              <p class="text-sm text-muted">
                Loading chart...
              </p>
            </template>
          </ClientOnly>
          <div
            v-if="cohortKeyNumbers"
            class="text-sm"
          >
            <div class="font-bold mb-2">
              Cohort Summary (Merged PRs)
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-muted">
                  Size
                </div>
                <div class="font-semibold">
                  {{ cohortKeyNumbers.size }}
                </div>
              </div>
              <div>
                <div class="text-muted">
                  Min
                </div>
                <div class="font-semibold">
                  {{ cohortKeyNumbers.min ?? "N/A" }}
                </div>
              </div>
              <div>
                <div class="text-muted">
                  Median
                </div>
                <div class="font-semibold">
                  {{ cohortKeyNumbers.median ?? "N/A" }}
                </div>
              </div>
              <div>
                <div class="text-muted">
                  Max
                </div>
                <div class="font-semibold">
                  {{ cohortKeyNumbers.max ?? "N/A" }}
                </div>
              </div>
              <div>
                <div class="text-muted">
                  Average
                </div>
                <div class="font-semibold">
                  {{ cohortKeyNumbers.average?.toFixed(1) ?? "N/A" }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
