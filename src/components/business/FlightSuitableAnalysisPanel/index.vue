<template>
  <div class="suitability-chart-container">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>
    <div ref="chartRef" class="chart-wrapper"></div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { useModuleStore } from "@/store/modules/module";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";

const moduleStore = useModuleStore();
const dashboardWeatherStore = useDashboardWeatherStore();
const chartRef = ref(null);
const chartData = ref(null);
let chartInstance = null;
const flightSuitableAnalysisPanelData = computed(() => {
  return dashboardWeatherStore.getFlightSuitableAnalysisPanelData();
});
// 生成时间标签（从当前整点开始，每10分钟一个，共3小时）
const getTimeLabels = () => {
  const labels = [];
  const now = new Date();

  // 获取当前整点时间
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  // 生成从当前整点开始的19个时间点（每10分钟一个，3小时=18个间隔+1个起始点）
  for (let i = 0; i < 19; i++) {
    const time = new Date(currentHour.getTime() + i * 10 * 60000); // 每10分钟增加
    labels.push(time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }));
  }

  return labels;
};

// 初始化图表
const initChart = () => {
  // 确保有数据和图表容器才初始化
  if (!chartData.value || !chartRef.value) {
    console.warn('Cannot initialize chart: data or chart reference is missing');
    return;
  }

  if (chartInstance) {
    chartInstance.dispose();
  }
  chartInstance = echarts.init(chartRef.value);

  const timeLabels = getTimeLabels();
  const factorCount = chartData.value.factors.length;
  const timeCount = timeLabels.length; // 19个时间点

  // 构建热力图数据（[x轴索引, y轴索引, 状态值]）
  const data = [];
  for (let factorIdx = 0; factorIdx < factorCount; factorIdx++) {
    for (let timeIdx = 0; timeIdx < timeCount; timeIdx++) {
      data.push([
        timeIdx,  // x轴：时间索引（0-18）
        factorIdx,  // y轴：因素索引（0-6）
        chartData.value.statusData[factorIdx][timeIdx] ? 1 : 0  // 1=适飞，0=不适飞
      ]);
    }
  }

  const option = {
    tooltip: {
      formatter: (params) => {
        const { dataIndex } = params;
        const factorIdx = Math.floor(dataIndex / timeCount);
        const timeIdx = dataIndex % timeCount;
        return `
          <div>${chartData.value.factors[factorIdx]}</div>
          <div>时间：${timeLabels[timeIdx]}</div>
          <div>状态：${chartData.value.statusData[factorIdx][timeIdx] ? '适飞' : '不适飞'}</div>
          ${chartData.value.valueData[factorIdx][timeIdx] ? `<div>数值：${chartData.value.valueData[factorIdx][timeIdx]}</div>` : ''}
        `;
      }
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      pieces: [
        { value: 1, color: '#28a745' },  // 适飞（绿色）
        { value: 0, color: '#dc3545' }   // 不适飞（红色）
      ]
    },
    grid: {
      left: 60,    // 左侧留空间显示气象因素
      right: 20,   // 右侧留少量空间
      bottom: 30,  // 底部留更多空间显示时间标签
      top: 10
    },
    xAxis: {
      type: 'category',
      data: timeLabels,  // 19个时间标签
      axisLine: { lineStyle: { color: '#475467' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        rotate: 45,    // 旋转45度防止文字重叠
        interval: (index) => {
          // 只显示整点和半点（即分钟为00, 30）的文字
          const timeStr = timeLabels[index];
          if (timeStr) {
            const minute = timeStr.split(':')[1];
            return (minute === '00' || minute === '30') ? -1 : 0;
          }
          return -1;
        }
      }
    },
    yAxis: {
      type: 'category',
      data: chartData.value.factors,
      axisLine: { lineStyle: { color: '#475467' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
      inverse: true  // 第一个因素显示在顶部
    },
    series: [{
      type: 'heatmap',
      data: data,
      label: {
        show: true,
        color: '#fff',
        fontSize: 9,
        formatter: (params) => {
          const { dataIndex } = params;
          const factorIdx = Math.floor(dataIndex / timeCount);
          const timeIdx = dataIndex % timeCount;
          return chartData.value.valueData[factorIdx][timeIdx] || '';  // 显示异常值
        }
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#0f1733'  // 网格线颜色
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 1,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  chartInstance.setOption(option);
};

// 更新图表数据
const updateChartData = () => {
  let adaptedData;
  
  // 使用从store获取的实际数据
  if (flightSuitableAnalysisPanelData.value) {
    adaptedData = flightSuitableAnalysisPanelData.value;
  } else {
    // 没有数据时使用默认数据，确保组件能正常渲染
    adaptedData = {
      timeInterval: '10min',
      totalHours: 3,
      factors: ['风速', '能见度', '降水量', '温度', '湿度', '气压', '云量'],
      statusData: Array(7).fill().map(() => Array(19).fill(true)),
      valueData: Array(7).fill().map(() => Array(19).fill().map(() => (Math.random() * 10).toFixed(1)))
    };
  }

  chartData.value = adaptedData;
  initChart();
};

// 窗口大小变化时重绘
const handleResize = () => {
  chartInstance?.resize();
};

// 监听模块数据变化
watch(flightSuitableAnalysisPanelData, (newData) => {
  updateChartData();
}, { deep: true });

// 监听模块切换
watch(
  () => moduleStore.currentModule,
  (newVal) => {
    // 等待 DOM 更新
    nextTick(() => {
      // 如果图表已初始化，直接 resize
      if (chartInstance) {
        chartInstance.resize();
      }
    });
  }
);


onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  z-index: 10;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #94a3b8;
  font-size: 13px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style scoped>
.suitability-chart-container {}

.header {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.chart-wrapper {
  width: 100%;
  height: 200px;
  /* 增加高度适配12列 */
}
</style>