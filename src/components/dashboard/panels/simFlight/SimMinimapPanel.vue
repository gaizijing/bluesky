<template>
  <div ref="rootRef" class="sim-minimap">
    <div ref="mapRef" class="sim-minimap__map"></div>

    <div v-if="!amapKey" class="sim-minimap__overlay">
      请配置 VITE_AMAP_KEY
    </div>
    <div v-else-if="loadingRoute" class="sim-minimap__overlay">加载航路…</div>
    <div v-else-if="!routePath.length && !aircraft" class="sim-minimap__overlay">暂无航路数据</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSimMinimapData } from '@/composables/useSimMinimapData';
import { useAmapSimMinimap } from '@/composables/useAmapSimMinimap';
import { AMAP_KEY } from '@/config/amap';

defineProps({
  panelId: { type: String, default: 'simMinimap' },
  title: { type: String, default: '' },
});

const rootRef = ref(null);
const mapRef = ref(null);
const amapKey = AMAP_KEY;

const simData = useSimMinimapData();
const {
  routePath,
  trailPath,
  aircraft,
  bounds,
  hasLiveData,
  loadingRoute,
} = simData;

useAmapSimMinimap(mapRef, {
  routePath,
  trailPath,
  aircraft,
  bounds,
  loadingRoute,
  hasLiveData,
});
</script>

<style scoped lang="scss">
.sim-minimap {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 204px;
  overflow: hidden;
  border-radius: 4px;
  background: #0a1520;
}

.sim-minimap__map {
  width: 100%;
  height: 100%;
}

.sim-minimap__overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  pointer-events: none;
  background: rgba(4, 14, 28, 0.55);
}

:deep(.amap-logo),
:deep(.amap-copyright) {
  opacity: 0.45;
  transform: scale(0.75);
  transform-origin: left bottom;
}
</style>

<style lang="scss">
.float-top-right-panel .main-panel.left_bg {
  background: transparent !important;
  background-image: none !important;
  overflow: hidden;
}

.float-top-right-panel .panel-content--chromeless {
  padding: 0;
  overflow: hidden;
  height: 100%;
  background: transparent;
}

.float-top-right-panel .main-panel--chromeless {
  overflow: hidden;
  background: transparent;
}
</style>
