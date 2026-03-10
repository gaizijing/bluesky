<template>
  <div class="route-list-container">
    <!-- 顶部工具栏：添加按钮 -->
    <div class="top-toolbar">
      <button class="add-route-btn" @click="showAddRouteModal">+ 添加航线</button>
      <button class="clear-screen-btn" @click="clearScreen">
        清屏
      </button>
    </div>

    <!-- 当前正在查看的航线 -->
    <div v-if="routeStore.currentRoute" class="current-route-section">
      <div class="section-title">
        <div class="title-bg">
          <span>当前航线</span>
        </div>
      </div>


      <div class="current-route-info">

        <div class="route-path">
          <span class="start-point">{{ routeStore.currentRoute.startName }}</span>
          <span class="path-arrow">→</span>
          <template v-if="routeStore.currentRoute.waypoints && routeStore.currentRoute.waypoints.length > 2">
            <span v-for="(waypoint, index) in routeStore.currentRoute.waypoints.slice(1, -1)" :key="index"
              class="waypoint">
              {{ waypoint.name || `途经点${index + 1}` }}

            </span>
            <span class="path-arrow">→</span>
          </template>
          <span class="end-point">{{ routeStore.currentRoute.endName }}</span>
        </div>
        <div class="route-details">
          <span class="detail-item">总长: {{ routeStore.currentRoute.length.toFixed(1) }}km</span>
          <span class="detail-item">航段数: {{ routeStore.currentRoute.segments }}</span>
          <span class="detail-item">平均风险:
            <span class="risk-badge" :class="getRiskClass(routeStore.currentRoute.averageRisk)">
              {{ getRiskText(routeStore.currentRoute.averageRisk) }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 历史分析记录列表 -->
    <div class="history-section">
      <div class="section-title">
        <div class="title-bg">
          <span>历史分析记录</span>
        </div>

        <button class="clear-history-btn" @click="clearHistory"
          v-if="filteredRoutes && filteredRoutes.length > 0">清空</button>
      </div>
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载历史记录中...</p>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && filteredRoutes?.length === 0" class="empty-state">
        <p>没有历史航线记录</p>
      </div>

      <!-- 历史记录列表项 -->
      <div class="history-list">
        <div v-for="route in filteredRoutes" :key="route.id" class="history-item" :data-route-id="route.id"
          :class="{ active: route.id === routeStore.renderedRouteId }">
          <div class="route-path" @click="onRouteClick(route)">
            <span class="start-point">{{ route.startName }}</span>
            <span class="path-arrow">→</span>
            <template v-if="route.waypoints && route.waypoints.length > 2">
              <span v-if="expandedRouteIds.has(route.id)" class="waypoint-toggle"
                @click.stop="expandedRouteIds.delete(route.id)">▼</span>

              <div v-if="expandedRouteIds.has(route.id)" class="waypoints-expanded">
                <span v-for="(waypoint, index) in route.waypoints.slice(1, -1)" :key="index" class="waypoint">
                  {{ waypoint.name || `途经点${index + 1}` }}
                  <span class="path-arrow">→</span>
                </span>
              </div>
              <span v-else class="waypoints-count">
                ({{ route.waypoints.length - 2 }}个途经点)
              </span>
              <span class="path-arrow">→</span>
            </template>
            <span class="end-point">{{ route.endName }}</span>
          </div>

        </div>
      </div>
    </div>

    <!-- 航段详情悬浮tooltip -->
    <div v-if="showSegmentTooltip && currentSegment" class="segment-tooltip"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }">
      <div class="tooltip-header">
        <h4>第{{ currentSegment.segment }}航段</h4>
      </div>
      <div class="tooltip-content">
        <p>
          <span>距离：</span>{{
            currentSegment.distance
              ? currentSegment.distance.toFixed(1)
              : "N/A"
          }}km
        </p>
        <p><span>风险等级：</span>{{ getRiskText(currentSegment.risk) }}</p>
        <p><span>风速：</span>{{ currentSegment.windSpeed || "N/A" }}m/s</p>
        <p>
          <span>风切变：</span>{{
            currentSegment.windShear
              ? currentSegment.windShear.toFixed(1)
              : "N/A"
          }}
        </p>
        <p>
          <span>湍流：</span>{{
            currentSegment.turbulence
              ? currentSegment.turbulence.toFixed(1)
              : "N/A"
          }}
        </p>
      </div>
    </div>

    <!-- 航线分析弹窗已替换为底部面板 -->

    <!-- 底部查询面板 -->
    <div v-if="routeStore.currentRoute" class="bottom-query-panel">

      <div class="panel-content">
        <RouterRisk :current-route="routeStore.currentRoute" :route-data="currentRouteData" />
      </div>
    </div>

    <!-- 使用封装好的DialogContainer组件 -->

  </div>
  <DialogContainer :visible="showAddRouteModalFlag" title="添加新航线" @close="closeAddRouteModal">
    <form @submit.prevent="addNewRoute" class="add-route-form">
      <div class="form-group">
        <label>起始地点:</label>
        <input v-model="newRouteForm.startName" type="text" placeholder="起始地名" required />
        <div class="coordinate-inputs">
          <input v-model.number="newRouteForm.startLon" type="number" step="0.000001" placeholder="经度" required />
          <input v-model.number="newRouteForm.startLat" type="number" step="0.000001" placeholder="纬度" required />
          <button type="button" class="map-select-btn" @click="startMapSelection('start')">
            地图选点
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>终点:</label>
        <input v-model="newRouteForm.endName" type="text" placeholder="终点地名" required />
        <div class="coordinate-inputs">
          <input v-model.number="newRouteForm.endLon" type="number" step="0.000001" placeholder="经度" required />
          <input v-model.number="newRouteForm.endLat" type="number" step="0.000001" placeholder="纬度" required />
          <button type="button" class="map-select-btn" @click="startMapSelection('end')">
            地图选点
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>途经点:</label>
        <div class="waypoints-list">
          <div v-for="(waypoint, index) in newRouteForm.waypoints" :key="index" class="waypoint-item">
            <input v-model="waypoint.name" type="text" placeholder="途经点名称" />
            <div class="coordinate-inputs">
              <input v-model.number="waypoint.lon" type="number" step="0.000001" placeholder="经度" required />
              <input v-model.number="waypoint.lat" type="number" step="0.000001" placeholder="纬度" required />
              <button type="button" class="map-select-btn" @click="startMapSelection(`waypoint_${index}`)">
                地图选点
              </button>
            </div>
            <button type="button" class="remove-waypoint-btn" @click="removeWaypoint(index)">
              删除
            </button>
          </div>
        </div>
        <button type="button" class="add-waypoint-btn" @click="addWaypoint">
          + 添加途经点
        </button>
      </div>

      <div class="form-group">
        <label>飞行器型号:</label>
        <input v-model="newRouteForm.aircraftModel" type="text" placeholder="例如: DJI Mavic 3" required />
      </div>

      <div class="form-group">
        <label>总飞行高度:</label>
        <input v-model.number="newRouteForm.flightHeight" type="number" step="10" placeholder="飞行高度(m)" required />
      </div>

      <div class="form-row">
        <div class="form-group half-width">
          <label>起始时间:</label>
          <input v-model="newRouteForm.startTime" type="datetime-local" :min="todayMin" :max="todayMax" required />
        </div>

        <div class="form-group half-width">
          <label>终止时间:</label>
          <input v-model="newRouteForm.endTime" type="datetime-local" :min="newRouteForm.startTime || todayMin"
            :max="todayMax" required />
        </div>
      </div>
    </form>
    <template #footer>
      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeAddRouteModal">取消</button>
        <button class="confirm-btn" @click="addNewRoute">确定添加</button>
      </div>
    </template>
  </DialogContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import * as Cesium from 'cesium';
