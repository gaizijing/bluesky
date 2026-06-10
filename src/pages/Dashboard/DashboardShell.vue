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
    <DashboardLayout v-if="!appStore.panelsHidden" />
    <MapToolbar v-if="config.toolbar.visible" />
    <SimFlightMapBridge v-if="appStore.view === 'simFlight' && mapVisible" />
    <LegendPanel v-if="appStore.legendOpen" />
    <PickPopup v-if="appStore.pickPopup && !regionMeteoOnDashboard" />
    <TimelineBar v-if="config.main.timeline.visible" />
    <MetVizToolbar v-if="metVizOnDashboard" />
    <RegionMeteoControls v-if="regionMeteoOnDashboard" />
    <WarningDrawer />

    <div v-if="devViewSwitcher" class="dashboard-shell__dev-views">
      <button
        v-for="v in views"
        :key="v"
        type="button"
        :class="{ active: appStore.view === v }"
        @click="switchDevView(v)"
      >
        {{ v }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, provide } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useTimelineAutoNow } from '@/composables/useTimelineAutoNow';
import { useRegionMeteoEngine } from '@/composables/useRegionMeteoEngine';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import DashboardHeader from '@/components/dashboard/header/Header.vue';
import DashboardLayout from '@/components/dashboard/DashboardLayout.vue';
import MapToolbar from '@/components/dashboard/toolbar/MapToolbar.vue';
import LegendPanel from '@/components/dashboard/toolbar/LegendPanel.vue';
import PickPopup from '@/components/dashboard/toolbar/PickPopup.vue';
import TimelineBar from '@/components/dashboard/timeline/TimelineBar.vue';
import MetVizToolbar from '@/components/dashboard/metviz/MetVizToolbar.vue';
import RegionMeteoControls from '@/components/regionMeteo/RegionMeteoControls.vue';
import { isMetVizEnabledOnDashboard, isRegionMeteoEnabledOnDashboard } from '@/config/metVizRuntime';
import WarningDrawer from '@/components/dashboard/warning/WarningDrawer.vue';
import MapContainer from '@/components/map/MapContainer.vue';
import SimFlightMapBridge from '@/components/dashboard/panels/simFlight/SimFlightMapBridge.vue';

const config = dashboardConfig;
const appStore = useAppDashboardStore();
const regionMeteo = useRegionMeteoEngine();
provide('regionMeteo', regionMeteo);
const metVizOnDashboard = isMetVizEnabledOnDashboard();
const regionMeteoOnDashboard = isRegionMeteoEnabledOnDashboard();
const mapVisible = computed(() => config.main?.map?.visible !== false);
const views = Object.keys(config.main.views);
const devViewSwitcher = import.meta.env.DEV;


useTimelineAutoNow();

const shellStyle = computed(() => ({
  '--dash-header-height': `${config.header.height ?? 88}px`,
  '--dash-timeline-height': `${config.main.timeline.height ?? 48}px`,
}));

let offTime = null;
let offRegion = null;

function switchDevView(view) {
  if (view === 'drillLanding') appStore.drillLanding('LP001');
  else if (view === 'drillRoute') appStore.drillRoute('route-sf-huangdao');
  else if (view === 'simFlight') appStore.enterSimFlight('route-sf-huangdao');
  else appStore.setView(view);
}

onMounted(async () => {
  await appStore.initialize();
  offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, (payload) => {
    console.log('[P3] MET_TIME_CHANGED', payload);
  });
  offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, (payload) => {
    console.log('[P3] REGION_CHANGED', payload);
  });
});

onUnmounted(() => {
  offTime?.();
  offRegion?.();
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

.dashboard-shell--pick :deep(.cesium-container),
.dashboard-shell--pick :deep(#cesiumContainer) {
  cursor: crosshair;
}

.dashboard-shell__dev-views {
  position: absolute;
  top: calc(var(--dash-header-height, 88px) + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  gap: 8px;
  pointer-events: auto;

  button {
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 12px;
    cursor: pointer;

    &.active {
      background: rgba(37, 99, 235, 0.7);
    }
  }
}
</style>
