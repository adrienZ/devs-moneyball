<script setup lang="ts">
import { Chart, Legend, LinearScale, LogarithmicScale, PointElement, ScatterController, Tooltip } from "chart.js";
import type { ChartDataset, ChartOptions, ScatterDataPoint, TooltipItem } from "chart.js";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

interface CohortPullRequestPoint {
  login: string;
  mergedPullRequestsTotalCount: number;
  openPullRequestsTotalCount: number;
}

interface PullRequestsStats {
  login: string;
  mergedPullRequests: { totalCount: number };
  openPullRequests: { totalCount: number };
}

type CohortScatterPoint = ScatterDataPoint & {
  username: string;
  originalX: number;
  originalY: number;
  cappedX: boolean;
  cappedY: boolean;
  logAdjustedX: boolean;
  logAdjustedY: boolean;
};

const props = defineProps<{
  cohort: CohortPullRequestPoint[];
  current: PullRequestsStats | null;
  githubId: string;
}>();

Chart.register(
  ScatterController,
  PointElement,
  LinearScale,
  LogarithmicScale,
  Tooltip,
  Legend,
);

const percentile = (values: number[], percent: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percent / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower] ?? 0;
  const weight = rank - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
};

const cohortCap = computed(() => {
  const cohortMerged = props.cohort.map(point => point.mergedPullRequestsTotalCount);
  const cohortOpen = props.cohort.map(point => point.openPullRequestsTotalCount);
  const currentMerged = props.current?.mergedPullRequests.totalCount;
  const currentOpen = props.current?.openPullRequests.totalCount;
  if (typeof currentMerged === "number") cohortMerged.push(currentMerged);
  if (typeof currentOpen === "number") cohortOpen.push(currentOpen);
  return {
    merged: percentile(cohortMerged, 95),
    open: percentile(cohortOpen, 95),
  };
});

const cohortPoints = computed<CohortScatterPoint[]>(() => {
  const currentLogin = (props.current?.login ?? props.githubId).toLowerCase();
  const { merged, open } = cohortCap.value;
  return props.cohort
    .filter(point => point.login.toLowerCase() !== currentLogin)
    .map((point) => {
      const originalX = point.mergedPullRequestsTotalCount;
      const originalY = point.openPullRequestsTotalCount;
      const cappedX = originalX > merged;
      const cappedY = originalY > open;
      const cappedValueX = cappedX ? merged : originalX;
      const cappedValueY = cappedY ? open : originalY;
      const logAdjustedX = cappedValueX < 1;
      const logAdjustedY = cappedValueY < 1;
      return {
        x: logAdjustedX ? 1 : cappedValueX,
        y: logAdjustedY ? 1 : cappedValueY,
        originalX,
        originalY,
        cappedX,
        cappedY,
        logAdjustedX,
        logAdjustedY,
        username: point.login,
      };
    });
});

const currentPoint = computed<CohortScatterPoint | null>(() => {
  if (!props.current) return null;
  const { merged, open } = cohortCap.value;
  const originalX = props.current.mergedPullRequests.totalCount;
  const originalY = props.current.openPullRequests.totalCount;
  const cappedX = originalX > merged;
  const cappedY = originalY > open;
  const cappedValueX = cappedX ? merged : originalX;
  const cappedValueY = cappedY ? open : originalY;
  const logAdjustedX = cappedValueX < 1;
  const logAdjustedY = cappedValueY < 1;
  return {
    x: logAdjustedX ? 1 : cappedValueX,
    y: logAdjustedY ? 1 : cappedValueY,
    originalX,
    originalY,
    cappedX,
    cappedY,
    logAdjustedX,
    logAdjustedY,
    username: props.current.login,
  };
});

const hasCohortPoints = computed(() => cohortPoints.value.length > 0 || currentPoint.value !== null);

const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartInstance = shallowRef<Chart<"scatter", CohortScatterPoint[]> | null>(null);

const tooltipLabel = (context: TooltipItem<"scatter">): string[] => {
  const raw = context.raw;
  if (typeof raw !== "object" || raw === null || !("x" in raw) || !("y" in raw)) {
    return [];
  }

  const point = raw as CohortScatterPoint;
  const displayX = point.x;
  const displayY = point.y;
  const mergedLabel = point.logAdjustedX
    ? `Merged PRs: ${point.originalX} (displayed as 1 for log scale)`
    : point.cappedX
      ? `Merged PRs: ${point.originalX} (capped at ${displayX})`
      : `Merged PRs: ${displayX}`;
  const openLabel = point.logAdjustedY
    ? `Open PRs: ${point.originalY} (displayed as 1 for log scale)`
    : point.cappedY
      ? `Open PRs: ${point.originalY} (capped at ${displayY})`
      : `Open PRs: ${displayY}`;
  return [point.username, mergedLabel, openLabel];
};

const chartOptions: ChartOptions<"scatter"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: "logarithmic",
      min: 1,
      suggestedMax: Math.max(1, cohortCap.value.merged),
      grid: {
        color: "rgba(148, 163, 184, 0.35)",
      },
      title: { display: true, text: "Merged PRs" },
    },
    y: {
      type: "logarithmic",
      min: 1,
      suggestedMax: Math.max(1, cohortCap.value.open),
      grid: {
        color: "rgba(148, 163, 184, 0.35)",
      },
      title: { display: true, text: "Open PRs" },
    },
  },
  plugins: {
    legend: { position: "bottom" },
    tooltip: {
      callbacks: {
        label: tooltipLabel,
      },
    },
  },
};

const renderCohortChart = () => {
  if (!chartCanvas.value || !hasCohortPoints.value) {
    chartInstance.value?.destroy();
    chartInstance.value = null;
    return;
  }

  const context = chartCanvas.value.getContext("2d");
  if (!context) return;

  chartInstance.value?.destroy();

  const datasets: ChartDataset<"scatter", CohortScatterPoint[]>[] = [];
  if (cohortPoints.value.length > 0) {
    datasets.push({
      label: "Cohort",
      data: cohortPoints.value,
      backgroundColor: "rgba(59, 130, 246, 0.65)",
      borderColor: "rgba(59, 130, 246, 0.9)",
      pointRadius: 5,
      pointHoverRadius: 7,
    });
  }

  if (currentPoint.value) {
    datasets.push({
      label: "Current developer",
      data: [currentPoint.value],
      backgroundColor: "rgba(249, 115, 22, 0.8)",
      borderColor: "rgba(249, 115, 22, 1)",
      pointRadius: 7,
      pointHoverRadius: 9,
    });
  }

  chartInstance.value = new Chart(context, {
    type: "scatter",
    data: { datasets },
    options: chartOptions,
  });
};

watch([cohortPoints, currentPoint], () => {
  renderCohortChart();
}, { deep: true });

onMounted(() => {
  renderCohortChart();
});

onBeforeUnmount(() => {
  chartInstance.value?.destroy();
});
</script>

<template>
  <div>
    <div
      v-if="hasCohortPoints"
      class="h-80"
    >
      <canvas
        ref="chartCanvas"
        class="w-full h-full"
      />
    </div>
    <p
      v-else
      class="text-sm text-muted"
    >
      No cohort data available yet.
    </p>
    <p
      v-if="hasCohortPoints"
      class="text-xs text-muted mt-2"
    >
      Hover a dot to see the username and PR counts. The current developer is highlighted.
    </p>
  </div>
</template>
