<template>
  <div
    class="dashboard-shell"
    :class="{
      'dashboard-shell--pick': appStore.pickMode,
      'dashboard-shell--panels-hidden': appStore.panelsHidden,
      'dashboard-shell--no-map': !mapVisible,
    }"
    :style="shellStyle"
  >
    <DashboardHeader v-if="config.header.visible" />
    <div v-if="mapVisible" class="dashboard-shell__map">
      <MapContainer />
    </div>
    <DashboardLayout v-show="!appStore.panelsHidden" class="dashboard-shell__panels" />
    <MapToolbar v-if="config.toolbar.visible" />
    <SimFlightMapBridge v-if="mapVisible" />
    <LegendPanel v-if="appStore.legendOpen && !regionMeteoOnDashboard" />
    <PickPopup v-if="appStore.pickPopup && !regionMeteoOnDashboard" />
    <TimelineBar v-if="config.main.timeline.visible" />
    <RegionMeteoControls v-if="regionMeteoOnDashboard" />
    <WarningDrawer />
    <WarningToast />
  </div>
</template>

<script setup>
import { onMounted, computed, provide } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useTimelineAutoNow } from '@/composables/useTimelineAutoNow';
import { useRegionMeteoEngine } from '@/composables/useRegionMeteoEngine';
import DashboardHeader from '@/components/dashboard/header/Header.vue';
import DashboardLayout from '@/components/dashboard/DashboardLayout.vue';
import MapToolbar from '@/components/dashboard/toolbar/MapToolbar.vue';
import LegendPanel from '@/components/dashboard/toolbar/LegendPanel.vue';
import PickPopup from '@/components/dashboard/toolbar/PickPopup.vue';
import TimelineBar from '@/components/dashboard/timeline/TimelineBar.vue';
import RegionMeteoControls from '@/components/regionMeteo/RegionMeteoControls.vue';
import { isRegionMeteoEnabledOnDashboard } from '@/config/metVizRuntime';
import WarningDrawer from '@/components/dashboard/warning/WarningDrawer.vue';
import WarningToast from '@/components/dashboard/warning/WarningToast.vue';
import MapContainer from '@/components/map/MapContainer.vue';
import SimFlightMapBridge from '@/components/dashboard/panels/simFlight/SimFlightMapBridge.vue';

const config = dashboardConfig;
const appStore = useAppDashboardStore();
const regionMeteo = useRegionMeteoEngine();
provide('regionMeteo', regionMeteo);
const regionMeteoOnDashboard = isRegionMeteoEnabledOnDashboard();
const mapVisible = computed(() => config.main?.map?.visible !== false);

useTimelineAutoNow();

const shellStyle = computed(() => ({
  '--dash-header-height': `${config.header.height ?? 88}px`,
  '--dash-timeline-height': `${config.main.timeline.height ?? 48}px`,
}));

onMounted(async () => {
  await appStore.initialize();
});
</script>

<style scoped lang="scss">
.dashboard-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;

  &--no-map {
    background: #0b1224;
  }
  --dash-header-height: 88px;
  --dash-timeline-height: 48px;
}

.dashboard-shell__map {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.dashboard-shell__panels {
  /* v-show 隐藏：保留 DOM / 组件实例，仅不显示 */
  pointer-events: auto;
}

.dashboard-shell--pick :deep(.cesium-container),
.dashboard-shell--pick :deep(#cesiumContainer) {
  cursor: crosshair;
}
</style>
