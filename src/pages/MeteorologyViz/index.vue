<template>
  <div class="met-viz-page">
    <DashboardHeader v-if="config.header.visible" />
    <div class="met-viz-page__map">
      <MapContainer />
    </div>
    <MetVizToolbar />
    <TimelineBar v-if="config.main.timeline.visible" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useTimelineAutoNow } from '@/composables/useTimelineAutoNow';
import DashboardHeader from '@/components/dashboard/header/Header.vue';
import MetVizToolbar from '@/components/dashboard/metviz/MetVizToolbar.vue';
import TimelineBar from '@/components/dashboard/timeline/TimelineBar.vue';
import MapContainer from '@/components/map/MapContainer.vue';

const config = dashboardConfig;
const appStore = useAppDashboardStore();

useTimelineAutoNow();

onMounted(() => {
  appStore.initialize();
});
</script>

<style scoped lang="scss">
.met-viz-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  --dash-header-height: 88px;
  --dash-timeline-height: 48px;
}

.met-viz-page__map {
  position: absolute;
  inset: 0;
  z-index: 0;
}
</style>
