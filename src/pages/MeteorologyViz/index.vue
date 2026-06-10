<template>
  <div class="met-viz-page">
    <DashboardHeader v-if="config.header.visible" />
    <div v-if="mapReady" class="met-viz-page__map">
      <RegionMeteoMap />
    </div>
    <RegionMeteoControls />
    <TimelineBar v-if="config.main.timeline.visible" />
  </div>
</template>

<script setup>
import { onBeforeMount, provide, ref } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useTimelineAutoNow } from '@/composables/useTimelineAutoNow';
import { useRegionMeteoEngine } from '@/composables/useRegionMeteoEngine';
import DashboardHeader from '@/components/dashboard/header/Header.vue';
import TimelineBar from '@/components/dashboard/timeline/TimelineBar.vue';
import RegionMeteoMap from '@/components/regionMeteo/RegionMeteoMap.vue';
import RegionMeteoControls from '@/components/regionMeteo/RegionMeteoControls.vue';

const config = dashboardConfig;
const appStore = useAppDashboardStore();
const regionMeteo = useRegionMeteoEngine();
const mapReady = ref(false);

provide('regionMeteo', regionMeteo);

useTimelineAutoNow();

onBeforeMount(async () => {
  try {
    await appStore.initialize();
  } catch (err) {
    console.error('[MeteorologyViz] initialize failed', err);
  } finally {
    mapReady.value = true;
  }
});
</script>

<style scoped lang="scss">
.met-viz-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #040c14;
  --dash-header-height: 88px;
  --dash-timeline-height: 48px;
}

.met-viz-page__map {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}
</style>
