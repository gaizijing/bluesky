<template>
  <header class="layout-header">
    <div class="header-left">
      <div class="header-logo">
        <img src="@/assets/icons/logo.png" class="logo-img" alt="系统logo" />
      </div>
      <div class="location-info">
        <span class="location-name" @click="togglePointSelector">当前位置：{{ monitoringPointStore.selectedPointName
        }}</span>
      </div>
    </div>
    <!-- 切换起降点弹窗 -->
    <div v-if="showPointSelector" class="dialog-mask" @click="togglePointSelector">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <h3>选择起降点</h3>
          <button class="dialog-close" @click="togglePointSelector">×</button>
        </div>
        <div class="dialog-content">
          <MonitoringPoints ref="monitoringPointsRef" />
        </div>
      </div>
    </div>

    <!-- 阈值管理弹窗 -->
    <div v-if="showThresholdDialog" class="dialog-mask" @click="handleThresholdClose">
      <div class="dialog-container" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-header-h3">阈值设置</h3>
          <button class="dialog-close" @click="handleThresholdClose">×</button>
        </div>
        <div class="dialog-content">
          <ThresholdManagement />
        </div>
      </div>
    </div>

    <!-- 详细天气弹窗 -->
    <div v-if="showWeatherDetail" class="dialog-mask" @click="toggleWeatherDetail">
      <div class="weather-detail-container" @click.stop>
        <div class="weather-detail-header">
          <div class="weather-main-info">
            <div class="temperature">{{ weatherStore.currentPointWeather.temp }}℃</div>
            <div class="weather-status">{{ weatherStore.currentPointWeather.text }}</div>
          </div>
          <div class="weather-date-info">
            <div class="date">{{ currentDate }}</div>
            <div class="location">{{ monitoringPointStore.selectedPointName }}</div>
          </div>
        </div>
        <div class="weather-detail-content">
          <div class="weather-item">
            <div class="weather-item-label">风速</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.windSpeed }}</div>
            <div class="weather-item-unit">m/s</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">能见度</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.vis }}</div>
            <div class="weather-item-unit">km</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">降水量</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.precip }}</div>
            <div class="weather-item-unit">mm</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">湿度</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.humidity }}</div>
            <div class="weather-item-unit">%</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">气压</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.pressure }}</div>
            <div class="weather-item-unit">hPa</div>
          </div>
          <div class="weather-item">
            <div class="weather-item-label">风向</div>
            <div class="weather-item-value">{{ weatherStore.currentPointWeather.windDir }}</div>
          </div>
        </div>
        <div class="weather-detail-footer">
          <div class="weather-suggestion">
            <div class="suggestion-title">今日天气状况良好，适宜飞行</div>
          </div>
        </div>
        <button class="weather-detail-close" @click="toggleWeatherDetail">×</button>
      </div>
    </div>

    <div class="logo-text">{{ appTitle }}</div>

    <div class="header-right">
      <!-- 加载状态 -->
      <div v-if="weatherStore.isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">加载中...</div>
        </div>
      </div>
      <div v-else class="weather-info" @click="toggleWeatherDetail">
        <div class="weather-item">
          <div class="weather-icon-circle">
            <img src="@/assets/icons/ic_temperature.png" class="weather-icon" />
          </div>

          <span class="weather-value">{{
            weatherStore.headerWeatherInfo.temperature
          }}</span>
        </div>
        <div class="weather-item">
          <div class="weather-icon-circle">
            <img src="@/assets/icons/ic_windspeed.png" class="weather-icon" />
          </div>
          <span class="weather-value">{{
            weatherStore.headerWeatherInfo.windSpeed
          }}</span>
        </div>
        <div class="weather-item">
          <div class="weather-icon-circle">
            <img src="@/assets/icons/ic_visibility.png" class="weather-icon" />
          </div>
          <span class="weather-value">{{
            weatherStore.headerWeatherInfo.visibility
          }}</span>
        </div>
        <div class="weather-item">
          <div class="weather-icon-circle">
            <img src="@/assets/icons/ic_humidity.png" class="weather-icon" />
          </div>
          <span class="weather-value">{{
            weatherStore.headerWeatherInfo.humidity
          }}</span>
        </div>
      </div>
      <div class="current-time">{{ currentTime }}</div>
      <el-dropdown trigger="click">
        <div class="user-info">
          <!-- 将原来的 el-avatar 替换为使用 ic_user.png 图片 -->
          <img src="@/assets/icons/ic_user.png" class="user-avatar" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleSetting">
              <img src="@/assets/icons/ic_setting.png" class="custom-icon" />
              <span>阈值设置</span>
            </el-dropdown-item>
            <el-dropdown-item @click="mapSetting">
              <img src="@/assets/icons/ic_layer.png" class="custom-icon" />
              <span v-if="!showLayerDialog">显示控制</span>
              <span v-else>隐藏控制</span>
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">
              <img src="@/assets/icons/ic_exit.png" class="custom-icon" />
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>


  </header>
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeMount,
  onUnmounted,
  computed,
  defineAsyncComponent,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import { useCurrentTime } from "@/hooks/useTime";
