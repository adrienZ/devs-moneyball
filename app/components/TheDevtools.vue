<script setup lang="ts">
// @ts-expect-error local dev only
import { useNuxtDevTools } from "@nuxt/devtools/dist/runtime/use-nuxt-devtools";

function triggerDevTools() {
  const devtoolsClient = useNuxtDevTools();
  devtoolsClient.value?.devtools.open();
}
</script>

<template>
  <button @click="triggerDevTools">
    Open Devtools
  </button>
</template>
