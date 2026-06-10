<template>
  <div class="weather-analysis-panel" ref="panelRef">


    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 3小时天气预报 -->
      <div class="chart-section">
        <ThreeHourForecast />
      </div>
      <!-- 气象要素折线图 -->
      <div class="chart-section">
        <div class="chart-wrapper">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>加载数据中...</p>
          </div>
          <div ref="trendChartRef" class="trend-chart"></div>
        </div>
      </div>

      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import echarts from '@/utils/echarts';
import { useModuleStore } from "@/store/modules/module";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
import ThreeHourForecast from "@/components/business/ThreeHourForecast/index.vue";

const moduleStore = useModuleStore();
const dashboardWeatherStore = useDashboardWeatherStore();

function formatTimeHm(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseTimeLabel(hm, referenceTime = new Date()) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(referenceTime);
  d.setSeconds(0, 0);
  d.setMilliseconds(0);
  d.setHours(h, m, 0, 0);
  // 跨午夜时，将偏早的刻度归到次日
  if (d.getTime() < referenceTime.getTime() - 12 * 60 * 60 * 1000) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

function parsePointTime(data, index, referenceTime) {
  const iso = data.time_iso?.[index];
  if (iso) {
    const ts = new Date(iso).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  return parseTimeLabel(data.time[index], referenceTime);
}

function pairSeriesData(data, values, referenceTime) {
  return data.time.map((_, index) => [
    parsePointTime(data, index, referenceTime),
    values?.[index] ?? null,
  ]);
}

function buildXAxisRange(data, referenceTime = new Date()) {
  const stamps = data.time.map((_, index) => parsePointTime(data, index, referenceTime));
  if (!stamps.length) {
    return {};
  }
  const pad = 10 * 60 * 1000;
  return {
    min: Math.min(...stamps) - pad,
    max: Math.max(...stamps) + pad,
  };
}


// 图表实例
let trendChartInstance = null;

// 图表引用
const trendChartRef = ref(null);


// 气象要素配置 - 固定选择能见度、风速、降水
const weatherElements = ref([
  {
    name: '风速',
    unit: 'm/s',
    color: '#f97316',
    type: 'windSpeed'
  },
  {
    name: '能见度',
    unit: 'km',
    color: '#22c55e',
    type: 'visibility'
  },
  {
    name: '降水量',
    unit: 'mm',
    color: '#3b82f6',
    type: 'precipitation'
  }
]);
const weatherForecastPanelData = computed(() => {
  return dashboardWeatherStore.weatherForecastPanelData;
});

// 更新趋势图表
const updateTrendChart = (data) => {
  if (!trendChartInstance || !data) {
    return;
  }

  // 提取时间标签
  const timeLabels = data.time;
  if (!Array.isArray(timeLabels) || timeLabels.length === 0) {
    return;
  }
  const referenceTime = new Date();
  const xRange = buildXAxisRange(data, referenceTime);
  const elementColors = weatherElements.value.map((el) => el.color);

  // 自定义tooltip格式化器
  const tooltipFormatter = (params) => {
    const first = params[0];
    const ts = Array.isArray(first.value) ? first.value[0] : first.axisValue;
    const timeStr = formatTimeHm(new Date(ts));
    let result = `<div style="margin-bottom: 6px"><strong style="color: #3b82f6">${timeStr}</strong></div>`;

    params.forEach(param => {
      const element = weatherElements.value.find(el => el.name === param.seriesName);
      if (element) {
        const rawValue = Array.isArray(param.value) ? param.value[1] : param.value;
        result += `
          <div style="margin: 4px 0; line-height: 1.4">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${element.color}; margin-right: 6px;"></span>
            <span style="color: #94a3b8; display: inline-block; width: 60px">${element.name}：</span>
            <span style="color: ${element.color}">${rawValue} ${element.unit}</span>
          </div>
        `;
      }
    });

    return result;
  };

  // 配置图表
  const option = {
    color: elementColors,
    tooltip: {
      appendToBody: true,
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 51, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0',
        fontSize: 13
      },
      padding: [8, 12],
      formatter: tooltipFormatter,
      extraCssText: 'z-index: 9999 !important; max-width: 280px;'
    },
    legend: {
      data: weatherElements.value.map((el) => ({
        name: el.name,
        icon: 'rect',
        itemStyle: { color: el.color },
      })),
      top: '5%',
      left: '10%',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20,
      textStyle: {
        color: '#ffffff',
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '0%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      min: xRange.min,
      max: xRange.max,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        rotate: 0,
        fontSize: 10,
        formatter: (value) => formatTimeHm(new Date(value)),
      },
      splitLine: { show: false },
    },
    // 双Y轴配置
    yAxis: [
      // 左Y轴：风速（折线图）
      {
        type: 'value',
        name: 'm/s',
        min: 0,
        max: 30,
        position: 'left',
        axisLine: {
          lineStyle: {
            color: '#f97316'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          formatter: '{value}'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)',
            type: 'solid'
          }
        }
      },
      // 右Y轴：能见度（折线图）
      {
        type: 'value',
        name: 'km',
        min: 0,
        max: 50,
        position: 'right',
        offset: 0,
        axisLine: {
          lineStyle: {
            color: '#22c55e'
          }
        },
        axisTick: { show: true },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          formatter: '{value}'
        },
        splitLine: { show: false }
      },
      // 右Y轴：降水量（柱状图）
      {
        type: 'value',
        name: 'mm',
        min: 0,
        max: 10,
        position: 'right',
        offset: 15,
        axisLine: {
          lineStyle: {
            color: '#3b82f6'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          formatter: '{value}'
        },
        splitLine: { show: false }
      }
    ],
    series: [
      // 风速：折线图（橙色区域图）
      {
        name: '风速',
        type: 'line',
        color: '#f97316',
        yAxisIndex: 0,
        data: pairSeriesData(data, data.wind_speed_10m, referenceTime),
        smooth: true,
        lineStyle: {
          color: '#f97316',
          width: 1,
        },
        itemStyle: {
          color: '#f97316',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1,
            [
              { offset: 0, color: 'rgba(249, 115, 22, 0.8)' },
              { offset: 1, color: 'rgba(249, 115, 22, 0.2)' }
            ]
          )
        },
        symbol: 'none'
      },
      // 能见度：折线图（绿色区域图）
      {
        name: '能见度',
        type: 'line',
        color: '#22c55e',
        yAxisIndex: 1,
        data: pairSeriesData(data, data.visibility, referenceTime),
        smooth: true,
        lineStyle: {
          color: '#22c55e',
          width: 1,
        },
        itemStyle: {
          color: '#22c55e',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1,
            [
              { offset: 0, color: 'rgba(34, 197, 94, 0.8)' },
              { offset: 1, color: 'rgba(34, 197, 94, 0.2)' }
            ]
          )
        },
        symbol: 'none'
      },
      // 降水：柱状图（蓝色柱状图）
      {
        name: '降水量',
        type: 'bar',
        color: '#3b82f6',
        yAxisIndex: 2,
        data: pairSeriesData(data, data.precipitation, referenceTime),
        barWidth: '40%',
        itemStyle: {
          color: '#3b82f6',
          opacity: 1,
        },
        emphasis: {
          itemStyle: {
            color: '#3b82f6',
            opacity: 1
          }
        }
      }
    ]
  };

  // 设置图表配置
  trendChartInstance.setOption(option, true);
};

