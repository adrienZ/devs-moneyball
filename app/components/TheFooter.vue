<template>
  <footer>
    <hr />
    <div class="flex items-center justify-between py-2 px-6 bg-black">
      <DevOnly>
        <div class="max-w-5xl mx-auto">
          <button @click="triggerDevTools">
            Open Devtools
          </button>
        </div>
      </DevOnly>
    </div>

  </footer>
</template>

<script lang="ts" setup>
import { DevOnly } from "#components";


function triggerDevTools() {
  import("#imports").then(({ useNuxtDevTools }) => {
    const devtoolsClient = useNuxtDevTools();
    devtoolsClient.value?.devtools.open();
  });
}
</script>
