<template>
  <div class="suitability-chart-container">

    <div ref="chartRef" class="chart-wrapper"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useDashboardStore } from "@/store/modules/dashboard";
import { getWeatherSuitability } from "@/api";
import { useMonitoringPointStore } from "@/store/modules/monitoringPoints";
const monitoringPointStore = useMonitoringPointStore();
const dashboardStore = useDashboardStore();
const chartRef = ref(null);
const chartData = ref(null);
let chartInstance = null;
const loadData = async () => {
  try {
    const data = await getWeatherSuitability(monitoringPointStore.selectedPoint);

    // 适配新的数据结构格式
    // 从suitabilityList中提取factors、statusData和valueData
    const adaptedData = {
      timeInterval: data.timeInterval,
      totalHours: data.totalHours,
      factors: data.suitabilityList.map(item => item.factor),
      statusData: data.suitabilityList.map(item =>
        item.detail.map(detail => detail.statusData)
      ),
      valueData: data.suitabilityList.map(item =>
        item.detail.map(detail => detail.valueData)
      )
    };

    chartData.value = adaptedData;
    console.log('Data loaded and adapted:', chartData.value);

    // 数据加载完成后初始化图表
    if (chartRef.value && adaptedData) {
      initChart();
    }
  } catch (error) {
    console.error('Failed to load weather suitability data:', error);
  }
}

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
  console.log('Initializing chart with data:', chartData.value);

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
      right: 0,   // 右侧留少量空间
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
// 窗口大小变化时重绘
const handleResize = () => {
  chartInstance?.resize();
};


watch(
  () => dashboardStore.currentModule,
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
// 监听选中监测点变化
watch(
  () => monitoringPointStore.selectedPoint,
  (newPoint) => {
    if (newPoint) {
      loadData();
    }
  }
);
</script>

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