// 窗口大小变化处理
const handleResize = () => {
  if (trendChartInstance) {
    try {
      trendChartInstance.resize();
    } catch (error) {
      console.error('调整趋势图表尺寸失败:', error);
    }
  }
};

// 初始化图表并在有数据时立即渲染
const initCharts = () => {
  if (!trendChartRef.value) {
    console.error('图表容器不存在，无法初始化图表');
    return;
  }

  if (trendChartInstance) {
    trendChartInstance.dispose();
    trendChartInstance = null;
  }

  try {
    trendChartInstance = echarts.init(trendChartRef.value);
    if (weatherForecastPanelData.value) {
      updateTrendChart(weatherForecastPanelData.value);
    }
  } catch (error) {
    console.error('创建图表实例失败:', error);
  }
};

// 监听模块数据变化
watch(weatherForecastPanelData, (newData) => {
  if (!newData) return;
  if (!trendChartInstance && trendChartRef.value) {
    initCharts();
    return;
  }
  updateTrendChart(newData);
}, { deep: true, immediate: true });


// 组件挂载
onMounted(() => {
  nextTick(() => {
    window.addEventListener('resize', handleResize);
    initCharts();
  });
});

// 组件卸载
onUnmounted(() => {
  // 销毁图表实例
  if (trendChartInstance) {
    trendChartInstance.dispose();
    trendChartInstance = null;
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize);

});
watch(
  () => moduleStore.currentModule,
  (newVal) => {
    nextTick(() => {
      handleResize();
    });
  }
);
</script>

<style scoped>
.weather-analysis-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 面板标题样式 */
.panel-sub-header {
  position: relative;
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px 4px 0 0;
}

.panel-title {
  margin: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.panel-sub-header:hover .panel-title {
  color: #3b82f6;
}

.selectors-container {
  /* 默认完全隐藏 */
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(15, 23, 51, 0.95);
  border-radius: 0 0 4px 4px;
  padding: 10px;
  margin: 0;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 当鼠标悬停在标题上时显示选择器 */
.panel-sub-header:hover .selectors-container,
.panel-sub-header:focus-within .selectors-container {
  display: block;
}

/* 显示时的动画效果 */
.selectors-container {
  animation: fadeInDown 0.2s ease-out;
}

/* 选择器内部样式 */
.selector-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.selector-wrapper:last-child {
  margin-bottom: 0;
}

.selector-label {
  color: #94a3b8;
  font-size: 13px;
  white-space: nowrap;
}

.select-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.select-buttons button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  padding: 5px 12px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-buttons button:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
}

.select-buttons button.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #3b82f6;
}

/* 优化图表容器样式 */
.charts-container {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-section {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  margin-bottom: 8px;
  position: relative;

  &:last-child {
    margin-bottom: 0;
  }
}

.chart-wrapper {
  /* 确保图表包装器有明确的尺寸和定位 */
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: block;
}

.trend-chart,
.profile-chart {
  /* 强制图表容器尺寸，确保占满父容器 */
  width: 100%;
  height: 100%;
  min-height: 130px;
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: 1;
}

.chart-actions {
  position: absolute;
  top: 5px;
  right: 10px;
  z-index: 5;
}

.chart-actions button {
  background: rgba(15, 23, 51, 0.8);
  border: 1px solid #3b82f6;
  color: #e2e8f0;
  padding: 2px 8px;
  font-size: 12px;
  margin-left: 5px;
  cursor: pointer;
}

/* 热力图容器 */
.profile-chart {
  min-height: 150px;
}

.loading-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  z-index: 10;
}

.loading-state .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.loading-state p {
  margin: 0;
  font-size: 13px;
}

/* 动画定义 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .selectors-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chart-section {
    height: 200px;
  }

  .trend-chart,
  .profile-chart {
    min-height: 200px;
  }
}
</style>