<script setup lang="ts">
import { Chart, Legend, LinearScale, PointElement, ScatterController, Tooltip } from "chart.js";
import type { ActiveElement, ChartDataset, ChartEvent, ChartOptions, ScatterDataPoint, TooltipItem, TooltipModel } from "chart.js";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

interface CohortPullRequestPoint {
  login: string;
  weeklyPullRequestsCount: number;
}

interface PullRequestsStats {
  login: string;
  pullRequests: { weeklyCount: number };
}

type CohortScatterPoint = ScatterDataPoint & {
  usernames: string[];
  originalX: number;
  count: number;
  rank: number;
  hasCurrent: boolean;
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
  const currentLogin = props.current?.login.toLowerCase() ?? null;
  const entries = props.cohort.map(point => ({
    login: point.login,
    weeklyPullRequestsCount: point.weeklyPullRequestsCount,
  }));

  if (props.current && currentLogin) {
    const alreadyIncluded = entries.some(entry => entry.login.toLowerCase() === currentLogin);
    if (!alreadyIncluded) {
      entries.push({
        login: props.current.login,
        weeklyPullRequestsCount: props.current.pullRequests.weeklyCount,
      });
    }
  }

  const grouped = new Map<number, { usernames: Set<string>; hasCurrent: boolean }>();
  for (const entry of entries) {
    const key = entry.weeklyPullRequestsCount;
    const bucket = grouped.get(key) ?? { usernames: new Set<string>(), hasCurrent: false };
    bucket.usernames.add(entry.login);
    if (currentLogin && entry.login.toLowerCase() === currentLogin) {
      bucket.hasCurrent = true;
    }
    grouped.set(key, bucket);
  }

  const sortedCounts = [...grouped.entries()].sort((a, b) => b[0] - a[0]);
  const total = sortedCounts.length;
  return sortedCounts.map(([count, bucket], index) => ({
    x: count,
    y: total - index,
    originalX: count,
    count: bucket.usernames.size,
    rank: index + 1,
    usernames: [...bucket.usernames],
    hasCurrent: bucket.hasCurrent,
  }));
});

const hasCohortPoints = computed(() => cohortPoints.value.length > 0);

const chartContainer = ref<HTMLDivElement | null>(null);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartInstance = shallowRef<Chart<"scatter", CohortScatterPoint[]> | null>(null);

const tooltipLabel = (context: TooltipItem<"scatter">): string[] => {
  const raw = context.raw;
  if (typeof raw !== "object" || raw === null || !("x" in raw) || !("y" in raw)) {
    return [];
  }

  const point = raw as CohortScatterPoint;
  const weeklyLabel = `Weekly PRs: ${point.originalX}`;
  return [`Developers: ${point.count}`, weeklyLabel, `Rank: ${point.rank}`];
};

const tooltipVisible = ref(false);
const tooltipPoint = shallowRef<CohortScatterPoint | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipPinned = ref(false);
const tooltipEl = ref<HTMLDivElement | null>(null);

const repositionTooltip = () => {
  const container = chartContainer.value;
  const tooltip = tooltipEl.value;
  if (!container || !tooltip || !tooltipVisible.value) return;

  const containerRect = container.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 8;

  if (tooltipRect.left < containerRect.left + padding) {
    tooltipX.value += containerRect.left + padding - tooltipRect.left;
  }
  if (tooltipRect.right > containerRect.right - padding) {
    tooltipX.value -= tooltipRect.right - (containerRect.right - padding);
  }
  if (tooltipRect.top < containerRect.top + padding) {
    tooltipY.value += containerRect.top + padding - tooltipRect.top;
  }
  if (tooltipRect.bottom > containerRect.bottom - padding) {
    tooltipY.value -= tooltipRect.bottom - (containerRect.bottom - padding);
  }
};

const isSamePoint = (left: CohortScatterPoint | null, right: CohortScatterPoint | null) => {
  if (!left || !right) return false;
  return left.originalX === right.originalX && left.rank === right.rank;
};

const setTooltip = (chart: Chart<"scatter", CohortScatterPoint[]>, point: CohortScatterPoint, x: number, y: number) => {
  const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
  tooltipPoint.value = point;
  tooltipX.value = positionX + x;
  tooltipY.value = positionY + y;
  tooltipVisible.value = true;
  nextTick(() => {
    repositionTooltip();
  });
};

const externalTooltipHandler = (context: { chart: Chart; tooltip: TooltipModel<"scatter"> }) => {
  if (tooltipPinned.value) return;
  const { chart, tooltip } = context;
  if (tooltip.opacity === 0) {
    tooltipVisible.value = false;
    tooltipPoint.value = null;
    return;
  }

  const dataPoint = tooltip.dataPoints[0];
  if (!dataPoint) return;
  const point = dataPoint.raw as CohortScatterPoint;
  setTooltip(chart as Chart<"scatter", CohortScatterPoint[]>, point, tooltip.caretX, tooltip.caretY);
};