// 导入重点关注区域 store
const MonitoringPoints = defineAsyncComponent(() =>
  import("@/components/business/MonitoringPoints/index.vue")
);
// 导入阈值管理组件
const ThresholdManagement = defineAsyncComponent(() =>
  import("@/pages/Setting/views/ThresholdManagement.vue")
);
import { useWeatherStore } from "@/store/modules/weather";
import { useLayerSettingsStore } from "@/store/modules/layerSettings";
import { fetchCurrentPointWeather } from "@/api";
import { fetchMonitoringPoints, fetchCurrentMonitoringPoint } from '@/api'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'

const layerSettingsStore = useLayerSettingsStore();
const { currentTime } = useCurrentTime();
// 应用标题
const appTitle = import.meta.env.VITE_APP_TITLE;

const showPointSelector = ref(false);
const monitoringPointsRef = ref(null);
const showThresholdDialog = ref(false);
const showLayerDialog = ref(false);
const showWeatherDetail = ref(false);
const router = useRouter();
const weatherStore = useWeatherStore();
const monitoringPointStore = useMonitoringPointStore();
// 切换起降点选择器显示
const togglePointSelector = () => {
  showPointSelector.value = !showPointSelector.value;
};
// 显示阈值管理弹窗
const handleSetting = () => {
  showThresholdDialog.value = true;
};

// 处理阈值管理弹窗关闭
const handleThresholdClose = () => {
  showThresholdDialog.value = false;
};

// 显示图层设置弹窗
const mapSetting = () => {
  showLayerDialog.value = !showLayerDialog.value;
  layerSettingsStore.setShow(showLayerDialog.value);
};

// 切换详细天气弹窗显示
const toggleWeatherDetail = () => {
  showWeatherDetail.value = !showWeatherDetail.value;
};

// 退出登录
const handleLogout = () => {
  // 实际项目中添加退出登录逻辑（清除token、状态等）
  router.push("/login");
};

