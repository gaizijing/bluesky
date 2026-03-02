<template>
  <div class="route-list-container">
    <!-- 顶部工具栏：添加按钮和视角控制 -->
    <div class="top-toolbar">
      <button class="add-route-btn" @click="showAddRouteModal">+ 添加航线</button>
      <!-- 当前没有航线时隐藏视角控制 -->
      <div v-if="routeStore.currentRoute" class="view-controls">
        <span class="view-label">视角控制:</span>
        <button class="view-btn" @click="viewTopDown" title="俯视视角">
          俯视
        </button>
        <button class="view-btn" @click="viewSide" title="侧视视角">
          侧视
        </button>
        <button class="view-btn" @click="viewCurrentAircraft" title="跟踪飞机">
          跟踪
        </button>
        <button class="view-btn" @click="releaseTracking" title="自由视角">
          自由
        </button>
        <button class="view-btn" @click="releaseRoute" title="清空">
          清空
        </button>
      </div>
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
      <DialogContainer
      :visible="showAddRouteModalFlag"
      title="添加新航线"
      @close="closeAddRouteModal"
    >
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
                <input 
                  v-model="newRouteForm.startTime" 
                  type="datetime-local" 
                  :min="todayMin" 
                  :max="todayMax"
                  required 
                />
              </div>
              
              <div class="form-group half-width">
                <label>终止时间:</label>
                <input 
                  v-model="newRouteForm.endTime" 
                  type="datetime-local" 
                  :min="newRouteForm.startTime || todayMin" 
                  :max="todayMax"
                  required 
                />
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
import { ref, computed, onMounted,watch } from "vue";
import * as Cesium from 'cesium';
import RouterRisk from "@/components/business/RouterRisk/index.vue";
import { useCesium } from "@/hooks/useCesium";
import eventManager from "@/cesium/core/eventManager";
import DialogContainer from "@/components/common/DialogContainer.vue";
import { useRouteStore } from "@/store/modules/routeStore"; // 引入store
import routeManager from "@/cesium/entities/routes"; // 导入航线管理器
import {useWindStore} from '@/store/modules/wind'
const routeStore = useRouteStore();

// 状态管理
const routes = ref([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const searchKeyword = ref("");
const showAnalysisModal = ref(false);
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

// 生成模拟航线列表数据
const generateRoutes = () => {
  const routeCount = 5 + Math.floor(Math.random() * 6);
  const result = [];

  for (let i = 0; i < routeCount; i++) {
    const segments = 3 + Math.floor(Math.random() * 8); // 3-10段（便于可视化）
    const length = 10 + Math.random() * 40; // 10-50km

    const segmentData = generateRouteData(segments, length);
    const risks = segmentData.map((s) => s.risk);
    const averageRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const highestRisk = Math.max(...risks);
    const highestRiskSegment = risks.indexOf(highestRisk) + 1;

    // 生成贴合截图的航线名称
    const locationPairs = [
      "万达天健湖站-柳树塘公交站",
      "血液中心站-华安脑科医院站",
      "合肥三院-滨湖站",
      "合肥妇保东区站-南院站",
      "基地X-作业区1",
      "机场A-作业区2",
      "作业区3-机场B",
    ];
    const randomName =
      locationPairs[Math.floor(Math.random() * locationPairs.length)];

    // 从完整名称中解析出起点和终点名称
    const [startName, endName] = randomName.split("-");

    // 在初始生成时就创建waypoints数组，避免后续点击时转换
    const waypoints = [];
    const dangers = []; // 存储每个航段的危险等级

    if (segmentData.length > 0) {
      // 添加第一个航段的起点
      waypoints.push({
        longitude: segmentData[0].startCoordinates[0],
        latitude: segmentData[0].startCoordinates[1],
      });

      // 添加所有航段的终点，并设置对应的危险等级
      segmentData.forEach((segment, index) => {
        waypoints.push({
          longitude: segment.endCoordinates[0],
          latitude: segment.endCoordinates[1],
        });
        // 根据风险值设置危险等级（0-10范围），与地图组件的颜色映射保持一致
        dangers.push(Math.round(segment.risk * 10));
      });
    }

    // 为历史航线添加默认的时间信息
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0); // 默认开始时间：今天10:00
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0); // 默认结束时间：今天10:30
    
    result.push({
      id: `route-${i + 1}`,
      name: randomName,
      startName,
      endName,
      length,
      segments,
      averageRisk,
      highestRisk,
      highestRiskSegment,
      segmentData,
      waypoints,
      dangers, // 存储航段危险等级，用于地图上的颜色显示
      height:300,
      startTime: startTime,
      endTime: endTime
    });
  }
  return result;
};

