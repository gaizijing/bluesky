<!-- src/components/business/DeviceMonitor/index.vue -->
<template>
  <div class="device-monitor-container">
    <!-- 设备运行状态 -->
    <div class="main-panel">
      
      <div class="panel-content">
<div class="panel-header">
        <span class="panel-title">11设备运行状态</span>
      </div>

      </div>
    </div>

    <!-- 近七日报警情况 -->
    <!-- <div class="main-panel ">
      <div class="panel-header">
        <span class="panel-title">近七日报警情况</span>
      </div>
      <div class="panel-content"></div>
    </div> -->

    <!-- 右侧 - 实时监控画面 -->
    <!-- <div class="main-panel ">
      <div class="panel-header">
        <span class="panel-title">实时监控画面</span>
      </div>
      <div class="panel-content"></div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import * as echarts from "echarts";

// 设备状态数据
const deviceStatus = ref([
  {
    type: "weatherStation",
    name: "自动气象站",
    online: 3,
    total: 4,
    status: "normal",
  },
  {
    type: "windLidarSmall",
    name: "小型激光测风雷达",
    online: 4,
    total: 4,
    status: "normal",
  },
  {
    type: "windLidar3D",
    name: "三维激光测风雷达",
    online: 1,
    total: 1,
    status: "normal",
  },
  {
    type: "weatherRadar",
    name: "小型天气雷达",
    online: 1,
    total: 1,
    status: "normal",
  },
]);

// 报警趋势图表引用
const alertChart = ref(null);
let chartInstance = null;

// 初始化图表
const initChart = () => {
  if (!alertChart.value) return;

  chartInstance = echarts.init(alertChart.value);

  const option = {
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: [12, 8, 9, 14, 10, 6, 5],
        type: "bar",
        itemStyle: {
          color: "#409EFF",
        },
      },
    ],
  };

  chartInstance.setOption(option);
};

// 响应式处理
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(() => {
  nextTick(() => {
    initChart();
    window.addEventListener("resize", handleResize);
  });
});

// 组件卸载时清理
// eslint-disable-next-line no-unused-vars
const beforeUnmount = () => {
  window.removeEventListener("resize", handleResize);
  if (chartInstance) {
    chartInstance.dispose();
  }
};
</script>

<style scoped lang="scss">
.device-monitor-container {
  display: flex;
  gap: 10px;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}


</style>