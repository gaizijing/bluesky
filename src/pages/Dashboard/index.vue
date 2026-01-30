<template>
  <div class="dashboard-container">
    <!-- 1. 全屏地图（底层） -->
    <div class="map-container" style="height: 100%;">
      <MapContainer id="cesiumContainer" class="cesium-container" />
    </div>

    <!-- 2. 蒙版背景图（新增） -->
    <!-- <div class="mask-overlay"></div> -->

    <!-- 3. 控制面板 -->
    <div class="control-panel">
      <div class="control-item" v-for="module in MODULE_LIST" :key="module.key" @click="switchModule(module.key)"
        :class="{ selected: currentModule === module.key }">
        <span class="module-text">{{ module.name }}</span>
      </div>
    </div>

    <!-- 飞行分析模块 -->
    <transition name="module-fade" mode="out-in">
      <div v-show="currentModule === DASHBOARD_MODULES.FLIGHT_ANALYSIS">
        <div class="left-panel">
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">航路分析</span>
            </div>
            <div class="panel-content">
              <RouteList />
            </div>
          </div>
        </div>
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
              <span class="panel-title">告警情况</span>
            </div>
            <div class="panel-content">
              <EquipmentAlarm />
            </div>
          </div>
        </div>
        <div class="right-panel">
          <div class="main-panel right_bg">
            <div class="panel-header">
              <span class="panel-title">历史42h实况监测数据</span>
            </div>
            <div class="panel-content">
              <HistoryData />
            </div>
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
            <div class="panel-content">
              <RealTimeWeatherPanel />
            </div>
          </div>
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">气象预报</span>
            </div>
            <div class="panel-content">
              <div class="dashboard-content">
                <div class="analysis-panel">
                  <WeatherForecastPanel />
                </div>
              </div>
            </div>
          </div>
          <div class="main-panel left_bg">
            <div class="panel-header">
              <span class="panel-title">未来3h适飞分析</span>
            </div>

            <div class="panel-content">
              <FlightSuitableAnalysisPanel />
            </div>
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
            <div class="panel-content">
              <SurveillanceFootage />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
<script setup>
import { watch, computed } from "vue";
import { DASHBOARD_MODULES, MODULE_LIST } from "@/config/constants.js";
import { useModuleStore } from "@/store/modules/module";
import { DashboardService } from "../../services/dashboardService";
// 在组件导入异步导入
import { defineAsyncComponent } from "vue";

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
const FlightSuitableAnalysisPanel = defineAsyncComponent(() =>
  import("@/components/business/FlightSuitableAnalysisPanel/index.vue")
);
const RiskWarnings = defineAsyncComponent(() =>
  import("@/components/business/RiskWarnings/index.vue")
);
const RouteList = defineAsyncComponent(() =>
  import("@/components/business/RouteList/index.vue")
);
const RealTimeWeatherPanel = defineAsyncComponent(() =>
  import("@/components/business/Real-timeWeatherPanel/index.vue")
);
const WeatherForecastPanel = defineAsyncComponent(() =>
  import("@/components/business/WeatherForecastPanel/index.vue")
);
const MapContainer = defineAsyncComponent(() =>
  import("@/components/map/MapContainer.vue")
);
// Cesium地图由MapContainer组件管理
const moduleStore = useModuleStore();
const dashboardService = new DashboardService();
// 使用store中的currentModule
const currentModule = computed({
  get: () => moduleStore.currentModule,
  set: (value) => moduleStore.switchModule(value),
});

// 修改切换模块的方法
const switchModule = (moduleKey) => {
  if (moduleKey === currentModule.value) {
    currentModule.value = ''
  } else {
    currentModule.value = moduleKey
  }
};

// 修改模块切换监听器
watch(
  () => moduleStore.currentModule,
  async (newModule) => {
    dashboardService.loadModuleData(newModule);
  }
);


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
  z-index: 5;
  /* 位于地图上方，其他面板下方 */
  background: url("@/assets/images/bg_container.png");
  background-size: cover;
  background-position: center;
  opacity: 0.7;
  /* 可调节透明度 */
  pointer-events: none;
  /* 不阻挡鼠标事件 */
  // 背景图片（2D地图）
  // background: url(/src/assets/images/bg_2d.png);
  // background-size: contain;
  // background-repeat: no-repeat;
  // background-position: center;
  // 背景图片（3D风场）
  // background: url(/src/assets/images/bg_wind.gif);
  // background-size: 106%;
  // background-repeat: no-repeat;
  // background-position: 0px -103px;
  opacity: 0.7;
  /* 可调节透明度 */
  pointer-events: none;
  /* 不阻挡鼠标事件 */
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
  width: 120px;
  justify-content: center;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 20px;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  color: #c4c6c9c5;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  font-family: "AiDeepFont";
  background-image: url("@/assets/images/bg_control_item.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;

  &:hover {
    // background: linear-gradient(135deg, #2a5298, #3a6bc0);
    transform: translateY(-2px);
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &.selected {
    background-image: url("@/assets/images/bg_control_item.png");
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    background-color: linear-gradient(135deg, #00c6ff, #ff9100);
    color: white;
    transform: translateY(-2px);
  }

  .module-icon {
    font-size: 16px;
  }

  .module-text {
    font-size: 16px;
    font-weight: 500;
  }
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

.dashboard-content {
  display: flex;
  flex-direction: column;
  /* 改为上下布局 */
  width: 100%;
}

.analysis-panel {
  width: 100%;
  height: 100%;
}
</style>