// 生成单个航线的详细数据（优化航段距离计算）
const generateRouteData = (segments, totalLength) => {
  const segmentData = [];
  let accumulatedDistance = 0;

  // 获取风场数据，确保航线穿过风场区
  const windStore = useWindStore();
  const windData = windStore.windData;
  
  // 默认风场边界（从mock数据中提取的实际边界）
  let windBounds = {
    west: 120.30,
    south: 36.05,
    east: 120.45,
    north: 36.20
  };
  
  // 如果有风场数据，使用实际的风场边界
  if (windData && windData.layers && windData.layers.length > 0) {
    windBounds = windData.layers[0].windData.bounds;
  }
  
  // 在风场边界内生成起点坐标
  const startLon = windBounds.west + Math.random() * (windBounds.east - windBounds.west);
  const startLat = windBounds.south + Math.random() * (windBounds.north - windBounds.south);
  
  // 生成终点坐标，在风场边界内，距离起点有一定距离
  const distanceFactor = 0.3; // 控制终点与起点的距离，0.3表示30%的风场宽度
  const maxDistanceLon = (windBounds.east - windBounds.west) * distanceFactor;
  const maxDistanceLat = (windBounds.north - windBounds.south) * distanceFactor;
  
  let endLon = startLon + (Math.random() * maxDistanceLon * 2 - maxDistanceLon);
  let endLat = startLat + (Math.random() * maxDistanceLat * 2 - maxDistanceLat);
  
  // 确保终点也在风场范围内
  endLon = Math.max(windBounds.west, Math.min(windBounds.east, endLon));
  endLat = Math.max(windBounds.south, Math.min(windBounds.north, endLat));

  for (let i = 0; i < segments; i++) {
    // 随机生成单个航段长度（总和=总长度）
    const segmentLength = 
      i === segments - 1 
        ? totalLength - accumulatedDistance 
        : (totalLength - accumulatedDistance) * (0.1 + Math.random() * 0.2);

    accumulatedDistance += segmentLength;
    const baseRisk = 0.2 + Math.sin(i * 0.6) * 0.3 + Math.random() * 0.4;
    const risk = Math.min(1, Math.max(0, baseRisk));

    // 计算当前段的起始和结束坐标
    const progress = i / segments;
    const nextProgress = (i + 1) / segments;

    // 基础直线坐标
    const startSegmentLon = startLon + (endLon - startLon) * progress;
    const startSegmentLat = startLat + (endLat - startLat) * progress;
    const endSegmentLon = startLon + (endLon - startLon) * nextProgress;
    const endSegmentLat = startLat + (endLat - startLat) * nextProgress;

    // 增加随机偏移，使航线更加曲折
    // 生成多个控制点，增加路径的曲折度
    const offsetScale = 0.04; // 增加偏移范围，使航线更曲折
    
    // 生成两个控制点，增加路径的曲折度
    const t1 = 1/3;
    const t2 = 2/3;
    
    // 第一个控制点
    const mid1Lon = startSegmentLon + (endSegmentLon - startSegmentLon) * t1;
    const mid1Lat = startSegmentLat + (endSegmentLat - startSegmentLat) * t1;
    const offset1Lon = (Math.random() - 0.5) * offsetScale;
    const offset1Lat = (Math.random() - 0.5) * offsetScale;
    
    // 第二个控制点
    const mid2Lon = startSegmentLon + (endSegmentLon - startSegmentLon) * t2;
    const mid2Lat = startSegmentLat + (endSegmentLat - startSegmentLat) * t2;
    const offset2Lon = (Math.random() - 0.5) * offsetScale;
    const offset2Lat = (Math.random() - 0.5) * offsetScale;

    // 使用三次贝塞尔曲线生成更曲折的路径
    const pathCoordinates = generateCubicBezierPath(
      [startSegmentLon, startSegmentLat],
      [mid1Lon + offset1Lon, mid1Lat + offset1Lat],
      [mid2Lon + offset2Lon, mid2Lat + offset2Lat],
      [endSegmentLon, endSegmentLat],
      15 // 每个航段15个点，使路径更平滑
    );

    segmentData.push({
      segment: i + 1,
      distance: accumulatedDistance,
      segmentLength, // 单个航段长度（用于可视化）
      risk,
      windSpeed: +(3 + Math.random() * 12).toFixed(1),
      windDir: Math.floor(Math.random() * 360),
      windShear: risk * 10,
      turbulence: +(risk * 8 + Math.random() * 2).toFixed(1),
      rainfall: +(risk * 4 + Math.random() * 1).toFixed(1),
      startCoordinates: [startSegmentLon, startSegmentLat],
      endCoordinates: [endSegmentLon, endSegmentLat],
      pathCoordinates: pathCoordinates, // 存储完整的航段路径坐标
    });
  }
  return segmentData;
};

