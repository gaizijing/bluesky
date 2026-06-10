<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId"
    empty-text="请选择起降点"
    :stale="isStale"
    :retry="reload"
  >
    <div ref="chartRef" class="vertical-profile-chart" />
  </AsyncState>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchVerticalProfile } from '@/api/weather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import {
  adaptVerticalProfileResponse,
  buildMockWindProfileGrid,
  buildWindProfileChartOption,
} from '@/utils/windVerticalProfileChart';

const USE_MOCK_DATA = import.meta.env.VITE_WIND_PROFILE_MOCK !== 'false';

const { landingPointId, timelineTime } = useDrillFocus();
const chartRef = ref(null);
const chartGrid = ref(null);
const isStale = ref(false);
let chartInstance = null;

function renderChart(grid) {
  if (!chartRef.value || !grid) return;

  try {
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.value);
    }
    chartInstance.setOption(buildWindProfileChartOption(grid), true);
    chartInstance.resize();
  } catch (err) {
    console.error('[WindVerticalProfilePanel] render failed:', err);
  }
}

async function load() {
  if (!landingPointId.value) {
    chartGrid.value = null;
    return;
  }

  if (USE_MOCK_DATA) {
    chartGrid.value = buildMockWindProfileGrid({
      startTime: timelineTime.value ? new Date(timelineTime.value) : new Date(),
    });
    isStale.value = false;
  } else {
    const res = await fetchVerticalProfile(landingPointId.value, {
      startTime: timelineTime.value,
    });
    isStale.value = Boolean(res?.isStale);
    chartGrid.value = adaptVerticalProfileResponse(res, timelineTime.value);
  }
}

function handleResize() {
  chartInstance?.resize();
}

watch(landingPointId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);

watch(
  [loading, chartRef, chartGrid],
  async ([isLoading]) => {
    if (isLoading || !chartRef.value || !chartGrid.value) return;
    await nextTick();
    renderChart(chartGrid.value);
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
.vertical-profile-chart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
</style>
