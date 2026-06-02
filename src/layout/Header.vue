<template>
  <header class="layout-header">
    <div class="header-left">
      <div class="header-logo">
        <img src="@/assets/icons/logo.png" class="logo-img" alt="系统logo" />
      </div>
      <!-- 视角切换按钮 -->
      <div class="camera-switcher">
        <div class="camera-btn" :class="{ active: true }" @click="toggleMode"
          :title="currentMode === 'overview' ? '当前区域' : '区域概览'">
          <div class="camera-icon">
            <!-- 根据当前模式显示不同图标 -->
            <el-icon v-if="currentMode === 'overview'">
              <Aim />
            </el-icon>
            <el-icon v-else>
              <House />
            </el-icon>
          </div>
        </div>
      </div>
      <!-- 当前位置 -->
      <div class="area-info">
        <span class="area-name" @click="toggleAreaSelector">当前位置：{{ areaStore.selectedAreaName
        }}</span>
      </div>
    </div>
    <!-- 切换区域弹窗 -->
    <DialogContainer title="选择区域" :visible="showAreaSelector" @close="toggleAreaSelector">
      <AreaList ref="areaListRef" @add-area="handleAddArea" />
    </DialogContainer>

    <!-- 新建区域表单 -->
    <DialogContainer title="新建区域" :visible="showCreateForm" @close="showCreateForm = false">
      <CreateAreaForm ref="createAreaFormRef" @area-created="handleAreaCreated" @close="handleCreateFromClose"
        :reselect-area-callback="handleReselectArea" />
    </DialogContainer>

    <!-- 阈值管理弹窗 -->
    <DialogContainer title="风险阈值设置" :visible="showThresholdDialog" @close="showThresholdDialog = false">
      <ThresholdManagement />
    </DialogContainer>



    <div class="logo-text">{{ appTitle }}</div>

    <div class="header-right">
      <!-- 加载状态 -->
      <div v-if="weatherStore.isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">加载中...</div>
        </div>
      </div>
      <WeatherComponent v-else />
      <div class="current-time">{{ currentTime }}</div>
      <el-dropdown trigger="click">
        <div class="user-info">
          \ <img src="@/assets/icons/ic_user.png" class="user-avatar" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="mapSetting">
              <img src="@/assets/icons/ic_layer.png" class="custom-icon" />
              <span v-if="!showLayerDialog">显示控制</span>
              <span v-else>隐藏控制</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="isAdmin" @click="handleSettingPage">
              <el-icon class="custom-icon"><Management /></el-icon>
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
import {
  ref,
  defineAsyncComponent,
  watch,
  nextTick
} from "vue";
import { useRouter } from "vue-router";
import { useCurrentTime } from "@/hooks/useTime";
// 引入事件管理器
import eventManager from '@/cesium/core/eventManager';
// 导入重点关注区域 store
const AreaList = defineAsyncComponent(() =>
  import("@/components/business/AreaList/index.vue")
);
// 导入创建重点关注区域表单组件
const CreateAreaForm = defineAsyncComponent(() =>
  import("@/components/business/AreaList/CreateAreaForm.vue")
);
// 导入阈值管理组件
const ThresholdManagement = defineAsyncComponent(() =>
  import("@/pages/Admin/ThresholdManagement.vue")
);
import { useWeatherStore } from "@/store/modules/weather";
import { useLayerSettingsStore } from "@/store/modules/layerSettings";
import { useAreaStore } from '@/store/modules/area'
import { ElMessage } from 'element-plus'
import { Management } from '@element-plus/icons-vue'
import DialogContainer from '@/components/common/DialogContainer.vue'
import { InitializationService } from '@/services/initialization'
import { userLogout } from '@/api/auth'
import { canAccessSettingFromStorage } from '@/utils/roleUtils'

// 创建初始化服务实例
const initializationService = new InitializationService();

const layerSettingsStore = useLayerSettingsStore();
const { currentTime } = useCurrentTime();
// 应用标题
const appTitle = import.meta.env.VITE_APP_TITLE;

const showAreaSelector = ref(false);
const createAreaFormRef = ref(null);
const showThresholdDialog = ref(false);
const showLayerDialog = ref(false);
const showCreateForm = ref(false);

// 存储待传递的bbox数据
const pendingBbox = ref(null);

// 监听组件挂载状态
watch(
  createAreaFormRef,
  (newVal) => {
    if (newVal && pendingBbox.value) {
      // 组件已经挂载且有等待处理的bbox数据
      newVal.showCreateForm(pendingBbox.value);
      pendingBbox.value = null; // 清空待处理数据
    }
  },
  { deep: true }
);
const router = useRouter();
const weatherStore = useWeatherStore();
const areaStore = useAreaStore();

