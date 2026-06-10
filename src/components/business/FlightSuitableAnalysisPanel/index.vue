<template>
  <div class="suitability-chart-container">
    <div ref="chartRef" class="chart-wrapper"></div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import echarts from '@/utils/echarts';
import { useModuleStore } from "@/store/modules/module";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
import { FLYABILITY_BUCKET_MINUTES, chartStatusColor, chartStatusLabel } from "@/utils/flyabilityChart";

const moduleStore = useModuleStore();
const dashboardWeatherStore = useDashboardWeatherStore();

const chartRef = ref(null);
let chartInstance = null;

const flightSuitableAnalysisPanelData = computed(() => {
  return dashboardWeatherStore.getFlightSuitableAnalysisPanelData();
});

const FACTOR_ORDER = ["综合", "风", "风切变", "颠簸指数", "湍流", "降水", "能见度"];

const alignToBucket = (date) => {
  const d = new Date(date);
  const step = FLYABILITY_BUCKET_MINUTES;
  d.setMinutes(d.getMinutes() - (d.getMinutes() % step), 0, 0);
  d.setSeconds(0, 0);
  return d;
};

const formatTime = (date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const buildFallbackTimeLabels = (slotCount, startTime) => {
  const labels = [];
  const parsed = startTime ? new Date(startTime) : null;
  const start = parsed && !Number.isNaN(parsed.getTime())
    ? alignToBucket(parsed)
    : alignToBucket(new Date());
  const stepMs = FLYABILITY_BUCKET_MINUTES * 60 * 1000;
  for (let i = 0; i <= slotCount; i += 1) {
    labels.push(formatTime(new Date(start.getTime() + i * stepMs)));
  }
  return labels;
};

const toStatus = (raw) => Number(raw);

const normalizeChartData = (rawData) => {
  if (!rawData || !Array.isArray(rawData.factors) || rawData.factors.length === 0) {
    return null;
  }
  
  const rawFactors = rawData.factors;
  const rawStatusData = Array.isArray(rawData.statusData) ? rawData.statusData : [];
  const rawValueData = Array.isArray(rawData.valueData) ? rawData.valueData : [];
  const rawUnitData = Array.isArray(rawData.unitData) ? rawData.unitData : [];

  let slotCount = 0;
  rawStatusData.forEach(row => {
    if (Array.isArray(row)) {
      slotCount = Math.max(slotCount, row.length);
    }
  });
  if (slotCount === 0) {
    return null;
  }

  const backendTimeLabels = Array.isArray(rawData.timeLabels) ? rawData.timeLabels : [];
  const timeLabels = backendTimeLabels.length === slotCount + 1
    ? backendTimeLabels
    : buildFallbackTimeLabels(slotCount, rawData.bucketStartTime || rawData.metadata?.bucketTime);

  return {
    factors: rawFactors,
    statusData: rawStatusData,
    valueData: rawValueData,
    unitData: rawUnitData,
    slotCount,
    timeLabels
  };
};

const formatValue = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '';
  }
  return num % 1 === 0 ? `${num}` : num.toFixed(2);
};

const initChart = () => {
  if (!chartRef.value) {
    return;
  }

  const normalized = normalizeChartData(flightSuitableAnalysisPanelData.value);
  if (!normalized) {
    chartInstance?.dispose();
    chartInstance = null;
    return;
  }

  if (chartInstance) {
    chartInstance.dispose();
  }
  chartInstance = echarts.init(chartRef.value);

  const { factors, statusData, valueData, unitData, slotCount, timeLabels } = normalized;
  const slotCategories = Array.from({ length: slotCount }, (_, i) => `${i}`);

  const seriesData = [];
  for (let factorIdx = 0; factorIdx < factors.length; factorIdx++) {
    for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
      seriesData.push([slotIdx, factorIdx, statusData[factorIdx][slotIdx], valueData[factorIdx][slotIdx], unitData[factorIdx][slotIdx]]);
    }
  }  

  const option = {
    animation: false,
    tooltip: {
      appendToBody: true,
      formatter: (params) => {
        const slotIdx = Number(params.data[0]);
        const factorIdx = Number(params.data[1]);
        const status = toStatus(params.data[2]);
        const value = params.data[3];
        const unit = params.data[4] || '';
        const rangeLabel = `${timeLabels[slotIdx]} - ${timeLabels[slotIdx + 1]}`;

        return [
          `<div>${factors[factorIdx]}</div>`,
          `<div>时间：${rangeLabel}</div>`,
          `<div>状态：${chartStatusLabel(status)}</div>`,
          status === 2 ? '' : `<div>数值：${formatValue(value)}${unit}</div>`
        ].join('');
      }
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      dimension: 2,
      pieces: [
        { value: 2, color: chartStatusColor(2) },
        { value: 1, color: chartStatusColor(1) },
        { value: 0, color: chartStatusColor(0) },
        { value: -1, color: chartStatusColor(-1) },
      ]
    },
    grid: {
      left: 45,
      right: 16,
      top: 10,
      bottom: 18
    },
    xAxis: [
      {
        type: 'category',
        data: slotCategories,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false }
      },
      {
        type: 'value',
        min: 0,
        max: slotCount,
        interval: 1,
        position: 'bottom',
        axisLine: { lineStyle: { color: '#7d8b96' } },
        axisTick: { show: true, lineStyle: { color: '#7d8b96' } },
        splitLine: { show: false },
        axisLabel: {
          color: '#c7d0d8',
          fontSize: 10,
          interval: 0,
          formatter: (value) => {
            const idx = Math.round(value);
            return timeLabels[idx] || '';
          }
        }
      }
    ],
    yAxis: {
      type: 'category',
      data: factors,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#c7d0d8',
        fontSize: 12
      }
    },
    series: [{
      type: 'heatmap',
      data: seriesData,
      xAxisIndex: 0,
      yAxisIndex: 0,
      encode: { x: 0, y: 1, value: 2 },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#0f2433',
        color: (params) => chartStatusColor(toStatus(params.data[2])),
      },
      label: {
        show: true,
        color: '#ffffff',
        fontSize: 10,
        formatter: (params) => {
          const status = toStatus(params.data[2]);
          const value = params.data[3];
          const unit = params.data[4] || '';
          return status === 2 ? '' : `${formatValue(value)}${unit ? unit : ''}`;
        }
      }
    }]
  };

  chartInstance.setOption(option);
};

const handleResize = () => {
  chartInstance?.resize();
};

watch(
  flightSuitableAnalysisPanelData,
  async () => {
    await nextTick();
    if (!chartRef.value) return;
    initChart();
  },
  { deep: true, immediate: true }
);

watch(
  () => moduleStore.currentModule,
  () => {
    nextTick(() => {
      chartInstance?.resize();
    });
  }
);

onMounted(() => {
  window.addEventListener('resize', handleResize);
  nextTick(() => {
    initChart();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.suitability-chart-container {
  position: relative;
  height: 100%;
  min-height: 0;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
</style>