import RouterRisk from "@/components/business/RouterRisk/index.vue";
import { useCesium } from "@/hooks/useCesium";
import eventManager from "@/cesium/core/eventManager";
import DialogContainer from "@/components/common/DialogContainer.vue";
import { useRouteStore } from "@/store/modules/routeStore"; // 引入store
import { useHeatmapStore } from "@/store/modules/heatmap"; // 引入热力图store
import routeManager from "@/cesium/entities/routes"; // 导入航线管理器
import { useWindStore } from '@/store/modules/wind'
const routeStore = useRouteStore();
const heatmapStore = useHeatmapStore();

// 状态管理
const routes = ref([]);
const isLoading = ref(true);
const searchKeyword = ref("");
const currentRoute = ref(null);
const currentRouteData = ref([]);
// 历史记录展开状态管理
const expandedRouteIds = ref(new Set());
// 航段tooltip状态
const showSegmentTooltip = ref(false);
const currentSegment = ref(null);
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

// 使用Cesium hook
const { showRouteOnMap, clearCurrentRoute, getCesiumRiskColor } = useCesium();

// 当前正在选点的目标（start, end, waypoint_${index}）
const selectingPointTarget = ref(null);

// 开始地图选点
const startMapSelection = (target) => {
  selectingPointTarget.value = target;
  // 关闭弹窗
  showAddRouteModalFlag.value = false;

  // // 修改鼠标样式
  // document.body.style.cursor = 'crosshair';

  // 添加地图点击事件监听
  const handleMapClick = (viewer, movement) => {
    // 使用Cesium API将屏幕坐标转换为经纬度
    const cartesian = viewer.scene.pickPosition(movement.position);
    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      if (cartographic) {
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        // 将坐标填充到对应的表单字段中
        fillSelectedCoordinates([longitude, latitude]);
        // 停止选点
        stopMapSelection();
        // 重新打开弹窗
        console.log('dakai');

        showAddRouteModalFlag.value = true;
      }
    }
    return true; // 表示事件已处理
  };

  // 使用eventManager注册点击事件
  eventManager.registerClickHandler(handleMapClick);
};

