<template>
  <div ref="mapEl" class="region-meteo-map" />
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted } from 'vue';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const regionMeteo = inject('regionMeteo');
const mapEl = ref(null);

onMounted(async () => {
  if (!mapEl.value || !regionMeteo) return;
  try {
    await regionMeteo.initMap(mapEl.value);
  } catch (err) {
    console.error('[RegionMeteoMap] init failed', err);
  }
});

onUnmounted(() => {
  regionMeteo?.destroyMap();
});
</script>

<style scoped lang="scss">
.region-meteo-map {
  width: 100%;
  height: 100%;
}

:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
