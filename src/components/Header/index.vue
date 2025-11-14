<template>
  <header class="layout-header">
    <div class="header-left">
      <div class="location-info">
        <span class="location-name"  @click="togglePointSelector">当前位置：{{ monitoringPointStore.selectedPointName }}</span>
      </div>
    </div>
          <!-- 切换起降点弹窗 -->
      <div
        v-if="showPointSelector"
        class="dialog-mask"
        @click="togglePointSelector"
      >
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <h3>选择起降点</h3>
            <button class="dialog-close" @click="togglePointSelector">×</button>
          </div>
          <div class="dialog-content">
            <MonitoringPoints
              ref="monitoringPointsRef"
            />
          </div>
        </div>
      </div>
    <div class="logo-text">{{ appTitle }}</div>
    
    <div class="header-right">
      <div class="weather-info">
        <div class="weather-item">
          <img src="@/assets/icons/ic_temperature.png" class="weather-icon" />
          <span class="weather-value">25°C</span>
        </div>
        <div class="weather-item">
          <img src="@/assets/icons/ic_windspeed.png" class="weather-icon" />
          <span class="weather-value">3.5m/s</span>
        </div>
        <div class="weather-item">
          <img src="@/assets/icons/ic_visibility.png" class="weather-icon" />
          <span class="weather-value">10km</span>
        </div>
        <div class="weather-item">
          <img src="@/assets/icons/ic_humidity.png" class="weather-icon" />
          <span class="weather-value">0mm</span>
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
              <span>系统设置</span>
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
import { ref, onMounted, onBeforeMount ,defineAsyncComponent,watch } from "vue";
import { useRouter } from "vue-router";
import { useCurrentTime } from "@/hooks/useTime";
// 导入监测点 store
const MonitoringPoints = defineAsyncComponent(() =>
  import("@/components/business/MonitoringPoints/index.vue")
);
import { useMonitoringPoints } from "@/composables/useMonitoringPoints";

const { currentTime } = useCurrentTime();
// 应用标题
const appTitle = import.meta.env.VITE_APP_TITLE;

const showPointSelector = ref(false);
const monitoringPointsRef = ref(null);
const router = useRouter();
const {
  monitoringPointStore,
  initialize
} = useMonitoringPoints();
// 切换起降点选择器显示
const togglePointSelector = () => {
  showPointSelector.value = !showPointSelector.value;
};
// 跳转设置页面
const handleSetting = () => {
  router.push("/setting");
};

// 退出登录
const handleLogout = () => {
  // 实际项目中添加退出登录逻辑（清除token、状态等）
  router.push("/login");
};

watch(() => monitoringPointStore.selectedPoint, () => {
  togglePointSelector()
});
// 在组件挂载前检查是否需要初始化
onBeforeMount(() => {
  if (!monitoringPointStore.hasPointsList) {
    initialize();
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
  padding: 0 20px;
  
}

.header-left {
  display: flex;
  align-items: center;
  position: absolute;
  left: 300px;
}

.location-info {
 
  
  .location-name {
    font-size: $font-size-medium;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  
}

.header-logo {
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;

  .logo-img {
    height: 36px;
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
  right: 20px;
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
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.weather-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.weather-icon {
  width: 40px;
  height: 40px;
}

.weather-value {
  font-size: $font-size-small;
}

.custom-icon {
  width: 30px; /* 图标宽度（根据实际图标大小调整） */
}

// 在原有的样式部分添加或修改
.user-avatar {
  width: 40px;  
}

.current-time{
  width: 150px;
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
}
</style>