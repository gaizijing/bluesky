<template>
  <div class="wind-trend-card">
    <!-- 图表区域 -->
    <div class="chart-container">
      <div ref="chartRef" class="trend-chart"></div>
    </div>

  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useDashboardStore } from "@/store/modules/dashboard";
const dashboardStore = useDashboardStore();

// 监测点配置
const monitorPoints = ref([
  { id: 'p1', name: 'A机场起降坪' },
  { id: 'p2', name: 'B区域作业点' },
  { id: 'p3', name: 'C航线中途点' }
])
const currentPointId = ref('p1')
const currentPoint = ref(monitorPoints.value[0])
const updateTime = ref('2025-11-05 16:00:00')

// 图表实例与状态
const chartRef = ref(null)
let trendChart = null
const showTooltip = ref(false)
const tooltipData = ref({})
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

// 生成3小时趋势数据（每30分钟一个点，共7个时间点）
const generateTrendData = (pointId) => {
  // 不同监测点的基础数据偏移量，模拟地域差异
  const offsets = {
    p1: { windSpeed: 2, windDir: 30 },
    p2: { windSpeed: 3.5, windDir: 90 },
    p3: { windSpeed: 1.5, windDir: 180 }
  }
  const offset = offsets[pointId] || offsets.p1
  
  const baseTime = new Date()
    const currentHour = new Date(baseTime.getFullYear(), baseTime.getMonth(), baseTime.getDate(), baseTime.getHours(), 0, 0, 0);

  return Array(7).fill(0).map((_, i) => {
    // 时间递增（当前时间 + 0~3小时，每30分钟）
    const time = new Date(currentHour.getTime() + i * 30 * 60 * 1000)
    const hour = time.getHours().toString().padStart(2, '0')
    const minute = time.getMinutes().toString().padStart(2, '0')
    
    // 风速：基础值 + 周期性波动
    const windSpeed = +(offset.windSpeed + 3 * Math.sin(i * 0.5) + Math.random() * 1.5).toFixed(1)
    // 风向：基础值 + 随机偏移
    const windDir = Math.floor(offset.windDir + Math.random() * 60 - 30) % 360
    // 置信区间（上下浮动）
    const upper = +(windSpeed + 0.8 + Math.random() * 0.5).toFixed(1)
    const lower = +(windSpeed - 0.8 - Math.random() * 0.5).toFixed(1)
    
    return {
      time: `${hour}:${minute}`,
      windSpeed,
      windDir,
      upper,
      lower,
      deviation: +((upper - lower) / 2).toFixed(1) // 偏差值
    }
  })
}

// 当前趋势数据
const trendData = ref(generateTrendData(currentPointId.value))

