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

    <!-- 2. 蒙版背景图（新增） -->
    <div class="mask-overlay"></div>
    <!-- 2. 顶部面板 -->
    <div class="top-panel">
      <Header />
    </div>

    <!-- 3. 控制面板 -->
    <div class="control-panel">
      <div
        class="control-item"
        v-for="module in MODULE_LIST"
        :key="module.key"
        @click="switchModule(module.key)"
        :class="{ selected: currentModule === module.key }"
      >
        <i :class="module.icon" class="module-icon"></i>
        <span class="module-text">{{ module.name }}</span>
      </div>
    </div>

    <!-- 4. 模块显示区域 -->
    <!-- 区域监测模块 -->
    <transition name="module-fade" mode="out-in">
      <div v-show="currentModule === DASHBOARD_MODULES.REGION_MONITOR">
        <div class="left-panel">
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">核心区域</span>
            </div>
            <div class="panel-content">
              <region-moniter-list />
            </div>
          </div>
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title"
                >{{ selectedRegionDetail.regionName }}详情</span
              >
            </div>
            <div class="panel-content">
              <region-detail :regionDetail="selectedRegionDetail" />
              <!-- <div class="weather-panel">
                <weather-element-selector v-model="currentElement" />
              </div> -->
            </div>
          </div>
        </div>
        <div class="right-panel">
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">垂直</span>
            </div>
            <div class="panel-content"><WeatherFlightHeatmap /></div>
          </div>

          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">微尺度天气</span>
            </div>
            <div class="panel-content"><MicroscaleWeather /></div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 飞行分析模块 -->
    <transition name="module-fade" mode="out-in">
      <div v-show="currentModule === DASHBOARD_MODULES.FLIGHT_ANALYSIS">
        <div class="left-panel">
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">航路预警</span>
            </div>
            <div class="panel-content"><RouteList /></div>
          </div>
        </div>
        <!-- <div class="right-panel">
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">飞行任务监测</span>
            </div>
            <div class="panel-content">
              <FlightTasks />
            </div>
          </div>
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">飞行器适配</span>
            </div>
            <div class="panel-content"><AircraftAdapt /></div>
          </div>
        </div> -->
      </div>
    </transition>
    <!-- 设备监控模块 -->
    <transition name="module-fade" mode="out-in">
      <div v-show="currentModule === DASHBOARD_MODULES.DEVICE_MONITOR">
        <div class="left-panel">
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">设备运行状态</span>
            </div>
            <div class="panel-content">
              <DeviceCount />
            </div>
          </div>
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">报警情况</span>
            </div>
            <div class="panel-content">
              <EquipmentAlarm />
            </div>
          </div>
        </div>
        <div class="right-panel">
          <!-- <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">设备列表</span>
            </div>
            <div class="panel-content"><DeviceTrace /></div>
          </div> -->
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">历史42h实况监测数据</span>
            </div>
            <div class="panel-content"><HistoryData /></div>
          </div>
        </div>
      </div>
    </transition>
    <transition name="module-fade" mode="out-in">
      <div v-show="currentModule === DASHBOARD_MODULES.LANDING_MONITOR">
        <div class="left-panel">
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">实时风象</span>
            </div>
            <div class="panel-content"><LandingPointCard /></div>
          </div>
           <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">未来风势预测</span>
            </div>
            <div class="panel-content">
              <!-- <div style="display: flex;">
<WindTrend /><WindProfileChart/>
              </div> -->
              <Wind />
            </div>
          </div>
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">未来3h适飞分析</span>
            </div>
            <div class="panel-content"><WeatherFlightHeatmap /></div>
          </div>
         
        </div>
        <div class="right-panel">
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">预警记录</span>
            </div>
            <div class="panel-content">
              <RiskWarnings />
            </div>
          </div>

          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">实时监控</span>
            </div>
            <div class="panel-content"><SurveillanceFootage /></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { DASHBOARD_MODULES, MODULE_LIST } from "@/config/constants.js";
import { useDashboardStore } from "@/store/modules/dashboard"; // 新增导入

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
// 在组件导入部分替换为异步导入
import { defineAsyncComponent } from "vue";

