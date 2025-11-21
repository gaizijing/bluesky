<template>
  <div class="weather-analysis-panel" ref="panelRef">
    <!-- 标题作为交互触发点 -->
    <div class="panel-sub-header">
      <h3 class="panel-title" title="点击或悬停查看选项">{{ dynamicPanelTitle }}</h3>

      <!-- 隐藏的选择器区域，鼠标悬停在标题上时显示 -->
      <div class="selectors-container">
        <div class="selector-wrapper">
          <span class="selector-label">要素：</span>
          <div class="select-buttons">
            <button v-for="(item, index) in weatherElements" :key="index" :class="{ active: selectedElement === index }"
              :style="{ '--element-color': item.color }" @click="selectElement(index)">
              {{ item.name }}
            </button>
          </div>
        </div>

        <div class="selector-wrapper">
          <span class="selector-label">时间：</span>
          <div class="select-buttons">
            <button v-for="range in timeRanges" :key="range.value"
              :class="{ active: selectedTimeRange === range.value }" @click="selectTimeRange(range.value)">
              {{ range.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
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

      <!-- 适飞指数图表 -->
      <div class="chart-section">
        <div class="chart-wrapper">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>加载数据中...</p>
          </div>
          <div ref="profileChartRef" class="profile-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import { useMonitoringPointStore } from "@/store/modules/monitoringPoints";
import { getWeatherForecastTrend, getWeatherForecastHeatmap } from "@/api";
import { useDashboardStore } from "@/store/modules/dashboard";

const dashboardStore = useDashboardStore();

// Store引用
const monitoringPointStore = useMonitoringPointStore();

// 图表实例
let trendChartInstance = null;
let profileChartInstance = null;

// 图表引用
const trendChartRef = ref(null);
const profileChartRef = ref(null);
const panelRef = ref(null);

// 状态
const isLoading = ref(false);
const selectedElement = ref(0); // 默认选中第一个气象要素
const selectedTimeRange = ref('3h'); // 默认3小时

// 气象要素配置
const weatherElements = ref([
  {
    name: '风速',
    unit: 'm/s',
    color: '#3b82f6',
    type: 'windSpeed'
  },
  {
    name: '风向',
    unit: '°',
    color: '#8b5cf6',
    type: 'windDirection'
  },
  {
    name: '风切变',
    unit: 's⁻¹',
    color: '#f59e0b',
    type: 'windShear'
  },
  {
    name: '湍流',
    unit: 'm²/s³',
    color: '#ef4444',
    type: 'turbulence'
  }
]);

// 时间范围配置
const timeRanges = ref([
  { label: '1小时', value: '1h' },
  { label: '3小时', value: '3h' },
  { label: '6小时', value: '6h' }
]);

// 当前选中的气象要素配置
const currentElementConfig = computed(() => weatherElements.value[selectedElement.value]);

// 动态生成面板标题
const dynamicPanelTitle = computed(() => {
  const elementName = currentElementConfig.value.name;
  let timeLabel = '';

  // 根据选中的时间范围确定时间标签
  switch (selectedTimeRange.value) {
    case '1h':
      timeLabel = '1小时';
      break;
    case '3h':
      timeLabel = '3小时';
      break;
    case '6h':
      timeLabel = '6小时';
      break;
    default:
      timeLabel = '3小时';
  }

  return `${timeLabel}${elementName}预测`;
});

// 获取风向文本（8方向）
const getDirectionText = (degree) => {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(degree / 45) % 8;
  return dirs[index];
};

// 选择气象要素
const selectElement = (index) => {
  selectedElement.value = index;
  loadData();
};

// 选择时间范围
const selectTimeRange = (range) => {
  selectedTimeRange.value = range;
  loadData();
};

// 将原来的loadData函数替换为：
const loadData = async () => {
  console.log('开始加载数据，时间范围:', selectedTimeRange.value, '气象要素:', currentElementConfig.value.name);
  isLoading.value = true;
  try {
    // 调用模拟API获取数据
    const trendData = await getWeatherForecastTrend({
      pointId: monitoringPointStore.selectedPoint?.id || 'mock-point',
      element: currentElementConfig.value.type,
      timeRange: selectedTimeRange.value
    });

    const profileData = await getWeatherForecastHeatmap({
      pointId: monitoringPointStore.selectedPoint?.id || 'mock-point',
      timeRange: selectedTimeRange.value
    });

    // 更新图表
    updateTrendChart(trendData);
    updateProfileChart(profileData);
  } catch (error) {
    console.error('加载数据失败:', error);
  } finally {
    isLoading.value = false;
  }
};


// 更新趋势图表
const updateTrendChart = (data) => {
  if (!trendChartInstance) {
    return;
  }

  // 处理API返回的数据格式
  const chartData = data.success ? data.data : data;

  if (!chartData || !chartData.trend) {
    return;
  }

  const trendData = chartData.trend;
  const unit = chartData.unit || currentElementConfig.value.unit;

  // 使用数据中提供的时间标签（如果有），否则生成默认标签
  let timeLabels = chartData.timeLabels;
  if (!timeLabels) {
    // 提取X轴时间
    timeLabels = trendData.map(item => {
      const date = new Date(item.time);
      return item.time;
    });
  }

  // 根据选中的气象要素处理数据
  let seriesData;
  let yAxisConfig;
  let tooltipFormatter;

  if (currentElementConfig.value.type === 'windDirection') {
    // 风向特殊处理 - 保持原来的散点图样式
    seriesData = trendData.map((item, index) => ({
      value: [index, item.value],
      symbolRotate: item.value
    }));

    yAxisConfig = {
      type: 'value',
      name: `${currentElementConfig.value.name} (${currentElementConfig.value.unit})`,
      nameTextStyle: { color: currentElementConfig.value.color },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(51, 65, 85, 0.3)',
          type: 'dashed'
        }
      },
      min: 0,
      max: 360,
      interval: 90
    };

    tooltipFormatter = (params) => {
      const index = params[0].dataIndex;
      const item = trendData[index];
      return `
        <div style="margin-bottom: 6px">
          <strong style="color: #3b82f6">${timeLabels[index]}</strong>
        </div>
        <div style="margin: 4px 0; line-height: 1.4">
          <span style="color: #94a3b8; display: inline-block; width: 60px">${currentElementConfig.value.name}：</span>
          <span>${item.value}° (${getDirectionText(item.value)})</span>
        </div>
      `;
    };
  } else {
    // 其他气象要素（风速、温度、湿度）- 应用新的样式
    seriesData = trendData.map(item => item.value);

    // 计算合理的Y轴范围
    let min = Math.min(...seriesData);
    let max = Math.max(...seriesData);
    const padding = (max - min) * 0.1;
    min = Math.floor(min - padding);
    max = Math.ceil(max + padding);

    if (currentElementConfig.value.type === 'humidity') {
      min = 0;
      max = Math.min(max, 100);
    }

    yAxisConfig = {
      type: 'value',
      name: `${currentElementConfig.value.name} (${currentElementConfig.value.unit})`,
      nameTextStyle: { color: '#ef4444' }, // 使用红色
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(51, 65, 85, 0.3)',
          type: 'dashed'
        }
      },
      min: min,
      max: max
    };

    tooltipFormatter = (params) => {
      const index = params[0].dataIndex;
      const item = trendData[index];
      return `
        <div style="margin-bottom: 6px">
          <strong style="color: #3b82f6">${timeLabels[index]}</strong>
        </div>
        <div style="margin: 4px 0; line-height: 1.4">
          <span style="color: #94a3b8; display: inline-block; width: 60px">${currentElementConfig.value.name}：</span>
          <span>${item.value} ${currentElementConfig.value.unit}</span>
        </div>
      `;
    };
  }

  // 配置图表
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 51, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0',
        fontSize: 13
      },
      padding: [8, 12],
      formatter: tooltipFormatter
    },
    grid: {
      left: '5%',
      right: '8%',
      bottom: '15%',
      top: '23%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#94a3b8',
        interval: 0, // 显示所有标签
        rotate: 0 // 不旋转
      },
      splitLine: { show: false }
    },
    yAxis: yAxisConfig,
    series: [
      {
        name: currentElementConfig.value.name,
        type: currentElementConfig.value.type === 'windDirection' ? 'scatter' : 'line',
        data: seriesData,
        smooth: true, // 所有折线都平滑
        symbol: currentElementConfig.value.type === 'windDirection' ? 'path://M0,0 L8,0 L4,-6 Z' : 'none', // 非风向不显示点
        symbolSize: currentElementConfig.value.type === 'windDirection' ? 12 : 6,
        // 使用当前要素的颜色配置，不再硬编码红色
        lineStyle: {
          color: currentElementConfig.value.color, // 所有要素使用自己配置的颜色
          width: currentElementConfig.value.type === 'windDirection' ? 0 : 1
        },
        itemStyle: {
          color: currentElementConfig.value.color // 所有要素使用自己配置的颜色
        },
        areaStyle: currentElementConfig.value.type !== 'windDirection' ? {
          // 根据当前要素颜色动态生成渐变填充
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1, // 渐变方向：从上到下
            [
              { offset: 0, color: currentElementConfig.value.color + '99' }, // 上方：半透明颜色
              { offset: 1, color: currentElementConfig.value.color + '0D' } // 下方：接近透明
            ]
          ),
          // 阴影发光核心配置 - 使用要素颜色
          shadowBlur: 30,
          shadowColor: currentElementConfig.value.color + 'B3', // 与折线同色系，半透明
          shadowOffsetY: 5,
          shadowOffsetX: 0
        } : undefined,
        label: {
          show: false
        },
        emphasis: {
          symbolSize: currentElementConfig.value.type === 'windDirection' ? 8 : 6
        }
      }
    ]
  };

  trendChartInstance.setOption(option, true);
};

