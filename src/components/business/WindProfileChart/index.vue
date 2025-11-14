
<template>
  <div class="wind-profile-chart">
    <!-- 控制区：要素切换 + 时间范围 -->
    <div class="chart-controls">
      <div class="param-selector">
        <span class="control-label">气象要素：</span>
        <div class="button-group">
          <button
            v-for="(param, idx) in params"
            :key="idx"
            :class="{ active: activeParam === idx }"
            @click="activeParam = idx"
          >
            {{ param.name }}
          </button>
        </div>
      </div>
      
      <div class="time-range">
        <span class="control-label">时间范围：</span>
        <div class="button-group">
          <button
            :class="{ active: timeRange === '1h' }"
            @click="timeRange = '1h'"
          >
            1小时
          </button>
          <button
            :class="{ active: timeRange === '3h' }"
            @click="timeRange = '3h'"
          >
            3小时
          </button>
          <button
            :class="{ active: timeRange === '6h' }"
            @click="timeRange = '6h'"
          >
            6小时
          </button>
        </div>
      </div>
    </div>
    
    <!-- 图表容器 -->
    <div class="chart-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载风廓线数据...</p>
      </div>
      <div ref="chartRef" class="chart"></div>
    </div>
    
    <!-- 色阶图例 -->
    <div class="color-legend">
      <div class="legend-label">{{ currentParam.name }} ({{ currentParam.unit }})</div>
      <div class="color-bar" :style="{ background: colorGradient }"></div>
      <div class="legend-values">
        <span>{{ minValue }}</span>
        <span>{{ midValue }}</span>
        <span>{{ maxValue }}</span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from "vue";
import * as echarts from "echarts";
import { useDashboardStore } from "@/store/modules/dashboard";
const dashboardStore = useDashboardStore();

// 气象要素配置
const params = ref([
  {
    name: "湍流强度",
    unit: "m²/s²",
    min: 0,
    max: 20,
    colorStops: [
      { offset: 0, color: "#14b8a6" },
      { offset: 0.5, color: "#f59e0b" },
      { offset: 1, color: "#ef4444" }
    ]
  },
  {
    name: "水平风速",
    unit: "m/s",
    min: 0,
    max: 30,
    colorStops: [
      { offset: 0, color: "#3b82f6" },
      { offset: 0.5, color: "#8b5cf6" },
      { offset: 1, color: "#ec4899" }
    ]
  },
  {
    name: "风切变指数",
    unit: "",
    min: -0.5,
    max: 2.5,
    colorStops: [
      { offset: 0, color: "#06b6d4" },
      { offset: 0.5, color: "#3b82f6" },
      { offset: 1, color: "#6366f1" }
    ]
  }
]);

// 状态管理
const activeParam = ref(0);
const timeRange = ref("3h");
const isLoading = ref(false);
const chartRef = ref(null);
let chartInstance = null;

// 当前参数计算
const currentParam = computed(() => params.value[activeParam.value]);
const minValue = computed(() => currentParam.value.min);
const maxValue = computed(() => currentParam.value.max);
const midValue = computed(() => ((maxValue.value - minValue.value) / 2 + minValue.value).toFixed(1));
const colorGradient = computed(() => {
  return `linear-gradient(to right, ${currentParam.value.colorStops.map(stop => stop.color).join(",")})`;
});

// 生成时间标签
const generateTimeLabels = () => {
  const countMap = { "1h": 12, "3h": 36, "6h": 72 };
  const count = countMap[timeRange.value];
  const labels = [];
  
  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() + i * 5 * 60000);
    labels.push(time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  }
  return labels;
};

// 生成高度标签
const generateHeightLabels = () => {
  return Array.from({ length: 16 }, (_, i) => `${i * 100}m`);
};