// 当前日期
const currentDate = computed(() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${year}-${month}-${day} ${week}`;
});

// 点击外部关闭弹窗
const handleClickOutside = (event) => {
  if (showWeatherDetail.value) {
    const weatherInfo = document.querySelector('.weather-info');
    const weatherPopup = document.querySelector('.weather-detail-container');
    if (weatherInfo && !weatherInfo.contains(event.target) && weatherPopup && !weatherPopup.contains(event.target)) {
      showWeatherDetail.value = false;
    }
  }
};

// 添加全局点击事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 移除全局点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 获取当前重点关注区域的天气数据并保存到store
const fetchAndSaveWeatherData = async () => {
  if (!monitoringPointStore.hasSelectedPoint) {
    return;
  }
  weatherStore.setIsLoading(true);
  const weatherData = await fetchCurrentPointWeather(
    monitoringPointStore.selectedPoint
  );
  weatherStore.setCurrentPointWeather(weatherData);
  weatherStore.setIsLoading(false);
};
// 监听selectedPoint变化，触发监测列表的初始化和天气数据更新
watch(
  () => monitoringPointStore.selectedPoint,
  (newPoint) => {
    showPointSelector.value = false;
    if (newPoint) {
      fetchAndSaveWeatherData();
    }
  }
);
// 在组件挂载前检查是否需要初始化
onMounted(async () => {

  // 从API获取重点关注区域数据
  const pointsData = await fetchMonitoringPoints();
  const currentPoint = await fetchCurrentMonitoringPoint();
  // 保存到store
  monitoringPointStore.setPointsList(pointsData);
  monitoringPointStore.setSelectedPoint(currentPoint);

});

// 组件挂载后，获取当前重点关注区域的天气数据
onMounted(() => {
  if (monitoringPointStore.hasSelectedPoint) {
    fetchAndSaveWeatherData();
  }
});
</script>

<style scoped lang="scss">
.layout-header {
  width: 100%;
  height: $header-height;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  position: relative;
  color: $header-color;
  font-family: "jingangFont";
  font-style: italic;
  background-color: #09294161;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  position: absolute;
  left: 8px;
  justify-content: space-between;
  width: 500px;
}

.location-info {
  .location-name {
    font-size: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    font-family: "AiDeepFont";
  }
}

.location-info:hover {
  transform: scale(1.05);
}

.header-logo {
  display: flex;
  align-items: center;
  margin-right: 20px;
  margin-bottom: 13px;

  .logo-img {
    height: 40px;
    width: auto;
  }
}

.logo-text {
  font-size: $font-size-title;
  margin: 0 auto;
  /* text-shadow: 水平偏移 垂直偏移 模糊半径 发光颜色; */
  text-shadow: 0 0 6px rgba(34, 101, 255, 0.3), 0 0 12px #182e3f;
}

.header-right {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 20px;
  text-shadow: 0 0 6px rgba(34, 101, 255, 0.3), 0 0 12px #182e3f;
  font-size: $font-size-medium;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 0 15px;
  cursor: pointer;
  transition: all 0.3s ease;

}

.weather-info:hover {
  transform: scale(1.05);
}

.weather-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.weather-icon-circle {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, rgba(66, 153, 225, 0.8) 0%, rgba(66, 153, 225, 0.3) 100%);
}

.weather-icon {
  width: 20px;
  height: 20px;
}

.weather-value {
  font-size: $font-size-small;
}

.custom-icon {
  width: 30px;
  /* 图标宽度（根据实际图标大小调整） */
}

// 在原有的样式部分添加或修改
.user-avatar {
  width: 40px;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.current-time {
  width: 150px;
}

.user-info {
  cursor: pointer;
}

.weather-info {
  cursor: pointer;
}

.dialog-container {
  font-style: normal !important;
  font-family: "AideepFont" !important;
}

.weather-detail-container {
  font-style: normal !important;
  font-family: "AideepFont" !important;
}

/* 详细天气弹窗样式 */
.weather-detail-container {
  position: absolute;
  top: 100px;
  right: 20px;
  width: 350px;
  background-image: url('@/assets/images/bg_weather.jpg') ;
  background-size: cover;
  background-position: center;
  border-radius: 10px;
  color: #fff;
  padding: 20px;
  font-family: 'AideepFont';
}

.weather-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.weather-main-info {
  text-align: left;
}

.temperature {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 5px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.weather-status {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
}

.weather-date-info {
  text-align: right;
}

.date {
  font-size: 16px;
  margin-bottom: 5px;
}

.location {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.weather-detail-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}


.weather-item-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
}

.weather-item-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 3px;
}

.weather-item-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.weather-detail-footer {
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.weather-suggestion {
  text-align: center;
}

.suggestion-title {
  font-size: 14px;
  color: #4CAF50;
  font-weight: bold;
}

.weather-detail-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
}

.weather-detail-close:hover {
  color: #fff;
}

@media (max-width: 768px) {
  .location-info {
    .location-name {
      max-width: 100px;
      font-size: $font-size-small;
    }

    .switch-location-btn {
      padding: 3px 8px;
      font-size: 13px;
    }
  }

  .header-right {
    gap: 10px;
  }

  .weather-info {
    gap: 8px;
    padding: 0 10px;
  }

  .weather-icon {
    width: 30px;
    height: 30px;
  }

  .weather-value {
    font-size: 13px;
  }

  .weather-detail-container {
    width: 90%;
    right: 5%;
    top: 80px;
  }
}
</style>