// 更新适飞指数图表
const updateProfileChart = (data) => {
  if (!profileChartInstance) {
    return;
  }

  if (!data) {
    return;
  }

  // 处理API返回的数据格式
  const chartData = data.success ? data.data : data;

  if (!chartData || (!chartData.data && !chartData.profile)) {
    return;
  }

  // 兼容不同的数据格式
  const timeLabels = chartData.times || chartData.timeLabels || ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const flightSuitabilityData = chartData.data || chartData.profile;

  // 处理高度标签
  let heightLabels;
  if (chartData.heights) {
    heightLabels = chartData.heights.map(h => `${h}m`);
  } else if (chartData.heightLabels) {
    heightLabels = chartData.heightLabels;
  } else {
    heightLabels = ['0m', '20m', '40m', '60m', '80m', '100m'];
  }

  // 准备热力图数据
  const heatmapData = [];
  for (let h = 0; h < flightSuitabilityData.length; h++) {
    for (let t = 0; t < flightSuitabilityData[h].length; t++) {
      heatmapData.push([t, h, flightSuitabilityData[h][t]]);
    }
  }

  // 配置图表
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { dataIndex } = params;
        const timeIdx = dataIndex % timeLabels.length;
        const heightIdx = Math.floor(dataIndex / timeLabels.length);
        const value = flightSuitabilityData[heightIdx][timeIdx];

        // 适飞等级判断
        let level = '优';
        let levelColor = '#10b981';
        if (value < 60) {
          level = '差';
          levelColor = '#ef4444';
        } else if (value < 80) {
          level = '良';
          levelColor = '#f59e0b';
        }

        return `
          <div>
            <div>时间：${timeLabels[timeIdx]}</div>
            <div>高度：${heightLabels[heightIdx]}</div>
            <div>适飞指数：${value}</div>
            <div>适飞等级：<span style="color: ${levelColor}; font-weight: bold">${level}</span></div>
          </div>
        `;
      },
      backgroundColor: 'rgba(15, 23, 51, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0',
        fontSize: 13
      },
      padding: [8, 12]
    },
    grid: {
      left: '1%',
      right: '5%',
      top: '1%',
      bottom: '1%', // 增加底部空间以显示横坐标标签
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        interval: 0 // 显示所有标签
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: heightLabels,
      inverse: false,
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11
      },
      splitLine: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      calculable: true,
      dimension: 2,
      inRange: {
        color: ['#ef4444', '#fbbf24', '#a3e635', '#10b981'] // 增加中间色阶
      }
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#fff', // 白色文字
          fontSize: 12 // 可根据需要调整字体大小，增强可读性
        },
        emphasis: {
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  profileChartInstance.setOption(option, true);
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
  if (profileChartInstance) {
    try {
      profileChartInstance.resize();
    } catch (error) {
      console.error('调整廓线图表尺寸失败:', error);
    }
  }
};

