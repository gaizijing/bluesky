<template>
  <div class="suitability-chart-container">
  
    <div ref="chartRef" class="chart-wrapper"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted,nextTick } from 'vue';
import * as echarts from 'echarts';
import { useDashboardStore } from "@/store/modules/dashboard"; 
const dashboardStore = useDashboardStore();
const chartRef = ref(null);
let chartInstance = null;

const props = defineProps({
  factors: {
    type: Array,
    default: () => ['综合', '风', '风切变', '颠簸指数', '湍流', '降水', '能见度']
  },
  timeInterval: {
    type: Number,
    default: 10  // 改为10分钟间隔
  },
  totalHours: {
    type: Number,
    default: 3  // 总时长改为3小时
  },
  // 19个时间点的适飞状态（7个因素×19个时间点）
  statusData: {
    type: Array,
    default: () => [
      // 综合
      [true, true, false, false, false, true, true, true, false, false, true, true, false, true, true, false, false, true, true],
      // 风
      [true, true, false, false, true, true, true, false, false, true, true, true, true, false, false, true, true, true, false],
      // 风切变
      [true, false, false, true, true, true, false, false, true, true, true, true, false, false, true, true, true, false, true],
      // 颠簸指数
      [true, true, true, false, false, true, true, true, true, false, false, true, true, true, false, false, true, true, false],
      // 湍流（全适飞）
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      // 降水（全适飞）
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      // 能见度（全适飞）
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
    ]
  },
  // 19个时间点的异常值数据
  valueData: {
    type: Array,
    default: () => [
      // 综合（无具体值）
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 风（异常值）
      ['', '', '9m/s', '9m/s', '', '', '', '8m/s', '8m/s', '', '', '', '9m/s', '', '', '8m/s', '8m/s', '', '9m/s'],
      // 风切变（异常值）
      ['', '7m/s', '7m/s', '', '', '', '6m/s', '6m/s', '', '', '', '7m/s', '7m/s', '6m/s', '', '', '', '6m/s', '7m/s'],
      // 颠簸指数（异常值）
      ['', '', '', '中', '中', '', '', '', '', '中', '中', '', '', '', '中', '中', '', '', '中'],
      // 湍流（无异常值）
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 降水（无异常值）
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 能见度（无异常值）
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ]
  }
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
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  chartInstance = echarts.init(chartRef.value);
  
  const timeLabels = getTimeLabels();
  const factorCount = props.factors.length;
  const timeCount = timeLabels.length; // 19个时间点
  
  // 构建热力图数据（[x轴索引, y轴索引, 状态值]）
  const data = [];
  for (let factorIdx = 0; factorIdx < factorCount; factorIdx++) {
    for (let timeIdx = 0; timeIdx < timeCount; timeIdx++) {
      data.push([
        timeIdx,  // x轴：时间索引（0-18）
        factorIdx,  // y轴：因素索引（0-6）
        props.statusData[factorIdx][timeIdx] ? 1 : 0  // 1=适飞，0=不适飞
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
          <div>${props.factors[factorIdx]}</div>
          <div>时间：${timeLabels[timeIdx]}</div>
          <div>状态：${props.statusData[factorIdx][timeIdx] ? '适飞' : '不适飞'}</div>
          ${props.valueData[factorIdx][timeIdx] ? `<div>数值：${props.valueData[factorIdx][timeIdx]}</div>` : ''}
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
      data: props.factors,
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
          return props.valueData[factorIdx][timeIdx] || '';  // 显示异常值
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

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

// 数据变化时重绘
watch(() => [props.statusData, props.valueData], initChart);
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    // 等待 DOM 更新
    nextTick(() => {
      // 如果图表已初始化，直接 resize；否则初始化图表
      if (chartInstance) {
        chartInstance.resize();
      } else {
        initChart();
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
.suitability-chart-container {
}

.header {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.chart-wrapper {
  width: 100%;
  height: 200px;  /* 增加高度适配12列 */
}
</style>