const tooltipTitle = computed(() => {
  const point = tooltipPoint.value;
  if (!point) return "";
  if (point.count === 1) return point.usernames[0] ?? "Developer";
  return `${point.count} developers`;
});

const tooltipAvatarUsers = computed(() => tooltipPoint.value?.usernames.slice(0, 4) ?? []);
const tooltipRemainingCount = computed(() => {
  const total = tooltipPoint.value?.usernames.length ?? 0;
  return Math.max(0, total - tooltipAvatarUsers.value.length);
});

const tooltipNameList = computed(() => {
  const names = tooltipPoint.value?.usernames ?? [];
  const slice = names.slice(0, 3);
  if (slice.length === 0) return "";
  const suffix = names.length > slice.length ? ", ..." : "";
  return `${slice.join(", ")}${suffix}`;
});

const handleChartClick = (
  _event: ChartEvent,
  elements: ActiveElement[],
  chart: Chart,
) => {
  if (elements.length === 0) {
    tooltipPinned.value = false;
    tooltipVisible.value = false;
    tooltipPoint.value = null;
    return;
  }

  const firstElement = elements[0];
  if (!firstElement) return;
  const { datasetIndex, index } = firstElement;
  const dataset = chart.data.datasets[datasetIndex];
  const point = dataset?.data?.[index] as CohortScatterPoint | undefined;
  if (!point) return;

  if (tooltipPinned.value && isSamePoint(tooltipPoint.value, point)) {
    tooltipPinned.value = false;
    return;
  }

  const element = chart.getDatasetMeta(datasetIndex).data[index] as { x: number; y: number };
  const elementX = element?.x ?? 0;
  const elementY = element?.y ?? 0;
  tooltipPinned.value = true;
  setTooltip(chart as Chart<"scatter", CohortScatterPoint[]>, point, elementX, elementY);
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
      enabled: false,
      callbacks: {
        label: tooltipLabel,
      },
      external: externalTooltipHandler,
    },
  },
  onClick: (event, elements, chart) => {
    handleChartClick(event, elements, chart);
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
    const pointColors = cohortPoints.value.map(point =>
      point.hasCurrent ? "rgba(249, 115, 22, 0.85)" : "rgba(59, 130, 246, 0.65)",
    );
    const borderColors = cohortPoints.value.map(point =>
      point.hasCurrent ? "rgba(249, 115, 22, 1)" : "rgba(59, 130, 246, 0.9)",
    );
    const pointRadii = cohortPoints.value.map(point => (point.hasCurrent ? 7 : 5));
    const hoverRadii = cohortPoints.value.map(point => (point.hasCurrent ? 9 : 7));
    datasets.push({
      label: "Cohort",
      data: cohortPoints.value,
      backgroundColor: pointColors,
      borderColor: borderColors,
      pointRadius: pointRadii,
      pointHoverRadius: hoverRadii,
    });
  }

  chartInstance.value = new Chart(context, {
    type: "scatter",
    data: { datasets },
    options: chartOptions,
  });
};

watch([cohortPoints], () => {
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
      ref="chartContainer"
      class="h-80 relative"
    >
      <canvas
        ref="chartCanvas"
        class="w-full h-full"
      />
      <div
        v-if="tooltipVisible && tooltipPoint"
        ref="tooltipEl"
        class="absolute z-10 flex items-center gap-3 rounded-lg border bg-elevated px-3 py-2 text-xs text-muted shadow-lg"
        :style="{
          left: `${tooltipX}px`,
          top: `${tooltipY}px`,
          transform: 'translate(-50%, -110%)',
          pointerEvents: 'none',
        }"
      >
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="flex -space-x-2">
              <img
                v-for="username in tooltipAvatarUsers"
                :key="username"
                :src="`https://github.com/${username}.png`"
                :alt="`${username} avatar`"
                class="h-7 w-7 rounded-full border border-gray-200 bg-elevated"
              >
            </div>
            <div
              v-if="tooltipRemainingCount"
              class="text-xs text-muted"
            >
              +{{ tooltipRemainingCount }}
            </div>
          </div>
          <div class="font-semibold text-primary">
            {{ tooltipTitle }}
          </div>
          <div>Weekly PRs: {{ tooltipPoint.originalX }}</div>
          <div>Rank: {{ tooltipPoint.rank }}</div>
          <div
            v-if="tooltipNameList && tooltipPoint.count > 1"
            class="text-muted"
          >
            Top: {{ tooltipNameList }}
          </div>
          <div
            v-if="tooltipPoint.hasCurrent"
            class="text-xs text-primary"
          >
            Includes current developer
          </div>
        </div>
      </div>
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
      Hover or click a dot to see grouped developers and weekly PRs. The current developer is highlighted.
    </p>
  </div>
</template>