// 初始化图表
const initCharts = () => {
  // 确保容器存在
  if (!trendChartRef.value || !profileChartRef.value) {
    console.error('图表容器不存在，无法初始化图表');
    return;
  }


  // 销毁现有图表实例
  if (trendChartInstance) {
    trendChartInstance.dispose();
    trendChartInstance = null;
  }
  if (profileChartInstance) {
    profileChartInstance.dispose();
    profileChartInstance = null;
  }

  try {
    // 创建新的图表实例
    trendChartInstance = echarts.init(trendChartRef.value);
    profileChartInstance = echarts.init(profileChartRef.value);
    loadData();
  } catch (error) {
    console.error('创建图表实例失败:', error);
  }
};

// 监听选中监测点变化
watch(
  () => monitoringPointStore.selectedPoint,
  (newPoint) => {
    if (newPoint) {
      loadData();
    }
  }
);

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
  if (profileChartInstance) {
    profileChartInstance.dispose();
    profileChartInstance = null;
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize);

});
watch(
  () => dashboardStore.currentModule,
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
  min-height: 260px;
  display: block;
  position: relative;
  overflow: visible;
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
  height: auto;
  min-height: 260px;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

.chart-section {
  height: 140px;
  width: 100%;
  margin-bottom: 10px;
  position: relative;
}

/* 为热力图部分增加额外的高度 */
.chart-section:last-child {
  height: 150px;
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