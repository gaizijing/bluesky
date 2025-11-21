<template>
  <div class="c">
    <!-- 图表区域 -->
    <div class="chart-container">
      <div ref="chartRef" class="trend-chart"></div>
    </div>
  </div>
</template>
<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useDashboardStore } from "@/store/modules/dashboard";
import { useMonitoringPointStore } from "@/store/modules/monitoringPoints";
import { fetchCurrentPointWindTrend } from "@/api/weather";
import { intersection } from "lodash";

const dashboardStore = useDashboardStore();
const monitoringPointStore = useMonitoringPointStore();

// 图表实例与状态
const chartRef = ref(null);
let trendChart = null;

// 当前趋势数据
const trendData = ref([]);

// 获取风向趋势数据
const loadWindTrendData = async () => {
  try {
    if (monitoringPointStore.hasSelectedPoint) {
      const data = await fetchCurrentPointWindTrend(
        monitoringPointStore.selectedPoint
      );
      trendData.value = data;

      initChart();
    }
  } catch (error) {
    console.error("加载风向趋势数据失败:", error);
  }
};

// 风向文本转换（8方向）
const getDirectionText = (degree) => {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const index = Math.round(degree / 45) % 8;
  return dirs[index];
};

// 初始化图表
const initChart = () => {
  if (!chartRef.value || trendData.value.length === 0) return;

  if (trendChart) trendChart.dispose();
  trendChart = echarts.init(chartRef.value);

  // 提取X轴时间
  const timeLabels = trendData.value.map((item) => item.time);

  // 图表配置
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 51, 0.95)",
      borderColor: "#3b82f6",
      borderWidth: 1,
      textStyle: {
        color: "#e2e8f0",
        fontSize: 13,
      },
      padding: [8, 12],
      formatter: (params) => {
        // 查找风速系列的数据
        const windSpeedSeries = params.find((p) => p.seriesIndex === 2);
        if (!windSpeedSeries) return "";

        const index = windSpeedSeries.dataIndex;
        const data = trendData.value[index];
        if (!data) return "";

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
        `;
      },
    },

    grid: {
      left: "5%",
      right: "0%",
      bottom: "10%",
      top: "30%",
      containLabel: true,
    },
    // 双Y轴配置（左侧风速，右侧风向）
    xAxis: {
      type: "category",
      data: timeLabels,
      axisLine: { lineStyle: { color: "#334155" } },
      axisLabel: { color: "#94a3b8" },
      splitLine: { show: false },
    },
    yAxis: [
      {
    type: "value",
    name: "风速 (m/s)",
    nameTextStyle: { color: "#3b82f6" },
    axisLine: { lineStyle: { color: "#334155" } },
    axisLabel: { color: "#94a3b8" },
    splitLine: { 
      show: true,
      lineStyle: { 
        color: "rgba(51, 65, 85, 0.3)",
        type: "dashed"
      } 
    },
    min: 0,
    max: 10,
    interval: 2
  },
  {
    type: "value",
    name: "风向 (°)",
    nameTextStyle: { color: "#8b5cf6" },
    axisLine: { lineStyle: { color: "#334155" } },
    axisLabel: { color: "#94a3b8" },
    splitLine: { show: false },
    min: 0,
    max: 360,
    interval: 90,
    position: "right",
  },
    ],
    series: [
      // 1. 置信区间阴影
      {
        name: "置信区间",
        type: "line",
        data: trendData.value.map((item) => item.upper),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(59, 130, 246, 0.2)" },
            { offset: 1, color: "rgba(59, 130, 246, 0)" },
          ]),
        },
        z: 1,
      },
      {
        name: "置信区间",
        type: "line",
        data: trendData.value.map((item) => item.lower),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(59, 130, 246, 0)" },
            { offset: 1, color: "rgba(59, 130, 246, 0.2)" },
          ]),
        },
        z: 1,
      },
      // 2. 风速折线
      {
        name: "风速",
        type: "line",
        data: trendData.value.map((item) => item.windSpeed),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        yAxisIndex: 0,
        lineStyle: { color: "#3b82f6", width: 2.5 },
        itemStyle: {
          color: "#3b82f6",
          borderColor: "#fff",
          borderWidth: 1.5,
        },
        emphasis: {
          symbolSize: 8,
        },
        z: 2,
      },
      // 3. 风向向量（箭头）
      {
        name: "风向",
        type: "scatter",
        data: trendData.value.map((item, index) => ({
          value: [index, item.windDir],
          symbolRotate: item.windDir, // 箭头旋转角度 = 风向角度
        })),
        symbol: "path://M0,0 L8,0 L4,-6 Z", // 箭头形状
        symbolSize: 12,
        itemStyle: { color: "#8b5cf6" },
        yAxisIndex: 1,
        z: 3,
      },
    ],
  };

  trendChart.setOption(option);
};

// 窗口大小变化处理
const handleResize = () => {
  if (trendChart) {
    trendChart.resize();
  }
};

// 初始化与清理
onMounted(() => {
  loadWindTrendData();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose();
  }
  window.removeEventListener("resize", handleResize);
});

// 监听选中监测点变化
watch(
  () => monitoringPointStore.selectedPoint,
  (newPoint) => {
    if (newPoint) {
      loadWindTrendData();
    }
  }
);

// 监听dashboard模块变化
watch(
  () => dashboardStore.currentModule,
  (newVal) => {
    nextTick(() => {
      handleResize();
    });
  }
);
</script>
<style scoped lang="scss">
// 卡片基础样式
.wind-trend-card {
  height: 150px;
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