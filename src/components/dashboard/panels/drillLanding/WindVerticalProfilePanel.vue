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

const { landingPointId, timelineTime } = useDrillFocus();
const chartRef = ref(null);
const isStale = ref(false);
let chartInstance = null;

function renderChart(layers) {
  if (!chartRef.value) return;
  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartRef.value);

  const sorted = [...layers].sort((a, b) => Number(a.height) - Number(b.height));
  const heights = sorted.map((l) => `${l.height}m`);
  const wind = sorted.map((l) => Number(l.windSpeed) || 0);
  const temp = sorted.map((l) => Number(l.temperature) || 0);

  chartInstance.setOption({
    animation: false,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['风速 m/s', '气温 °C'],
      textStyle: { color: '#cbd5e1', fontSize: 11 },
      top: 0,
    },
    grid: { left: 48, right: 16, top: 32, bottom: 24 },
    xAxis: {
      type: 'category',
      data: heights,
      axisLabel: { color: '#94a3b8', fontSize: 10, interval: 0, rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '风速',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        name: '气温',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '风速 m/s',
        type: 'bar',
        data: wind,
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: '气温 °C',
        type: 'line',
        yAxisIndex: 1,
        data: temp,
        smooth: true,
        itemStyle: { color: '#f97316' },
      },
    ],
  });
}

async function load() {
  if (!landingPointId.value) return;
  const res = await fetchVerticalProfile(landingPointId.value, {
    startTime: timelineTime.value,
  });
  isStale.value = Boolean(res?.isStale);
  const layers = res?.heightLayers || [];
  await nextTick();
  renderChart(layers);
}

function handleResize() {
  chartInstance?.resize();
}

watch(landingPointId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
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