// 生成风廓线数据
const generateProfileData = () => {
  const timeLabels = generateTimeLabels();
  const heightLabels = generateHeightLabels();
  const data = [];
  
  heightLabels.forEach((_, hIdx) => {
    const row = [];
    timeLabels.forEach((_, tIdx) => {
      let baseValue;
      if (currentParam.value.name === "湍流强度") {
        baseValue = hIdx < 3 || hIdx > 12 ? 5 + Math.random() * 10 : 1 + Math.random() * 4;
      } else if (currentParam.value.name === "水平风速") {
        baseValue = (hIdx / 15) * 20 + Math.random() * 8;
      } else {
        baseValue = hIdx > 5 && hIdx < 10 ? 1 + Math.random() * 1.5 : 0.2 + Math.random() * 0.8;
      }
      
      if (tIdx % 12 === 0) baseValue *= 1.5 + Math.random();
      baseValue = Math.max(minValue.value, Math.min(maxValue.value, baseValue));
      row.push(Number(baseValue.toFixed(2)));
    });
    data.push(row);
  });
  
  return { timeLabels, heightLabels, data };
};

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;
  
  isLoading.value = true;
  const { timeLabels, heightLabels, data } = generateProfileData();
  
  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartRef.value);
  
  // 修复：移除不正确的 contour 类型，使用正确的配置
  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item", // 改为 item 触发
      formatter: (params) => {
        const { dataIndex } = params;
        // 计算原始数据索引
        const timeIdx = dataIndex % timeLabels.length;
        const heightIdx = Math.floor(dataIndex / timeLabels.length);
        const valueVal = data[heightIdx][timeIdx];
        return `
          <div>时间：${timeLabels[timeIdx]}</div>
          <div>高度：${heightLabels[heightIdx]}</div>
          <div>${currentParam.value.name}：${valueVal} ${currentParam.value.unit}</div>
        `;
      },
      backgroundColor: "rgba(15,23,51,0.95)",
      borderColor: "#3b82f6",
      textStyle: { color: "#e2e8f0" }
    },
    grid: {
      left: "1%",
      right: "5%",
      top: "1%",
      bottom: "0%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: timeLabels,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 11,
        interval: Math.max(1, Math.floor(timeLabels.length / 8))
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: "category",
      data: heightLabels,
      inverse: true,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 11
      },
      splitLine: {
        lineStyle: { color: "rgba(255,255,255,0.05)" }
      }
    },
    visualMap: {
      show: false,
      min: minValue.value,
      max: maxValue.value,
      calculable: true,
      dimension: 2,
      inRange: {
        color: currentParam.value.colorStops.map(stop => stop.color)
      }
    },
    series: [
      {
        type: "heatmap",
        data: data.flatMap((row, hIdx) => 
          row.map((val, tIdx) => [tIdx, hIdx, val])
        ),
        label: { show: false },
        emphasis: { 
          itemStyle: { 
            borderColor: "#fff", 
            borderWidth: 1,
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)"
          } 
        }
      }
      // 移除了 contour 系列，因为这不是有效的 ECharts 类型
    ]
  };
  
  chartInstance.setOption(option);
  isLoading.value = false;
};

// 监听参数变化
watch([activeParam, timeRange], () => {
  nextTick(initChart);
});

// 初始化
onMounted(() => {
  nextTick(() => {
    initChart();
    window.addEventListener("resize", () => {
      chartInstance?.resize();
    });
  });
});

// 清理
onUnmounted(() => {
  chartInstance?.dispose();
  window.removeEventListener("resize", () => {});
});

// 监听dashboard模块变化
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    nextTick(() => {
      if (chartInstance) {
        chartInstance.resize();
      } else {
        initChart();
      }
    });
  }
);
</script>
<style scoped lang="scss">
.wind-profile-chart {
  width: 100%;
  position: relative;
}

.chart-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.control-label {
  color: #94a3b8;
  font-size: 13px;
  margin-right: 8px;
  cursor: default;
}

.param-selector, .time-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.button-group {
  display: flex;
  gap: 6px;
}

.param-selector button, .time-range button {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 4px;
  padding: 5px 12px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: all 0.3s ease;
  
  &.active {
    background: rgba(59,130,246,0.15);
    border-color: #3b82f6;
    color: #3b82f6;
  }
}

/* 悬浮控制区域时显示按钮 */
.chart-controls:hover {
  .param-selector button, 
  .time-range button {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }
}

/* 默认状态下显示标签 */
.control-label {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.chart-controls:hover .control-label {
  opacity: 1;
}

.chart-container {
  width: 100%;
  height: 160px;
  position: relative;
  margin-bottom: 15px;
}

.chart {
  width: 100% !important;
  height: 100% !important;
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
  
  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(59,130,246,0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
}

.color-legend {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 0 5%;
}

.legend-label {
  font-size: 13px;
  color: #94a3b8;
  width: 100px;
}

.color-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(59,130,246,0.3);
}

.legend-values {
  display: flex;
  justify-content: space-between;
  width: 150px;
  font-size: 12px;
  color: #94a3b8;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .chart-container {
    height: 350px;
  }
  
  .color-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .legend-label, .color-bar, .legend-values {
    width: 100%;
  }
}
</style>