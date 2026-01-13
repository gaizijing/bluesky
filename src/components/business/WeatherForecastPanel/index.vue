<template>
  <div class="weather-analysis-panel" ref="panelRef">


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
import { useAreaStore } from "@/store/modules/area";
import { useModuleStore } from "@/store/modules/module";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";

const moduleStore = useModuleStore();
const dashboardWeatherStore = useDashboardWeatherStore();


// 图表实例
let trendChartInstance = null;
let profileChartInstance = null;

// 图表引用
const trendChartRef = ref(null);
const profileChartRef = ref(null);


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

  // 提取时间标签（只显示小时）
  const timeLabels = data.time.map(item => {
    const date = new Date(item);
    return `${date.getHours().toString().padStart(2, '0')}`;
  });
  // 当前时间索引（根据当前小时数定位）
  const currentHour = new Date().getHours();
  const currentHourStr = currentHour.toString().padStart(2, '0');
  const currentIndex = timeLabels.indexOf(currentHourStr);

  // 自定义tooltip格式化器
  const tooltipFormatter = (params) => {
    let result = `<div style="margin-bottom: 6px"><strong style="color: #3b82f6">${timeLabels[params[0].dataIndex]}</strong></div>`;

    params.forEach(param => {
      const element = weatherElements.value.find(el => el.name === param.seriesName);
      if (element) {
        result += `
          <div style="margin: 4px 0; line-height: 1.4">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${element.color}; margin-right: 6px;"></span>
            <span style="color: #94a3b8; display: inline-block; width: 60px">${element.name}：</span>
            <span style="color: ${element.color}">${param.value} ${element.unit}</span>
          </div>
        `;
      }
    });

    return result;
  };

  // 配置图表
  const option = {
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
    legend: {
      data: ['风速', '能见度', '降水量'],
      top: '5%',
      left: '10%',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20,
      icon: 'rect',
      textStyle: {
        color: '#ffffff'
      }
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '0%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        rotate: 0,
        fontSize: 10
      },
      splitLine: { show: false },
      axisPointer: {
        value: timeLabels[currentIndex],
        snap: true,
        lineStyle: {
          color: '#7581BD',
          width: 1
        },
        
        handle: {
          show: true,
          color: '#7581BD'
        }
      },
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
        yAxisIndex: 0,
        data: data.wind_speed_10m,
        smooth: true,
        lineStyle: {
          color: '#f97316',
          width: 1
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
        yAxisIndex: 1,
        data: data.visibility,
        smooth: true,
        lineStyle: {
          color: '#22c55e',
          width: 1
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
        yAxisIndex: 2,
        data: data.precipitation,
        barWidth: '40%',
        itemStyle: {
          color: '#3b82f6',
          opacity: 1
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

// 更新适飞指数图表
const updateProfileChart = (data) => {
  if (!profileChartInstance || !data) {
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
      bottom: '1%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        interval: 0
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
        color: ['#10b981 ', '#a3e635 ', '#fbbf24', '#f97316 ','#ef4444']
      }
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#fff',
          fontSize: 12
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
   
  } catch (error) {
    console.error('创建图表实例失败:', error);
  }
};

// 监听模块数据变化
watch(weatherForecastPanelData, (newData) => {
  if (newData) {
    updateTrendChart(newData.trendData);
    updateProfileChart(newData.heatmapData);
  }
}, { deep: true });


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