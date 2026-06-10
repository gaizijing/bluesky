<template>
  <span class="sim-flight-map-bridge" aria-hidden="true" />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useIsimCesiumSync } from '@/composables/useIsimCesiumSync';
import { useSimRouteCesiumSync } from '@/composables/useSimRouteCesiumSync';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

useSimRouteCesiumSync();
const { focusOnAircraft } = useIsimCesiumSync();

let offFocus = null;

onMounted(() => {
  offFocus = dashboardEventBus.on(DASHBOARD_EVENTS.FOCUS_ISIM_AIRCRAFT, focusOnAircraft);
});

onUnmounted(() => {
  offFocus?.();
});
</script>

<style scoped>
.sim-flight-map-bridge {
  display: none;
}
</style>