const RegionMoniterList = defineAsyncComponent(() =>
  import("@/components/business/RegionMoniterList/index.vue")
);
const RegionDetail = defineAsyncComponent(() =>
  import("@/components/business/RegionDetail/index.vue")
);
const DeviceCount = defineAsyncComponent(() =>
  import("@/components/business/DeviceCount/index.vue")
);
const EquipmentAlarm = defineAsyncComponent(() =>
  import("@/components/business/EquipmentAlarm/index.vue")
);
const SurveillanceFootage = defineAsyncComponent(() =>
  import("@/components/business/SurveillanceFootage/index.vue")
);
const HistoryData = defineAsyncComponent(() =>
  import("@/components/business/HistoryData/index.vue")
);
const CoreIndicators = defineAsyncComponent(() =>
  import("@/components/business/CoreIndicators/index.vue")
);
const MicroscaleWeather = defineAsyncComponent(() =>
  import("@/components/business/MicroscaleWeather/index.vue")
);
const FlightTasks = defineAsyncComponent(() =>
  import("@/components/business/FlightTasks/index.vue")
);
const AircraftAdapt = defineAsyncComponent(() =>
  import("@/components/business/AircraftAdapt/index.vue")
);
const WeatherFlightHeatmap = defineAsyncComponent(() =>
  import("@/components/business/WeatherFlightHeatmap/index.vue")
);
const RiskWarnings = defineAsyncComponent(() =>
  import("@/components/business/RiskWarnings/index.vue")
);
const WeatherWarnings = defineAsyncComponent(() =>
  import("@/components/business/WeatherWarnings/index.vue")
);
const RouteList = defineAsyncComponent(() =>
  import("@/components/business/RouteList/index.vue")
);
const LandingPointCard = defineAsyncComponent(() =>
  import("@/components/business/LandingPointCard/index.vue")
);
const WindTrend = defineAsyncComponent(() =>
  import("@/components/business/WindTrend/index.vue")
);
const Wind = defineAsyncComponent(() =>
  import("@/components/business/Wind/index.vue")
);
const SystemMessage = defineAsyncComponent(() =>
  import("@/components/business/SystemMessage/index.vue")
);
const MonitoringPoints = defineAsyncComponent(() =>
  import("@/components/business/MonitoringPoints/index.vue")
);
const DeviceTrace = defineAsyncComponent(() =>
  import("@/components/business/DeviceTrace/index.vue")
);
const WindProfileChart = defineAsyncComponent(() =>
  import("@/components/business/WindProfileChart/index.vue")
);
const IndicatorPanel = defineAsyncComponent(() =>
  import("@/components/map/IndicatorPanel/index.vue")
);
const LayerControl = defineAsyncComponent(() =>
  import("@/components/map/LayerControl/index.vue")
);
import { useRegionStore } from "@/store/modules/region";
import mockRegionWeatherData, {
  WEATHER_TYPE_LABELS,
  FLIGHT_CONDITIONS_THRESHOLD,
} from "@/mock/regionWeatherData.js";

const { isLoading: cesiumLoading } = useCesium("cesiumContainer"); // 启用Cesium
// 使用dashboard store
const dashboardStore = useDashboardStore();

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

// 使用store中的currentModule
const currentModule = computed({
  get: () => dashboardStore.currentModule,
  set: (value) => dashboardStore.switchModule(value),
});

// 面板收起状态（默认收起）
const isRegionCollapsed = ref(true);
const isDeviceCollapsed = ref(true);
const isWeatherCollapsed = ref(true);

// 左右面板显隐状态
const isLeftPanelVisible = ref(true);
const isRightPanelVisible = ref(true);

// 切换左右面板显隐的方法
const toggleLeftPanel = () => {
  isLeftPanelVisible.value = !isLeftPanelVisible.value;
};

const toggleRightPanel = () => {
  isRightPanelVisible.value = !isRightPanelVisible.value;
};

// 访问选中的区域数据
const selectedRegion = computed(() => regionStore.selectedRegion);

// 修改切换模块的方法
const switchModule = (moduleKey) => {
  console.log(moduleKey == currentModule.value);
  if (moduleKey === currentModule.value) {
    dashboardStore.switchModule("");
  } else {
    dashboardStore.switchModule(moduleKey);
  }
};

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
watch(
  () => dashboardStore.currentModule,
  (newModule) => {
    initializeModuleState(newModule);
  }
);

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
watch(
  () => dashboardStore.currentModule,
  (newModule) => {
    // 切换到区域监测模块时展开面板
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
  }
);

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
.mask-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5; /* 位于地图上方，其他面板下方 */
  background: url("@/assets/images/bg_container.png");
  background-size: cover;
  background-position: center;
  opacity: 0.7; /* 可调节透明度 */
  pointer-events: none; /* 不阻挡鼠标事件 */
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
/* 替换原有的控制面板样式 */
.control-panel {
  display: flex;
  gap: 12px;
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 8px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 20px;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  color: #c0cde0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: "jingangFont";

  &:hover {
    background: linear-gradient(135deg, #2a5298, #3a6bc0);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.selected {
    background: linear-gradient(135deg, #00c6ff, #0072ff);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 114, 255, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .module-icon {
    font-size: 16px;
  }

  .module-text {
    font-size: 16px;
    font-weight: 500;
  }
}

.weather-panel {
  position: absolute;
  left: -100px;
}
/* 在样式部分添加动画样式 */
.module-fade-enter-active,
.module-fade-leave-active {
  transition: all 0.3s ease;
}

.module-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.module-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>