// 使用二次贝塞尔曲线生成平滑路径
const generateBezierPath = (start, control, end, numPoints) => {
  const path = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = 
      (1 - t) * (1 - t) * start[0] + 
      2 * (1 - t) * t * control[0] + 
      t * t * end[0];
    const y = 
      (1 - t) * (1 - t) * start[1] + 
      2 * (1 - t) * t * control[1] + 
      t * t * end[1];
    path.push([x, y]);
  }
  return path;
};

// 使用三次贝塞尔曲线生成更曲折的路径
const generateCubicBezierPath = (start, control1, control2, end, numPoints) => {
  const path = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    
    // 三次贝塞尔曲线公式
    const x = Math.pow(1 - t, 3) * start[0] + 
              3 * Math.pow(1 - t, 2) * t * control1[0] + 
              3 * (1 - t) * Math.pow(t, 2) * control2[0] + 
              Math.pow(t, 3) * end[0];
    
    const y = Math.pow(1 - t, 3) * start[1] + 
              3 * Math.pow(1 - t, 2) * t * control1[1] + 
              3 * (1 - t) * Math.pow(t, 2) * control2[1] + 
              Math.pow(t, 3) * end[1];
    
    path.push([x, y]);
  }
  return path;
};

// 计算航段可视化宽度（占总长度的百分比）
const getSegmentWidth = (segment, route) => {
  return (segment.segmentLength / route.length) * 95; // 95%避免溢出，留5%间距
};

// 加载航线数据
const loadRoutes = async () => {
  isLoading.value = true;
  try {
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
  } catch (error) {
    console.error("加载航线数据失败:", error);
    // 降级使用模拟数据
    routes.value = generateRoutes();
  } finally {
    isLoading.value = false;
  }
};

// 刷新航线数据
const refreshRoutes = async () => {
  isRefreshing.value = true;
  try {
    const { getRoutes } = await import('@/api');
    const routeData = await getRoutes();
    if (routeData && routeData.routes) {
      routes.value = routeData.routes.map(route => ({
        ...route,
        startTime: route.startTime ? new Date(route.startTime) : new Date(),
        endTime: route.endTime ? new Date(route.endTime) : new Date()
      }));
    }
  } catch (error) {
    console.error("刷新航线数据失败:", error);
  } finally {
    isRefreshing.value = false;
  }
};

// 查询当前航线（底部面板）
const queryCurrentRoute = (route) => {
  // 确保当前航线已选择
  if (route.id !== routeStore.renderedRouteId) {
    onRouteClick(route);
  }

  // 设置航线数据用于分析
  currentRouteData.value = route.segmentData;
};

// 关闭查询面板
const closeQueryPanel = () => {
  currentRouteData.value = [];
};

// 打开航线分析弹窗（保留但不再使用）
const openAnalysis = (route) => {
  // 这个方法现在不再使用，改为底部面板显示
};

// 关闭弹窗（保留但不再使用）
const closeModal = () => {
  // 这个方法现在不再使用
};

// 清空历史分析记录
const clearHistory = () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    routes.value = [];
  }
};

// 导出分析报告
const exportAnalysis = () => {
  if (!currentRoute.value) {
    console.warn("没有选中的航线可供导出");
    return;
  }

  alert(`正在导出 ${currentRoute.value.name} 的分析报告...`);
};
/**
 * todo :
 */
// 航段tooltip位置设置
const setTooltipPos = (idx, routeId) => {
  // 使用 nextTick 确保 DOM 更新后再获取位置
  setTimeout(() => {
    const element = document.querySelector(
      `[data-route-id="${routeId}"] .segment-bar:nth-child(${idx + 1})`
    );
    if (element) {
      const rect = element.getBoundingClientRect();
      tooltipLeft.value = rect.left + window.scrollX + 10;
      tooltipTop.value = rect.bottom + window.scrollY + 10;
    }
  }, 0);
};

