<script setup lang="ts">
import TheFooter from './components/TheFooter.vue';
import { NuxtRouteAnnouncer, NuxtPage } from '#components';

</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <TheFooter />
  </div>
</template>
