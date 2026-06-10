<template>
  <div class="history-area-container">
    <!-- 顶部标题栏 -->

    <!-- 区域切换栏 -->
    <div class="point-tabs">
      <div v-for="(point, idx) in points" :key="idx" :class="{ button: true, active: activePoint === idx }"
        @click="activePoint = idx">
        {{ point }}
      </div>
    </div>

    <!-- 核心图表区：重新分配高度，底部双图占比提升 -->
    <div class="charts-wrapper">
      <!-- 1. 自动气象站（折线图）- 高度占比25% -->
      <div class="chart-section top">
        <div class="section-title">自动气象站</div>
        <div ref="trendChartRef" class="chart"></div>
      </div>

      <!-- 2. 小型激光测风雷达（时序图）- 高度占比25% -->
      <div class="chart-section top">
        <div class="section-title">小型激光测风雷达</div>
        <div ref="timelineChartRef" class="chart"></div>
      </div>

      <!-- 3. 底部双图：总高度占比45%，每个图各占一半 -->
      <div class="bottom-charts">
        <div class="chart-section bottom">
          <div class="section-title">二氧化碳风廓雷达</div>
          <div ref="radarChartRef" class="chart"></div>
        </div>
        <div class="chart-section bottom">
          <div class="section-title">作业天气雷达</div>
          <div ref="weatherRadarRef" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted, computed } from "vue";
import echarts from '@/utils/echarts';
import { useModuleStore } from "@/store/modules/module";
import { useDeviceStore } from "@/store/modules/device";

const moduleStore = useModuleStore();
// 测点配置
const points = ref(["测点A", "测点B", "测点C", "测点D"]);
const activePoint = ref(0);

// 图表DOM引用
const trendChartRef = ref(null);
const timelineChartRef = ref(null);
const radarChartRef = ref(null);
const weatherRadarRef = ref(null);

// 图表实例
let trendChart = null;
let timelineChart = null;
let radarChart = null;
let weatherRadar = null;


