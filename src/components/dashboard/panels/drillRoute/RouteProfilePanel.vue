<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!routeId"
    empty-text="请选择航路"
    :retry="reload"
  >
    <div class="route-profile">
      <div class="route-profile__toolbar">
        <button
          v-for="layer in layerOptions"
          :key="layer.key"
          type="button"
          class="route-profile__layer-btn"
          :class="{ 'route-profile__layer-btn--active': layers[layer.key] }"
          @click="toggleLayer(layer.key)"
        >
          {{ layer.label }}
        </button>
      </div>
      <div ref="chartRef" class="route-profile__chart" />
    </div>
  </AsyncState>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick, reactive } from 'vue';
import * as echarts from 'echarts';
import AsyncState from '@/components/common/AsyncState.vue';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { fetchRouteProfileGrid } from '@/services/routeProfileService';
import { buildRouteProfileChartOption } from '@/utils/routeProfileChart';

const appStore = useAppDashboardStore();
const { routeId, timelineTime } = useDrillFocus();

const chartRef = ref(null);
const chartGrid = ref(null);
const layers = reactive({
  showWind: true,
  showIsotach: true,
});

const layerOptions = [
  { key: 'showWind', label: '风场' },
  { key: 'showIsotach', label: '等风速面' },
];

let chartInstance = null;

function toggleLayer(key) {
  layers[key] = !layers[key];
  renderChart();
}

async function load() {
  if (!routeId.value || !appStore.regionId) {
    chartGrid.value = null;
    return;
  }

  chartGrid.value = await fetchRouteProfileGrid({
    routeId: routeId.value,
    regionId: appStore.regionId,
    time: timelineTime.value,
  });
}

function renderChart() {
  if (!chartRef.value || !chartGrid.value) return;
  try {
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.value);
    }
    chartInstance.setOption(buildRouteProfileChartOption(chartGrid.value, layers), true);
    chartInstance.resize();
  } catch (err) {
    console.error('[RouteProfilePanel] render failed:', err);
  }
}

function handleResize() {
  chartInstance?.resize();
}

const { loading, error, reload } = usePanelRefresh(load);

watch(routeId, () => reload());

watch(
  layers,
  () => renderChart(),
  { deep: true },
);

watch(
  [loading, chartRef, chartGrid],
  async ([isLoading]) => {
    if (isLoading || !chartRef.value || !chartGrid.value) return;
    await nextTick();
    renderChart();
  },
  { flush: 'post' },
);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});

window.addEventListener('resize', handleResize);
</script>

<style scoped lang="scss">
.route-profile {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.route-profile__toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 2px 6px;
}

.route-profile__layer-btn {
  padding: 4px 14px;
  border-radius: 3px;
  border: 1px solid rgba(37, 99, 235, 0.55);
  background: rgba(15, 40, 70, 0.75);
  color: #93c5fd;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(30, 64, 110, 0.85);
  }

  &--active {
    background: rgba(29, 78, 216, 0.55);
    border-color: #3b82f6;
    color: #e0f2fe;
  }
}

.route-profile__chart {
  flex: 1;
  min-height: 140px;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}
</style>
