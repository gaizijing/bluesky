<template>
  <div class="dashboard-container">
    <!-- 1. 全屏地图（底层） -->
    <div class="map-container">
      <div id="cesiumContainer" class="cesium-container"></div>
      <div class="cesium-loading" v-if="cesiumLoading">
        <ElLoading size="large"></ElLoading>
        <div class="loading-text">地图加载中...</div>
      </div>
    </div>

    <!-- 2. 顶部面板 -->
    <div class="top-panel">
      <Header />
    </div>

    <!-- 3. 控制面板 -->
    <div class="control-panel">
      <div
        class="control-item"
        @click="currentModule = DASHBOARD_MODULES.DEVICE_MONITOR"
        :class="{
          selected: currentModule === DASHBOARD_MODULES.DEVICE_MONITOR,
        }"
      >
        设备监控
      </div>
      <div
        class="control-item"
        @click="currentModule = DASHBOARD_MODULES.REGION_MONITOR"
        :class="{
          selected: currentModule === DASHBOARD_MODULES.REGION_MONITOR,
        }"
      >
        感知分析
      </div>
      <div
        class="control-item"
        @click="currentModule = DASHBOARD_MODULES.FLIGHT_ANALYSIS"
        :class="{
          selected: currentModule === DASHBOARD_MODULES.FLIGHT_ANALYSIS,
        }"
      >
        飞行分析
      </div>
    </div>

    <!-- 4. 模块显示区域 -->
    <!-- 感知分析模块 -->
    <div v-show="currentModule === DASHBOARD_MODULES.REGION_MONITOR">
      <div class="main-panel left-panel">
        <div class="panel-content">
          <region-moniter-list />
        </div>
      </div>

      <div class="main-panel right-panel">
        <!-- 面板标题栏-->
       
        <!-- 面板内容（收起时隐藏） -->
        <div class="panel-content">
          <region-detail :regionDetail="selectedRegionDetail" />
        </div>
      </div>
    </div>

    <!-- 飞行分析模块 -->
    <div v-show="currentModule === DASHBOARD_MODULES.FLIGHT_ANALYSIS">
      <div class="main-panel weather-panel">
        <weather-element-selector v-model="currentElement" />
      </div>
    </div>

    <!-- 设备监控模块 -->
    <div v-show="currentModule === DASHBOARD_MODULES.DEVICE_MONITOR">
      <div class="main-panel left-panel">
        <div class="panel-content">
          <DeviceCount />
          <EquipmentAlarm />
          <SurveillanceFootage />
        </div>
      </div>
      <div class="main-panel right-panel">
        <div class="panel-content"><HistoryData /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { DASHBOARD_MODULES } from "@/config/constants.js";

// 原有逻辑保留
import { useWeatherStore } from "@/store/modules/weather";
import { useCesiumStore } from "@/store/modules/cesium";
import { useCesium } from "@/hooks/useCesium";
import {
  getWeatherStatistics,
  getWeatherTrend,
  getWeatherAlerts,
  getWeatherDetails,
} from "@/api/weather";

// 组件导入
import WeatherElementSelector from "@/components/business/WeatherElementSelector/index.vue";
import RegionMoniterList from "@/components/business/RegionMoniterList/index.vue";
import RegionDetail from "@/components/business/RegionDetail/index.vue";
import Header from "@/components/Header/index.vue";
import DeviceCount from "@/components/business/DeviceCount/index.vue";
import EquipmentAlarm from "@/components/business/EquipmentAlarm/index.vue";
import SurveillanceFootage from "@/components/business/SurveillanceFootage/index.vue";
import HistoryData from "@/components/business/HistoryData/index.vue";
import { useRegionStore } from "@/store/modules/region";
import mockRegionWeatherData, {
  WEATHER_TYPE_LABELS,
  FLIGHT_CONDITIONS_THRESHOLD,
} from "@/mock/regionWeatherData.js";
const { isLoading: cesiumLoading } = useCesium("cesiumContainer"); // 修改这一行

// 当前活动模块
const currentModule = ref(DASHBOARD_MODULES.REGION_MONITOR);

// 面板收起状态（默认收起）
const isRegionCollapsed = ref(true);
const isDeviceCollapsed = ref(true);
const isWeatherCollapsed = ref(true);

// 原有状态保留
const weatherStore = useWeatherStore();
const cesiumStore = useCesiumStore();
const timeRange = ref(weatherStore.timeRange);
const statisticsData = ref(null);
const trendData = ref(null);
const weatherAlerts = ref([]);
const detailData = ref([]);
const currentElement = ref(["temperature"]);
const regionStore = useRegionStore();
const selectedRegionDetail = ref([]);