// 初始化折线图
const initTrendChart = (data) => {
  if (!trendChartRef.value) return;
  if (trendChart) trendChart.dispose();

  trendChart = echarts.init(trendChartRef.value);
  trendChart.setOption({
    backgroundColor: "transparent",
    grid: { left: "10%", right: "5%", top: "20%", bottom: "15%" },
    xAxis: {
      type: "category",
      data: data.timeLabels,
      axisLine: { lineStyle: { color: "#475467" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#475467" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    tooltip: {
      appendToBody: true,
      trigger: "axis" },
    legend: {
      data: ["温度", "湿度", "风速"],
      top: 0,
      textStyle: { color: "#94a3b8", fontSize: 10 },
    },
    series: [
      {
        name: "温度",
        type: "line",
        data: data.trendData.temperature,
        lineStyle: { color: "#ffc107" },
      },
      {
        name: "湿度",
        type: "line",
        data: data.trendData.humidity,
        lineStyle: { color: "#3b82f6" },
      },
      {
        name: "风速",
        type: "line",
        data: data.trendData.windSpeed,
        lineStyle: { color: "#10b981" },
      },
    ],
  });
};

// 初始化时序图
const initTimelineChart = (data) => {
  if (!timelineChartRef.value) return;
  if (timelineChart) timelineChart.dispose();

  timelineChart = echarts.init(timelineChartRef.value);
  timelineChart.setOption({
    backgroundColor: "transparent",
    grid: { left: "10%", right: "5%", top: "20%", bottom: "15%" },
    xAxis: {
      type: "category",
      data: data.timeLabels,
      axisLine: { lineStyle: { color: "#475467" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#475467" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    tooltip: {
      appendToBody: true,
      trigger: "axis" },
    legend: {
      data: ["径向风速", "风速标准差", "信噪比"],
      top: 0,
      textStyle: { color: "#94a3b8", fontSize: 10 },
    },
    series: [
      {
        name: "径向风速",
        type: "line",
        data: data.timelineData.radialSpeed,
        lineStyle: { color: "#8b5cf6" },
      },
      {
        name: "风速标准差",
        type: "line",
        data: data.timelineData.speedStd,
        lineStyle: { color: "#ec4899" },
      },
      {
        name: "信噪比",
        type: "line",
        data: data.timelineData.snr,
        lineStyle: { color: "#06b6d4" },
      },
    ],
  });
};

// 初始化雷达图（优化配置，确保显示完整）
const initRadarChart = (data) => {
  if (!radarChartRef.value) return;
  if (radarChart) radarChart.dispose();

  radarChart = echarts.init(radarChartRef.value);
  radarChart.setOption({
    backgroundColor: "transparent",
    grid: { left: "5%", right: "5%", top: "10%", bottom: "10%" },
    radar: {
      indicator: [
        { name: "温度", max: 30 },
        { name: "湿度", max: 100 },
        { name: "风速", max: 10 },
        { name: "风向", max: 360 },
        { name: "气压", max: 1050 },
      ],
      radius: "70%", // 增大雷达图半径
      center: ["50%", "50%"], // 居中显示
      axisLine: { lineStyle: { color: "#475467" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 11, // 增大标签字体
        padding: 5, // 增加标签内边距，避免重叠
      },
    },
    series: [
      {
        type: "radar",
        data: [{ value: data.radarData.map((item) => item.value) }],
        itemStyle: { color: "#6366f1" },
        areaStyle: { color: "rgba(99, 102, 241, 0.2)" },
        lineStyle: { width: 2 }, // 增粗雷达图线条
      },
    ],
  });
};

// 初始化天气雷达图（优化圆环图显示）
const initWeatherRadarChart = (data) => {
  if (!weatherRadarRef.value) return;
  if (weatherRadar) weatherRadar.dispose();

  weatherRadar = echarts.init(weatherRadarRef.value);
  weatherRadar.setOption({
    backgroundColor: "transparent",
    grid: { left: "5%", right: "5%", top: "10%", bottom: "15%" },
    tooltip: {
      appendToBody: true,
      trigger: "item" },
    legend: {
      data: ["弱回波", "中回波", "强回波"],
      bottom: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 },
    },
    series: [
      {
        type: "pie",
        radius: ["35%", "65%"], // 优化圆环比例
        center: ["50%", "45%"], // 向上微调，避免被图例遮挡
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#0f1733",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: { label: { show: true, color: "#fff", fontSize: 12 } },
        labelLine: { show: false },
        data: data.weatherRadarData.map((item, idx) => ({
          ...item,
          itemStyle: {
            color: idx === 0 ? "#14b8a6" : idx === 1 ? "#f59e0b" : "#ef4444",
          },
        })),
      },
    ],
  });
};
const chartData = computed(() => {
  return useDeviceStore().getHistoryData();
})
// 统一初始化所有图表
const initCharts = () => {
  const data = chartData.value;
  if (!data || !data.trendData) return;
  console.log(data.trendData.temperature);
  initTrendChart(data);
  initTimelineChart(data);
  initRadarChart(data);
  initWeatherRadarChart(data);

};

// 监听测点切换和数据变化
watch(activePoint, initCharts);
watch(chartData, initCharts, { deep: true });
watch(
  () => moduleStore.currentModule,
  (newVal) => {
    nextTick(() => {
      timelineChart?.resize();
      radarChart?.resize();
      weatherRadar?.resize();
      trendChart?.resize();
    });
  }
);

// 组件挂载后初始化
onMounted(() => {
  setTimeout(initCharts, 100);

  // 窗口resize适配
  window.addEventListener("resize", () => {
    trendChart?.resize();
    timelineChart?.resize();
    radarChart?.resize();
    weatherRadar?.resize();
  });
});

// 组件卸载清理
onUnmounted(() => {
  trendChart?.dispose();
  timelineChart?.dispose();
  radarChart?.dispose();
  weatherRadar?.dispose();
  window.removeEventListener("resize", () => { });
});
</script>

<style scoped lang="scss">
/* 父容器固定高度，确保整体空间充足 */
.history-area-container {
  width: 100%;
  height: 900px;
  /* 整体高度提升，给底部图表更多空间 */
  min-height: 900px;
}

.title-bar {
  text-align: center;
  margin-bottom: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #40ecff;
    margin: 0;
  }
}

.point-tabs {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;

  .button {
    text-align: center;
    padding: 8px 16px;
    width: 83px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 14px;
    background-image: url("@/assets/images/bg_device_btn.png");
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;

    &.active {
      color: #fff;
      transform: translateY(-2px);
    }

    &:hover {
      transform: translateY(-2px);
    }
  }
}

/* 图表容器：重新分配高度比例 */
.charts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: calc(100% - 100px);
  /* 减去标题和测点栏高度 */
}

/* 顶部两个图表：各占25%高度 */
.chart-section.top {
  width: 100%;
  height: 25%;
  min-height: 180px;
  /* 最小高度限制，避免过小 */
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

/* 底部双图：总高度45%，每个图各占一半 */
.bottom-charts {
  display: flex;
  gap: 15px;
  height: 45%;
  min-height: 350px;
  /* 底部总最小高度，确保每个图至少170px */
}

.chart-section.bottom {
  width: 50%;
  height: 100%;
  min-height: 350px;
  /* 底部单个图表最小高度 */
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

/* 图表标题 */
.section-title {
  position: absolute;
  top: 10px;
  left: 15px;
  font-size: 14px;
  color: #40ecff;
  z-index: 10;
}

/* 图表元素强制占满容器 */
.chart {
  width: 100% !important;
  height: 100% !important;
}

/* 响应式适配：小屏幕垂直排列底部双图 */
@media (max-width: 992px) {
  .history-area-container {
    height: 1400px;
    min-height: 1400px;
  }

  .bottom-charts {
    flex-direction: column;
    height: 60%;
    min-height: 700px;
  }

  .chart-section.bottom {
    width: 100%;
    height: 50%;
    min-height: 350px;
  }
}

@media (max-width: 768px) {
  .history-area-container {
    height: 1600px;
    min-height: 1600px;
  }

  .chart-section.top {
    min-height: 220px;
  }
}
</style>