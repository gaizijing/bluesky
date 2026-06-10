<template>
  <div class="region-meteo-map-wrap">
    <div ref="mapEl" class="region-meteo-map" />
    <p v-if="mapError" class="region-meteo-map__error">{{ mapError }}</p>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, nextTick } from 'vue';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const regionMeteo = inject('regionMeteo');
const mapEl = ref(null);
const mapError = ref('');
let resizeObserver = null;

function refreshViewerSize() {
  const viewer = regionMeteo?.viewerRef?.value;
  if (!viewer || viewer.isDestroyed?.()) return;
  viewer.resize();
  viewer.scene?.requestRender?.();
}

onMounted(async () => {
  if (!mapEl.value || !regionMeteo) return;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => refreshViewerSize());
    resizeObserver.observe(mapEl.value);
  }
  try {
    await regionMeteo.initMap(mapEl.value);
    await nextTick();
    refreshViewerSize();
  } catch (err) {
    mapError.value = err?.message || '地图初始化失败';
    console.error('[RegionMeteoMap] init failed', err);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  regionMeteo?.destroyMap();
});
</script>

<style scoped lang="scss">
.region-meteo-map-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}

.region-meteo-map {
  width: 100%;
  height: 100%;
}

.region-meteo-map__error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.9);
  color: #fca5a5;
  font-size: 13px;
  z-index: 2;
  pointer-events: none;
}

:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