// 风险辅助函数（复用原有）
const getRiskColor = (value) => {
  if (value < 0.3) return "#10b981"; // 低风险-绿
  if (value < 0.7) return "#f59e0b"; // 中风险-黄
  return "#ef4444"; // 高风险-红
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
  try {
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
  } catch (error) {
    console.error("获取航路详情失败:", error);
    // 降级使用列表数据
    routeStore.setCurrentRoute(route);
  }

  // 2. 可选：滚动/高亮当前航线
  document.querySelector(`[data-route-id="${route.id}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

const viewTopDown = () => {
  routeManager.viewTopDown();
};

const viewSide = () => {
  routeManager.viewSide();
};

const viewCurrentAircraft = () => {
  if (routeStore.currentRoute && routeStore.currentRoute.id) {
    routeManager.viewAircraft(routeStore.currentRoute.id);
  }
};

const releaseTracking = () => {
  routeManager.releaseTracking();
};
const releaseRoute = () => {
  currentRoute.value = null;
  routeStore.clearCurrentRoute();

  routeManager.clearAllRoutes();
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
  console.log('guanbi ');
  
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

// 添加新航线
const addNewRoute = () => {
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

  // 构造航线数据，使用总飞行高度
  const flightHeight = newRouteForm.value.flightHeight;
  const waypoints = [
    {
      name: newRouteForm.value.startName,
      longitude: newRouteForm.value.startLon,
      latitude: newRouteForm.value.startLat,
      height: flightHeight, // 使用总飞行高度
    },
    ...newRouteForm.value.waypoints.map((wp) => ({
      name: wp.name || "途经点",
      longitude: wp.lon,
      latitude: wp.lat,
      height: flightHeight, // 使用总飞行高度
    })),
    {
      name: newRouteForm.value.endName,
      longitude: newRouteForm.value.endLon,
      latitude: newRouteForm.value.endLat,
      height: flightHeight, // 使用总飞行高度
    },
  ];

  // 计算航线段数
  const segments = waypoints.length - 1;

  // 生成模拟航线数据
  const totalLength = calculateTotalDistance(waypoints);
  const segmentData = generateRouteDataForCustomRoute(waypoints, totalLength);

  const risks = segmentData.map((s) => s.risk);
  const averageRisk = risks.reduce((sum, r) => sum + r, 0) / risks.length;
  const highestRisk = Math.max(...risks);
  const highestRiskSegment = risks.indexOf(highestRisk) + 1;

  // 创建新航线对象
  const newRoute = {
    id: `route-${Date.now()}`,
    name: `${newRouteForm.value.startName}-${newRouteForm.value.endName}`,
    startName: newRouteForm.value.startName,
    endName: newRouteForm.value.endName,
    length: totalLength,
    segments: segments,
    averageRisk: averageRisk,
    highestRisk: highestRisk,
    highestRiskSegment: highestRiskSegment,
    segmentData: segmentData,
    waypoints: waypoints.map((wp) => ({
      longitude: wp.longitude,
      latitude: wp.latitude,
    })),
    dangers: risks.map((risk) => Math.round(risk * 10)),
    aircraftModel: newRouteForm.value.aircraftModel,
    startTime: startTime, // 添加起始时间（Date对象）
    endTime: endTime,     // 添加终止时间（Date对象）
  };

  // 添加到航线列表开头
  routes.value.unshift(newRoute);

  // 设置当前航线，触发地图更新
  routeStore.setCurrentRoute(newRoute);

  // 关闭模态框并重置表单
  closeAddRouteModal();

  alert("航线添加成功！");
};

// 计算总距离
const calculateTotalDistance = (waypoints) => {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(
      waypoints[i].longitude,
      waypoints[i].latitude,
      waypoints[i + 1].longitude,
      waypoints[i + 1].latitude
    );
  }
  return total;
};

// 计算两点间距离（简化版）
const calculateDistance = (lon1, lat1, lon2, lat2) => {
  // 使用简单的欧几里得距离估算（实际应用中应使用更精确的方法）
  const dx = (lon2 - lon1) * 111.32; // 经度差转换为公里
  const dy = (lat2 - lat1) * 110.57; // 纬度差转换为公里
  return Math.sqrt(dx * dx + dy * dy);
};

// 为自定义航线生成数据
const generateRouteDataForCustomRoute = (waypoints, totalLength) => {
  const segmentData = [];
  let accumulatedDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = [waypoints[i].longitude, waypoints[i].latitude];
    const end = [waypoints[i + 1].longitude, waypoints[i + 1].latitude];

    // 计算当前段长度
    const segmentLength = calculateDistance(start[0], start[1], end[0], end[1]);
    accumulatedDistance += segmentLength;

    // 生成随机风险值
    const baseRisk = 0.2 + Math.random() * 0.6;
    const risk = Math.min(1, Math.max(0, baseRisk));

    // 生成该航段的路径点
    const pathCoordinates = generateBezierPath(
      start,
      [
        (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 0.02,
        (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 0.02,
      ],
      end,
      10
    );

    segmentData.push({
      segment: i + 1,
      distance: accumulatedDistance,
      segmentLength: segmentLength,
      risk: risk,
      windSpeed: +(3 + Math.random() * 12).toFixed(1),
      windDir: Math.floor(Math.random() * 360),
      windShear: risk * 10,
      turbulence: +(risk * 8 + Math.random() * 2).toFixed(1),
      rainfall: +(risk * 4 + Math.random() * 1).toFixed(1),
      startCoordinates: start,
      endCoordinates: end,
      pathCoordinates: pathCoordinates,
    });
  }

  return segmentData;
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