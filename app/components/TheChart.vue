<script setup lang="ts">
import { Radar } from "vue-chartjs";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const props = defineProps<{ criteria: Record<string, number> }>();

const chartData = {
  labels: Object.keys(props.criteria),
  datasets: [
    {
      label: "Developer Score",
      data: Object.values(props.criteria),
      fill: true,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgb(54, 162, 235)",
      pointBackgroundColor: "rgb(54, 162, 235)",
    },
  ],
};

const chartOptions = {
  scales: {
    r: {
      grid: {
        color: "rgba(255, 255, 255, 0.15)", // softer white for radial grid lines
      },
      angleLines: {
        color: "rgba(255, 255, 255, 0.25)", // slightly brighter to guide the eye
      },
      pointLabels: {
        color: "#e6e9ef", // light gray for readability on dark bg
        font: {
          size: 14,
          weight: 500,
        },
      },
      ticks: {
        color: "rgba(255, 255, 255, 0.4)", // subtle but visible
        backdropColor: "transparent", // no background box
      },
    },
  },
  plugins: {
    legend: {
      labels: {
        color: "#e6e9ef", // match point labels
      },
    },
  },
};
</script>

<template>
  <Radar
    :data="chartData"
    :options="chartOptions"
  />
</template>
