<template>
  <footer>
    <hr>
    <div class="flex items-center justify-between py-2 px-6 bg-black">
      <DevOnly>
        <div class="max-w-5xl mx-auto">
          <TheDevtools />
        </div>
      </DevOnly>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { DevOnly } from "#components";
import TheDevtools from "./TheDevtools.vue";
</script>