// 填充选中的坐标
const fillSelectedCoordinates = (position) => {
  const [longitude, latitude] = position;

  if (selectingPointTarget.value === 'start') {
    newRouteForm.value.startLon = longitude;
    newRouteForm.value.startLat = latitude;
  } else if (selectingPointTarget.value === 'end') {
    newRouteForm.value.endLon = longitude;
    newRouteForm.value.endLat = latitude;
  } else if (selectingPointTarget.value.startsWith('waypoint_')) {
    const index = parseInt(selectingPointTarget.value.split('_')[1]);
    if (newRouteForm.value.waypoints[index]) {
      newRouteForm.value.waypoints[index].lon = longitude;
      newRouteForm.value.waypoints[index].lat = latitude;
    }
  }
};

// 停止地图选点
const stopMapSelection = () => {
  // 恢复鼠标样式
  document.body.style.cursor = '';
  // 移除地图点击事件
  eventManager.unregisterClickHandlers();
  selectingPointTarget.value = null;
};

// 过滤后的航线列表
const filteredRoutes = computed(() => {
  if (!searchKeyword.value) return routes.value;
  const keyword = searchKeyword.value.toLowerCase();
  return routes.value.filter((route) =>
    route.name.toLowerCase().includes(keyword)
  );
});



// 加载航线数据
const loadRoutes = async () => {
  isLoading.value = true;

  const { getRoutes } = await import('@/api');
  const routeData = await getRoutes();
  if (routeData && routeData.routes) {
    routes.value = routeData.routes.map(route => ({
      ...route,
      // 确保时间格式正确
      startTime: route.startTime ? new Date(route.startTime) : new Date(),
      endTime: route.endTime ? new Date(route.endTime) : new Date()
    }));
  } else {
    routes.value = [];
  }

  isLoading.value = false;

};



// 清空历史分析记录
const clearHistory = () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    routes.value = [];
  }
};


