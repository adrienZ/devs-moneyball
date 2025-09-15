<script setup lang="ts">
async function triggerDevTools() {
  // @ts-error dev-only module
  const { useNuxtDevTools } = await import("#imports");
  const devtoolsClient = useNuxtDevTools();
  devtoolsClient.value?.devtools.open();
}
</script>

<template>
  <button @click="triggerDevTools">
    Open Devtools
  </button>
</template>