// 访问选中的区域数据
const selectedRegion = computed(() => regionStore.selectedRegion);

// 原有业务方法保留
const fetchWeatherData = async () => {
  try {
    const stats = await getWeatherStatistics({
      element: currentElement.value,
      timeRange: timeRange.value,
      time: weatherStore.currentTime,
    });
    statisticsData.value = stats;

    const trend = await getWeatherTrend({
      element: currentElement.value,
      timeRange: timeRange.value,
    });
    trendData.value = trend;

    const alerts = await getWeatherAlerts({ time: weatherStore.currentTime });
    weatherAlerts.value = alerts;

    const details = await getWeatherDetails({
      element: currentElement.value,
      time: weatherStore.currentTime,
    });
    detailData.value = details;

    weatherStore.updateStatistics(stats);
  } catch (error) {
    console.error("获取气象数据失败:", error);
  }
};

const fetchRegionWeatherDetail = (id) => {
  return mockRegionWeatherData.find((region) => region.regionId === id);
};
// 在 watch(currentModule...) 之前添加
const initializeModuleState = (module) => {
  switch (module) {
    case DASHBOARD_MODULES.REGION_MONITOR:
      isRegionCollapsed.value = false;
      isWeatherCollapsed.value = true;
      isDeviceCollapsed.value = true;
      break;
    case DASHBOARD_MODULES.FLIGHT_ANALYSIS:
      isRegionCollapsed.value = true;
      isWeatherCollapsed.value = false;
      isDeviceCollapsed.value = true;
      break;
    case DASHBOARD_MODULES.DEVICE_MONITOR:
      isRegionCollapsed.value = true;
      isWeatherCollapsed.value = true;
      isDeviceCollapsed.value = false;
      break;
  }
};

// 修改模块切换监听器
watch(currentModule, (newModule) => {
  initializeModuleState(newModule);
});
// 监听目标区域变化
watch(
  () => regionStore.selectedRegion,
  (newRegion) => {
    // 1、获取该区域的详细天气数据
    selectedRegionDetail.value = fetchRegionWeatherDetail(newRegion.id);
  }
);

watch(
  () => weatherStore.currentElement,
  (newVal) => {
    currentElement.value = newVal;
    fetchWeatherData();
  }
);

watch(() => weatherStore.currentTime, fetchWeatherData);

// 监听模块切换
watch(currentModule, (newModule) => {
  // 切换到感知分析模块时展开面板
  if (newModule === DASHBOARD_MODULES.REGION_MONITOR) {
    isRegionCollapsed.value = false;
  } else {
    isRegionCollapsed.value = true;
  }

  // 切换到飞行分析模块时展开面板
  if (newModule === DASHBOARD_MODULES.FLIGHT_ANALYSIS) {
    isWeatherCollapsed.value = false;
  } else {
    isWeatherCollapsed.value = true;
  }

  // 切换到设备监控模块时展开面板
  if (newModule === DASHBOARD_MODULES.DEVICE_MONITOR) {
    isDeviceCollapsed.value = false;
  } else {
    isDeviceCollapsed.value = true;
  }
});

onMounted(() => {
  fetchWeatherData();
});
</script>

<style scoped lang="scss">
.dashboard-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 地图容器（底层） */
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;

  .cesium-container {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .cesium-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: rgba(15, 23, 51, 0.8);
    padding: 20px 30px;
    border-radius: 8px;
    z-index: 2;

    .loading-text {
      margin-top: 10px;
      color: #fff;
      font-size: 16px;
    }
  }
}

/* 顶部面板 */
.top-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: $header-height;
  padding: 0 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 51, 0.7);
  z-index: 10;
  background: url("@/assets/images/bg_header.png");
  background-size: cover;
  background-position: center;
}

/* 控制面板 */
.control-panel {
  display: flex;
  font-size: 18px;
  font-family: "AiDeepFont";
  position: absolute;
  top: 15px;
  left: 12px;
  z-index: 10;
}

.control-item {
  width: 160px;
  text-align: center;
  background-image: url("@/assets/images/bg_control_pannel_item.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  color: $text-light;
  cursor: pointer;
  transition: all 0.3s ease;

  &.selected {
    background-image: url("@/assets/images/bg_control_pannel_item_selected.png");
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    color: #e0e8f0;
    transform: scale(1.03);
    filter: brightness(1.15);
  }
}


.weather-panel {
  right: 415px;
  width: 76px;
  height: 365px;
  padding: 14px;
  background-image: url(/src/assets/images/bg_weather_panel.png);
  background-repeat: no-repeat;
}

</style>