const getRiskClass = (value) => {
  if (value < 0.3) return "low";
  if (value < 0.7) return "medium";
  return "high";
};
const getRiskText = (value) => {
  if (value < 0.3) return "低风险";
  if (value < 0.7) return "中风险";
  return "高风险";
};
// 新增：列表点击事件（核心！）
const onRouteClick = async (route) => {

  // 获取航路详情
  const { getRouteDetail } = await import('@/api');
  const detailData = await getRouteDetail(route.id);

  // 合并详情数据
  const fullRouteData = {
    ...route,
    ...detailData,
    // 确保 segmentData 格式一致
    segmentData: route.segmentData || []
  };

  routeStore.setCurrentRoute(fullRouteData);


  // 切换到全市热力图模式
  heatmapStore.switchToCitywideMode();
  console.log('切换到全市热力图模式，当前模式:', heatmapStore.heatmapMode);

  // 2. 可选：滚动/高亮当前航线
  document.querySelector(`[data-route-id="${route.id}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

const releaseRoute = () => {
  currentRoute.value = null;
  routeStore.clearCurrentRoute();

  routeManager.clearAllRoutes();
};

// 清屏功能，取消屏幕上的航线预览
const clearScreen = () => {
  releaseRoute();
  // 恢复区域热力图模式
  heatmapStore.resetToDefault();
  console.log('清屏，恢复区域热力图模式，当前模式:', heatmapStore.heatmapMode);
};

onMounted(() => {
  loadRoutes();
});

// 监听当前航线变化，更新图表数据
watch(
  () => routeStore.currentRoute,
  (newRoute) => {
    if (newRoute && newRoute.segmentData) {
      currentRouteData.value = newRoute.segmentData;
    }
  },
  { deep: true }
);

const showAddRouteModalFlag = ref(false);

// 获取今天的最小和最大时间（用于限制 datetime-local 输入）
const now = new Date();
const todayMin = ref(now.toISOString().slice(0, 16)); // 今天 00:00
const todayMax = ref(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).toISOString().slice(0, 16)); // 今天 23:59

const newRouteForm = ref({
  startName: "",
  startLon: null,
  startLat: null,
  endName: "",
  endLon: null,
  endLat: null,
  waypoints: [],
  aircraftModel: "",
  flightHeight: 300, // 总飞行高度，默认300m
  startTime: todayMin.value, // 起始时间，默认今天 00:00
  endTime: todayMax.value, // 终止时间，默认今天 23:59
});
// 显示添加航线模态框
const showAddRouteModal = () => {
  showAddRouteModalFlag.value = true;
  document.body.style.overflow = "hidden";
};

// 关闭添加航线模态框
const closeAddRouteModal = () => {
  showAddRouteModalFlag.value = false;
  document.body.style.overflow = "";
  // 重置表单
  newRouteForm.value = {
    startName: "",
    startLon: null,
    startLat: null,
    endName: "",
    endLon: null,
    endLat: null,
    waypoints: [],
    aircraftModel: "",
    flightHeight: 300,
    startTime: todayMin.value,
    endTime: todayMax.value,
  };
};

// 添加途经点
const addWaypoint = () => {
  newRouteForm.value.waypoints.push({
    name: "",
    lon: null,
    lat: null,
  });
};

// 删除途经点
const removeWaypoint = (index) => {
  newRouteForm.value.waypoints.splice(index, 1);
};

// 添加新航线（前端只传递基本数据，后端计算里程、风险等）
const addNewRoute = async () => {
  // 表单验证
  if (
    !newRouteForm.value.startName ||
    !newRouteForm.value.startLon ||
    !newRouteForm.value.startLat ||
    !newRouteForm.value.endName ||
    !newRouteForm.value.endLon ||
    !newRouteForm.value.endLat ||
    !newRouteForm.value.aircraftModel ||
    !newRouteForm.value.startTime ||
    !newRouteForm.value.endTime
  ) {
    alert("请填写所有必填字段");
    return;
  }

  // 验证时间范围
  const startTime = new Date(newRouteForm.value.startTime);
  const endTime = new Date(newRouteForm.value.endTime);

  if (endTime <= startTime) {
    alert("终止时间必须晚于起始时间");
    return;
  }

  // 验证坐标范围
  const coords = [
    [newRouteForm.value.startLon, newRouteForm.value.startLat],
    [newRouteForm.value.endLon, newRouteForm.value.endLat],
    ...newRouteForm.value.waypoints.map((wp) => [wp.lon, wp.lat]),
  ];

  for (const [lon, lat] of coords) {
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      alert("坐标超出有效范围");
      return;
    }
  }

  // 构造发送给后端的基本数据（不包含计算字段）
  const routeRequestData = {
    startName: newRouteForm.value.startName,
    startLon: newRouteForm.value.startLon,
    startLat: newRouteForm.value.startLat,
    endName: newRouteForm.value.endName,
    endLon: newRouteForm.value.endLon,
    endLat: newRouteForm.value.endLat,
    waypoints: newRouteForm.value.waypoints.map(wp => ({
      name: wp.name || "途经点",
      lon: wp.lon,
      lat: wp.lat
    })),
    aircraftModel: newRouteForm.value.aircraftModel,
    flightHeight: newRouteForm.value.flightHeight,
    startTime: startTime.toISOString(), // ISO字符串格式
    endTime: endTime.toISOString(),     // ISO字符串格式
  };

  // 调用API保存航线到后端
  const { createRoute } = await import('@/api');
  const response = await createRoute(routeRequestData);
  if (response && response.success) {
    // 后端返回完整航线数据（包含计算后的字段）
    const routeFromBackend = response.route;

    // 保存成功后重新加载航线列表
    await loadRoutes();

    // 设置当前航线，触发地图更新（使用后端返回的完整数据）
    routeStore.setCurrentRoute(routeFromBackend);
    heatmapStore.switchToCitywideMode();

    // 关闭模态框并重置表单
    closeAddRouteModal();

    alert("航线添加成功！");
  } else {
    alert(`航线添加失败: ${response?.message || '未知错误'}`);
  }

};

</script>

<style scoped lang="scss">
/* 右下角航线分析面板样式 */
.bottom-query-panel {
  position: absolute;
  bottom: -325px;
  left: -18px;
  width: 650px;
  max-width: 90vw;

  z-index: 1000;
  max-height: 40vh;
  display: flex;
  flex-direction: column;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h3 {
      margin: 0;
      font-size: 15px;
      color: #ffffff;
    }

    .panel-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      transition: color 0.2s;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .panel-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    .export-btn {
      padding: 8px 16px;
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid #3b82f6;
      color: #3b82f6;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;

      &:hover {
        background-color: rgba(59, 130, 246, 0.2);
      }
    }
  }
}

.route-list-container {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

}

/* 顶部工具栏样式 */
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
  gap: 10px;
}

.add-route-btn {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.clear-screen-btn {
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

/* 视角控制样式 */
.view-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
}

.view-btn {
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* 通用区域标题样式 */
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 清空历史按钮样式 */
.clear-history-btn {
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
}

/* 当前航线区域样式 */
.current-route-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.current-route-info {
  padding: 8px;
}

.route-name {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.route-path {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 100%;
  overflow-x: auto;
}

/* 滚动条样式 */
.route-path::-webkit-scrollbar {
  height: 4px;
}

.route-path::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.route-path::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 2px;
}

.route-path::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

.start-point,
.end-point {
  font-size: 13px;
  color: #60a5fa;
  font-weight: 500;
  background-color: rgba(59, 130, 246, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.path-arrow {
  color: #94a3b8;
  font-size: 14px;
}

.route-details {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 12px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 历史分析记录区域样式 */
.history-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 压缩面板高度到原来的2/3 */
  max-height: 20vh
}

/* 历史记录列表容器 */
.history-list {
  flex: 1;
  overflow-y: auto;

  /* 美化滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 3px;
    transition: background 0.2s;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
  }
}

/* 历史记录项样式 */
.history-item {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background-color: rgba(56, 70, 100, 0.3);
    cursor: pointer;
  }

  &.active {
    background-color: rgba(59, 130, 246, 0.2);
  }

  /* 历史记录项中的路径样式 */
  .route-path {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 100%;
  }

  /* 途经点展开/收起相关样式 */
  .waypoint-toggle {
    color: #60a5fa;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    padding: 2px 4px;
    border-radius: 3px;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(59, 130, 246, 0.1);
    }
  }

  .waypoints-count {
    color: #94a3b8;
    font-size: 12px;
    background-color: rgba(148, 163, 184, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .waypoints-expanded {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 0 20px;
    flex-wrap: wrap;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 5px;
    border-left: 2px dashed rgba(59, 130, 246, 0.2);
    padding-left: 12px;
  }

  /* 途经点展开区域的水平滚动条样式 */
  .waypoints-expanded::-webkit-scrollbar {
    height: 4px;
  }

  .waypoints-expanded::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
  }

  .waypoints-expanded::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 2px;
  }

  /* 历史记录项中的详情样式 */
  .route-details {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    align-items: center;

    /* 历史记录项中的分析按钮样式 */
    .analyze-btn {
      margin-left: auto;
      padding: 6px 12px;
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid #3b82f6;
      color: #3b82f6;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;

      &:hover {
        background-color: rgba(59, 130, 246, 0.2);
      }
    }
  }
}



/* 当前航线途经点样式 */
.waypoint {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
  background-color: rgba(16, 185, 129, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* 分析按钮样式 */
.analyze-btn {
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  color: #10b981;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
  }
}

/* 加载状态和空状态样式 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #94a3b8;
  font-size: 13px;
}

.spinner {
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 风险标签样式 */
.risk-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  color: white;

  &.low {
    background-color: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  &.medium {
    background-color: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  &.high {
    background-color: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}


.segment-bar {
  height: 16px;
  border-radius: 3px;
  transition: height 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &:hover {
    height: 20px;
    z-index: 5;
  }

  .segment-number {
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    opacity: 0.8;
  }
}

.visual-legend {
  display: flex;
  gap: 10px;
  padding-left: 3px;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: #94a3b8;
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}


/* 原有样式保持不变 */
.table-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5px;

  &.route-name {
    .route-title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .route-subtitle {
      font-size: 12px;
      color: #94a3b8;
    }
  }

  &.route-length,
  &.segment-count {
    .primary-text {
      font-size: 15px;
      font-weight: 600;
      color: #e2e8f0;
    }
  }

  &.avg-risk {
    .risk-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      width: fit-content;
      margin-bottom: 4px;

      &.low {
        background: rgba(16, 185, 129, 0.15);
      }

      &.medium {
        background: rgba(245, 158, 11, 0.15);
      }

      &.high {
        background: rgba(239, 68, 68, 0.15);
      }

      .risk-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .risk-value {
        font-size: 13px;
        font-weight: 600;
      }
    }

    .risk-label {
      font-size: 12px;
      color: #94a3b8;
    }
  }

  &.max-risk {
    .segment-info {
      display: flex;
      align-items: center;
      margin-bottom: 4px;

      .segment-number {
        font-size: 13px;
        color: #e2e8f0;
        font-weight: 500;
      }
    }

    .risk-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 10px;
      width: fit-content;

      &.low {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }

      &.medium {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }

      &.high {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }

      .risk-value {
        font-size: 12px;
        font-weight: 600;
      }
    }
  }

  &.actions {
    align-items: flex-end;
  }
}

.analyze-btn {
  padding: 6px;
  width: 40px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

/* 航段tooltip样式 */
.segment-tooltip {
  position: fixed;
  background-color: rgba(15, 23, 51, 0.95);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
  width: 180px;

  .tooltip-header {
    padding: 6px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h4 {
      margin: 0;
      font-size: 13px;
      color: #3b82f6;
    }
  }

  .tooltip-content {
    padding: 8px 10px;
    font-size: 12px;

    p {
      margin: 3px 0;
      line-height: 1.3;

      span {
        color: #94a3b8;
        display: inline-block;
        width: 60px;
      }
    }
  }
}

/* 原有加载、空状态、弹窗样式保持不变 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #94a3b8;

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(59, 130, 246, 0.3);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #94a3b8;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  background-color: #0f1733;
  border-radius: 8px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    font-size: 18px;
    color: #ffffff;
  }
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #ffffff;
  }
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
}

.dialog-footer {
  padding: 15px 15px 0 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.export-btn {
  padding: 8px 16px;
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
}

.close-dialog-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2563eb;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {

  .table-header,
  .route-basic-info {
    grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 1fr;
  }
}

@media (max-width: 992px) {

  .table-header .avg-risk,
  .route-basic-info .avg-risk {
    display: none;
  }

  .table-header,
  .route-basic-info {
    grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr;
  }
}

@media (max-width: 768px) {

  .table-header .max-risk,
  .route-basic-info .max-risk {
    display: none;
  }

  .table-header,
  .route-basic-info {
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
  }

  .route-visual-info .segment-bars {
    height: 20px;
  }

  .route-visual-info .segment-bar {
    height: 12px;
  }

  .route-visual-info .segment-bar:hover {
    height: 16px;
  }

  .visual-legend {
    display: none;
  }

  .table-column.actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.add-route-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.half-width {
  flex: 1;
}

input[type="datetime-local"] {
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid #334155;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 500;
  }

  input[type="text"],
  input[type="number"] {
    padding: 8px 12px;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid #334155;
    border-radius: 4px;
    color: #e2e8f0;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }

    &::placeholder {
      color: #94a3b8;
    }
  }
}

.coordinate-inputs {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
  }
}

.waypoints-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.waypoint-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 6px;
  border: 1px solid #334155;
}

.remove-waypoint-btn {
  align-self: flex-end;
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
}

.add-waypoint-btn {
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px dashed #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  width: fit-content;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
}

/* 地图选点按钮样式 */
.map-select-btn {
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.cancel-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid #475569;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.confirm-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
  }
}

.title-bg {
  background-image: url(/src/assets/images/bg_panel_subtitle.png);
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  padding-left: 5px;
  width: 100px;
}
</style>