// 模式切换状态
const currentMode = ref('overview'); // 默认概览模式

// 检查用户是否为管理员
const isAdmin = ref(canAccessSettingFromStorage());

// 切换模式函数
const toggleMode = () => {
  const newMode = currentMode.value === 'overview' ? 'focus' : 'overview';

  // 如果是切换到重点关注模式，先检查是否有选中的区域
  if (newMode === 'focus') {
    console.log('切换到重点关注模式',areaStore.selectedArea);
    const selectedArea = areaStore.selectedArea;
    if (!selectedArea) {
      console.warn('没有选中的重点关注区域，无法切换到重点关注模式');
      ElMessage.warning('请先选择一个重点关注区域，然后再切换到重点关注模式');
      // 不执行切换
      return;
    }
  }
  // 执行模式切换
  currentMode.value = newMode;
  // 触发模式切换事件，让地图组件响应
  eventManager.emit('modeChange', newMode);
};

// 跳转到系统设置页面
const handleSettingPage = () => {
  router.push('/setting');
};
// 切换区域列表弹窗显示
const toggleAreaSelector = () => {
  showAreaSelector.value = !showAreaSelector.value;
};

// 通用的开始绘制区域方法
const startAreaDrawing = () => {
  try {
    // 先停止可能正在进行的绘制操作，确保状态重置
    if (eventManager.stopRectangleDrawing) {
      eventManager.stopRectangleDrawing();
    }

    // 根据不同情况处理上下文
  
      // 重新选择情况：隐藏创建表单
      showCreateForm.value = false;
   
      showAreaSelector.value = false;
    
      performDrawing();
  } catch (error) {
    // 恢复鼠标样式
    if (eventManager.stopRectangleDrawing) {
      eventManager.stopRectangleDrawing();
    }
  }
};

// 执行实际的绘制操作
const performDrawing = () => {
  // 开始矩形绘制
  eventManager.startRectangleDrawing((rectangle) => {
    // 将Cesium.Rectangle转换为bbox对象
    const bbox = {
      ...rectangle
    };

    // 停止绘制并恢复鼠标样式
    eventManager.stopRectangleDrawing();

    // 显示创建表单
    showCreateForm.value = true;


    // 新增情况：使用pendingBbox
    pendingBbox.value = bbox;

  });
};

// 处理新增关注区域事件
const handleAddArea = () => {
  startAreaDrawing();
};

// 处理新区域创建完成事件
const handleAreaCreated = () => {
  // 关闭创建表单
  showCreateForm.value = false;
  // 重新显示区域选择器弹窗
  showAreaSelector.value = true;
};

// 显示阈值管理弹窗
const handleSetting = () => {
  showThresholdDialog.value = true;
};

// 处理创建表单关闭事件（保留接口兼容性）
const handleCreateFromClose = () => {
  // 停止绘制操作
  eventManager.stopRectangleDrawing();
  // 关闭表单（DialogContainer会自动处理显示/隐藏）
  showCreateForm.value = false;
};

// 显示图层设置弹窗
const mapSetting = () => {
  showLayerDialog.value = !showLayerDialog.value;
  layerSettingsStore.setShow(showLayerDialog.value);
};

// 退出登录
const handleLogout = async () => {
  try {
    await userLogout();
    // 导航到登录页
    router.push("/login");
  } catch (error) {
    console.error('登出失败:', error);
    ElMessage.error('登出失败，请稍后重试');
  }
};


// 监听selectedArea变化，触发天气数据更新
watch(
  () => areaStore.selectedArea,
  (newArea) => {
    showAreaSelector.value = false;
    initializationService.initializeAreaWeatherData();
  }
);
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
  width: 600px;
}

/* 模式切换按钮样式 */
.camera-switcher {
  display: flex;
  align-items: center;
}

.camera-btn {
  width: 40px;
  height: 40px;
  background: radial-gradient(circle at center, rgba(66, 153, 225, 0.8) 0%, rgba(66, 153, 225, 0.3) 100%);
  color: #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.camera-btn:hover {
  //background-color: rgba(37, 99, 235, 0.2);
  //border-color: rgba(59, 130, 246, 0.8);
  color: #fff;
  transform: scale(1.1);
}

.camera-btn.active {
  //background-color: rgba(59, 130, 246, 0.9);
  //border-color: #3b82f6;
  color: white;
  //box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.camera-btn:active {
  transform: scale(0.95);
}

/* 图标样式 */
.camera-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
}

.area-info {
  .area-name {
    font-size: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    font-family: "AiDeepFont";
  }
}

.area-info:hover {
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
  background-image: url('@/assets/images/bg_weather.jpg');
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
  .area-info {
    .area-name {
      max-width: 100px;
      font-size: $font-size-small;
    }

    .switch-area-btn {
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