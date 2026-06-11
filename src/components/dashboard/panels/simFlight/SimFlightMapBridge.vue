<template>
  <span class="sim-flight-map-bridge" aria-hidden="true" />
</template>

<script setup>
import { useIsimCesiumSync } from '@/composables/useIsimCesiumSync';
import { useSimRouteCesiumSync } from '@/composables/useSimRouteCesiumSync';

useSimRouteCesiumSync();
useIsimCesiumSync();
</script>

<style scoped>
.sim-flight-map-bridge {
  display: none;
}
</style>
