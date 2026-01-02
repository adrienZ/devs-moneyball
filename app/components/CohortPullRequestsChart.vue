<script setup lang="ts">
import { Chart, Legend, LinearScale, PointElement, ScatterController, Tooltip } from "chart.js";
import type { ChartDataset, ChartOptions, ScatterDataPoint, TooltipItem } from "chart.js";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

interface CohortPullRequestPoint {
  login: string;
  weeklyPullRequestsCount: number;
}

interface PullRequestsStats {
  login: string;
  pullRequests: { weeklyCount: number };
}

type CohortScatterPoint = ScatterDataPoint & {
  username: string;
  originalX: number;
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
  Tooltip,
  Legend,
);

const cohortPoints = computed<CohortScatterPoint[]>(() => {
  const currentLogin = (props.current?.login ?? props.githubId).toLowerCase();
  return [...props.cohort]
    .filter(point => point.login.toLowerCase() !== currentLogin)
    .sort((a, b) => a.weeklyPullRequestsCount - b.weeklyPullRequestsCount)
    .map((point, index) => {
      const originalX = point.weeklyPullRequestsCount;
      return {
        x: originalX,
        y: index + 1,
        originalX,
        username: point.login,
      };
    });
});

const currentPoint = computed<CohortScatterPoint | null>(() => {
  if (!props.current) return null;
  const originalX = props.current.pullRequests.weeklyCount;
  return {
    x: originalX,
    y: cohortPoints.value.length + 1,
    originalX,
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
  const weeklyLabel = `Weekly PRs: ${point.originalX}`;
  return [point.username, weeklyLabel, `Rank: ${point.y}`];
};

const chartOptions: ChartOptions<"scatter"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: "linear",
      min: 0,
      grid: {
        color: "rgba(148, 163, 184, 0.35)",
      },
      title: { display: true, text: "Weekly PRs" },
    },
    y: {
      type: "linear",
      min: 0,
      grid: {
        color: "rgba(148, 163, 184, 0.35)",
      },
      title: { display: true, text: "Developers (ranked)" },
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
      Hover a dot to see the username and weekly PRs. The current developer is highlighted.
    </p>
  </div>
</template>