// 初始化图表
const initChart = () => {
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(chartRef.value)
  
  // 提取X轴时间
  const timeLabels = trendData.value.map(item => item.time)
  
  // 图表配置
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
      formatter: (params) => {
        // 查找风速系列的数据
        const windSpeedSeries = params.find(p => p.seriesIndex === 2)
        if (!windSpeedSeries) return ''
        
        const index = windSpeedSeries.dataIndex
        const data = trendData.value[index]
        if (!data) return ''
        
        return `
          <div style="margin-bottom: 6px">
            <strong style="color: #3b82f6">${data.time}</strong>
          </div>
          <div style="margin: 4px 0; line-height: 1.4">
            <span style="color: #94a3b8; display: inline-block; width: 60px">风速：</span>
            <span>${data.windSpeed} m/s</span>
          </div>
          <div style="margin: 4px 0; line-height: 1.4">
            <span style="color: #94a3b8; display: inline-block; width: 60px">风向：</span>
            <span>${data.windDir}° (${getDirectionText(data.windDir)})</span>
          </div>
          <div style="margin: 4px 0; line-height: 1.4">
            <span style="color: #94a3b8; display: inline-block; width: 60px">预测偏差：</span>
            <span>±${data.deviation} m/s</span>
          </div>
        `
      }
    },
 
    grid: {
      left: '5%',
      right: '0%',
      bottom: '10%',
      top: '18%',
      containLabel: true
    },
    // 双Y轴配置（左侧风速，右侧风向）
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '风速 (m/s)',
        nameTextStyle: { color: '#3b82f6' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.3)' } },
        min: 0,
        max: 15
      },
      {
        type: 'value',
        name: '风向 (°)',
        nameTextStyle: { color: '#8b5cf6' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { show: false },
        min: 0,
        max: 360,
        position: 'right'
      }
    ],
    series: [
      // 1. 置信区间阴影
      {
        name: '置信区间',
        type: 'line',
        data: trendData.value.map(item => item.upper),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        },
        z: 1
      },
      {
        name: '置信区间',
        type: 'line',
        data: trendData.value.map(item => item.lower),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.2)' }
          ])
        },
        z: 1
      },
      // 2. 风速折线
      {
        name: '风速',
        type: 'line',
        data: trendData.value.map(item => item.windSpeed),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        yAxisIndex: 0,
        lineStyle: { color: '#3b82f6', width: 2.5 },
        itemStyle: { 
          color: '#3b82f6',
          borderColor: '#fff',
          borderWidth: 1.5
        },
        emphasis: {
          symbolSize: 8
        },
        z: 2
      },
      // 3. 风向向量（箭头）
      {
        name: '风向',
        type: 'scatter',
        data: trendData.value.map((item, index) => ({
          value: [index, item.windDir],
          symbolRotate: item.windDir // 箭头旋转角度 = 风向角度
        })),
        symbol: 'path://M0,0 L8,0 L4,-6 Z', // 箭头形状
        symbolSize: 12,
        itemStyle: { color: '#8b5cf6' },
        yAxisIndex: 1,
        z: 3
      }
    ]
  }
  
  trendChart.setOption(option)
  
  // 绑定交互事件
  trendChart.on('mousemove', handleChartHover)
  trendChart.on('mouseout', () => {
    showTooltip.value = false
  })
}

// 图表悬停事件
const handleChartHover = (params) => {
  if (params.componentType === 'series' && params.seriesIndex === 2) { // 风速系列
    const index = params.dataIndex
    if (trendData.value[index]) {
      tooltipData.value = trendData.value[index]
      tooltipLeft.value = params.event.clientX + 10
      tooltipTop.value = params.event.clientY - 10
      showTooltip.value = true
    }
  }
}

// 风向文本转换（8方向）
const getDirectionText = (degree) => {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const index = Math.round(degree / 45) % 8
  return dirs[index]
}

// 切换监测点
const handlePointChange = () => {
  const point = monitorPoints.value.find(p => p.id === currentPointId.value)
  if (point) {
    currentPoint.value = point
    trendData.value = generateTrendData(currentPointId.value)
    updateTime.value = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    initChart()
  }
}

// 窗口大小变化处理
const handleResize = () => {
  if (trendChart) {
    trendChart.resize()
  }
}

// 初始化与清理
onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

// 监听dashboard模块变化
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    nextTick(() => {
      if (trendChart) {
        trendChart.resize()
      } else {
        initChart()
      }
    })
  }
)

// 暴露组件方法
defineExpose({
  updateMonitorPoint: (pointId) => {
    currentPointId.value = pointId
    handlePointChange()
  }
})
</script>

<style scoped lang="scss">
// 卡片基础样式
.wind-trend-card {
  height: 120px;
}

// 图表容器
.chart-container {
  width: 100%;
  height: 120px;
  position: relative;
}

.trend-chart {
  width: 100%;
  height: 100%;
}


// 图例说明
.chart-legend {
  display: flex;
  gap: 20px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #94a3b8;

    .legend-marker {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .wind-speed {
      background-color: #3b82f6;
    }

    .wind-dir {
      background-color: #8b5cf6;
      clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    }

    .confidence {
      background-color: rgba(59, 130, 246, 0.3);
    }
  }
}

// 悬浮详情tooltip
.detail-tooltip {
  position: fixed;
  background-color: rgba(15, 23, 51, 0.95);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
  width: 200px;

  .tooltip-header {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h4 {
      margin: 0;
      font-size: 14px;
      color: #3b82f6;
    }
  }

  .tooltip-content {
    padding: 10px 12px;
    font-size: 13px;

    p {
      margin: 4px 0;
      line-height: 1.4;

      span {
        color: #94a3b8;
        display: inline-block;
        width: 60px;
      }
    }
  }
}

// 响应式适配
@media (max-width: 768px) {
  .wind-trend-card {
    min-width: auto;
  }

  .chart-container {
    height: 120px;
  }
}
</style>