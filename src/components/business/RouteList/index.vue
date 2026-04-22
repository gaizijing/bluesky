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
          <span class="start-point">{{ currentRouteInfo.startName }}</span>
          <span class="path-arrow">→</span>
          <template v-if="currentRouteInfo.waypoints.length > 2">
            <span v-for="(waypoint, index) in currentRouteInfo.waypoints.slice(1, -1)" :key="index"
              class="waypoint">
              {{ waypoint.name || `途经点${index + 1}` }}

            </span>
            <span class="path-arrow">→</span>
          </template>
          <span class="end-point">{{ currentRouteInfo.endName }}</span>
        </div>
        <div class="route-details">
          <span class="detail-item">总长: {{ currentRouteInfo.lengthText }}</span>
          <span class="detail-item">航段数: {{ currentRouteInfo.segmentsText }}</span>
          <span class="detail-item">飞行器: {{ currentRouteInfo.aircraftModel }}</span>

          <span class="detail-item">平均风险:
            <span class="risk-badge" :class="getRiskClass(currentRouteInfo.averageRisk)">
              {{ getRiskText(currentRouteInfo.averageRisk) }}
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
  </div>

  <Teleport to="body">
    <transition name="risk-panel-fade" @after-enter="handleFloatingPanelAfterEnter">
      <div
        v-if="routeStore.currentRoute && panelVisible"
        ref="floatingPanelRef"
        class="route-risk-floating-panel"
        :class="{ minimized: panelMinimized, dragging: panelDragging }"
        :style="{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px` }"
        @transitionend="handleFloatingPanelTransitionEnd"
      >
        <div class="floating-panel-header">
          <div class="panel-drag-handle" @pointerdown="startPanelDrag">
            <span class="panel-grip" aria-hidden="true">⋮⋮</span>
            <div class="panel-title-group">
              <p class="panel-eyebrow">风险分析窗口</p>
              <h3 class="panel-title">{{ currentRouteInfo.startName }} → {{ currentRouteInfo.endName }}</h3>
            </div>
          </div>

          <div class="panel-actions">
            <button type="button" class="panel-action-btn" @click="togglePanelMinimized">
              {{ panelMinimized ? "展开" : "收起" }}
            </button>
            <button type="button" class="panel-action-btn danger" @click="hideRiskPanel">
              关闭
            </button>
          </div>
        </div>

        <transition name="risk-panel-body" @after-enter="handlePanelBodyAfterEnter">
          <div v-show="!panelMinimized" class="floating-panel-body">
            <RouterRisk
            v-if="panelContentMounted"
            ref="routerRiskRef"
            :current-route="routeStore.currentRoute"
            :route-data="currentRouteData"
            :panel-visible="panelVisible && !panelMinimized && panelExpandedReady"
            @highlightSegment="handleSegmentHighlight"
            @alternativeRouteSelected="handleAlternativeRouteSelected"
          />
        </div>
        </transition>
      </div>
    </transition>

    <transition name="risk-panel-fade">
      <button
        v-if="routeStore.currentRoute && !panelVisible"
        type="button"
        class="risk-panel-launcher"
        @click="openRiskPanel()"
      >
        打开风险分析
      </button>
    </transition>
  </Teleport>

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
        <el-select v-model="newRouteForm.aircraftModel" placeholder="请选择飞行器型号" required style="width: 100%">
          <el-option value="">请选择飞行器型号</el-option>
          <el-option v-for="aircraft in aircraftModels" :key="aircraft" :label="aircraft" :value="aircraft">
            {{ aircraft }}
          </el-option>
        </el-select>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import * as Cesium from 'cesium';
import { ElMessage } from "element-plus";
import RouterRisk from "@/components/business/RouterRisk/index.vue";
import eventManager from "@/cesium/core/eventManager";
import DialogContainer from "@/components/common/DialogContainer.vue";
import { useRouteStore } from "@/store/modules/routeStore"; // 引入store
import { useHeatmapStore } from "@/store/modules/heatmap"; // 引入热力图store
import routeManager from "@/cesium/entities/routes"; // 导入航线管理器
const routeStore = useRouteStore();
const heatmapStore = useHeatmapStore();

// 状态管理
const routes = ref([]);
const isLoading = ref(true);
const searchKeyword = ref("");
const currentRoute = ref(null);
const currentRouteData = ref([]);
const floatingPanelRef = ref(null);
const routerRiskRef = ref(null);
// 历史记录展开状态管理
const expandedRouteIds = ref(new Set());
// 航段tooltip状态
const showSegmentTooltip = ref(false);
const currentSegment = ref(null);
const tooltipLeft = ref(0);
const tooltipTop = ref(0);
const HIGHLIGHT_SEGMENT_ENTITY_ID = "route-risk-highlight-segment";

const panelVisible = ref(true);
const panelMinimized = ref(true);
const panelDragging = ref(false);
const panelPosition = ref({ x: 24, y: 96 });
const panelDragOffset = ref({ x: 0, y: 0 });
const panelHasManualPosition = ref(false);
const panelContentMounted = ref(false);
const panelExpandedReady = ref(false);
let panelSyncTimeoutId = 0;
let panelExpandFrameId = 0;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 620;
const PANEL_MINIMIZED_HEIGHT = 72;
const PANEL_MARGIN = 20;

const toFiniteNumber = (value, fallback = NaN) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeRiskScore = (value) => {
  const number = toFiniteNumber(value, 0);

  if (number > 1) {
    return Math.max(0, Math.min(1, number / 100));
  }

  return Math.max(0, Math.min(1, number));
};

const normalizeCoordinatePair = (point) => {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const longitude = toFiniteNumber(point[0], NaN);
  const latitude = toFiniteNumber(point[1], NaN);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
};

const normalizeCoordinatePath = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points.map((point) => normalizeCoordinatePair(point)).filter(Boolean);
};

const buildWaypointFromAny = (point, fallbackName = "") => {
  if (!point) {
    return null;
  }

  const longitude = toFiniteNumber(
    point.longitude,
    NaN
  );
  const latitude = toFiniteNumber(
    point.latitude,
    NaN
  );

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    name: point.name || fallbackName || "",
    longitude,
    latitude,
    height: toFiniteNumber(
      point.height ?? point.altitude,
      300
    )
  };
};

const normalizeSegmentData = (segmentsSource) => {
  if (!Array.isArray(segmentsSource) || segmentsSource.length === 0) {
    return [];
  }

  let accumulatedDistance = 0;

  return segmentsSource.map((segment, index) => {
    const startCoordinates = normalizeCoordinatePair(segment?.startCoordinates);
    const endCoordinates = normalizeCoordinatePair(segment?.endCoordinates);
    const normalizedPath = normalizeCoordinatePath(segment?.pathCoordinates);
    const pathCoordinates =
      normalizedPath.length > 1 ? normalizedPath : [startCoordinates, endCoordinates].filter(Boolean);

    const segmentLength = toFiniteNumber(segment?.segmentLength, 0);
    let distance = toFiniteNumber(segment?.distance, NaN);

    if (!Number.isFinite(distance)) {
      distance = accumulatedDistance + segmentLength;
    }

    accumulatedDistance = distance;

    return {
      ...segment,
      segment: toFiniteNumber(segment?.segment, index + 1),
      distance,
      segmentLength,
      risk: normalizeRiskScore(segment?.risk),
      windSpeed: toFiniteNumber(segment?.windSpeed, NaN),
      windDir: toFiniteNumber(segment?.windDir, NaN),
      windShear: toFiniteNumber(segment?.windShear, NaN),
      turbulence: toFiniteNumber(segment?.turbulence, NaN),
      rainfall: toFiniteNumber(segment?.rainfall, NaN),
      startCoordinates,
      endCoordinates,
      pathCoordinates,
      coordinates: pathCoordinates
    };
  });
};

const normalizeWaypoints = (routeLike, segmentData = []) => {
  const height = toFiniteNumber(routeLike?.flightHeight, 300);
  const waypointSources = Array.isArray(routeLike?.waypoints)
    ? routeLike.waypoints
    : [];
  const normalizedWaypoints = waypointSources
    .map((point, index) =>
      buildWaypointFromAny(point, index === 0 ? routeLike?.startName : "")
    )
    .filter(Boolean)
    .map((point) => ({ ...point, height: toFiniteNumber(point.height, height) }));

  if (normalizedWaypoints.length >= 2) {
    return normalizedWaypoints;
  }

  if (segmentData.length > 0) {
    const converted = routeStore.convertSegmentsToWaypoints(segmentData);
    if (Array.isArray(converted) && converted.length >= 2) {
      return converted.map((point, index) => ({
        name:
          point.name ||
          (index === 0
            ? routeLike?.startName || "起点"
            : index === converted.length - 1
              ? routeLike?.endName || "终点"
              : `途经点${index}`),
        longitude: toFiniteNumber(point.longitude, NaN),
        latitude: toFiniteNumber(point.latitude, NaN),
        height: toFiniteNumber(point.height, height)
      }));
    }
  }

  return [];
};

const normalizeRouteForActivation = (routeLike, detailLike = null) => {
  const mergedRoute = {
    ...(routeLike || {}),
    ...(detailLike || {})
  };
  const segmentData = normalizeSegmentData(mergedRoute.segmentData);
  const waypoints = normalizeWaypoints(mergedRoute, segmentData);
  const length =
    toFiniteNumber(mergedRoute.length, NaN) ||
    (segmentData.length > 0
      ? segmentData[segmentData.length - 1]?.distance
      : NaN);
  const segments = toFiniteNumber(mergedRoute.segments, segmentData.length);

  return {
    ...mergedRoute,
    id: mergedRoute.id || routeLike?.id || detailLike?.id || "",
    name:
      mergedRoute.name ||
      `${mergedRoute.startName || "起点"}-${mergedRoute.endName || "终点"}`,
    startName: mergedRoute.startName || waypoints[0]?.name || "起点",
    endName:
      mergedRoute.endName || waypoints[waypoints.length - 1]?.name || "终点",
    averageRisk: normalizeRiskScore(mergedRoute.averageRisk),
    aircraftModel: mergedRoute.aircraftModel || "--",
    flightHeight: toFiniteNumber(mergedRoute.flightHeight, 300),
    length: Number.isFinite(length) ? length : 0,
    segments,
    waypoints,
    segmentData,
    startTime: mergedRoute.startTime
      ? new Date(mergedRoute.startTime)
      : mergedRoute.startTime,
    endTime: mergedRoute.endTime ? new Date(mergedRoute.endTime) : mergedRoute.endTime
  };
};

const getPanelBounds = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const panelWidth = Math.min(PANEL_WIDTH, Math.max(360, width - PANEL_MARGIN * 2));
  const panelHeight = panelMinimized.value
    ? PANEL_MINIMIZED_HEIGHT
    : Math.min(PANEL_HEIGHT, Math.max(240, height - PANEL_MARGIN * 2));

  return {
    minX: PANEL_MARGIN,
    maxX: Math.max(PANEL_MARGIN, width - panelWidth - PANEL_MARGIN),
    minY: PANEL_MARGIN,
    maxY: Math.max(PANEL_MARGIN, height - panelHeight - PANEL_MARGIN)
  };
};

const clampPanelPosition = (position) => {
  const bounds = getPanelBounds();

  return {
    x: Math.min(Math.max(position.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(position.y, bounds.minY), bounds.maxY)
  };
};

const resetPanelPosition = () => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = Math.min(PANEL_WIDTH, Math.max(360, viewportWidth - PANEL_MARGIN * 2));
  const topOffset = Math.max(PANEL_MARGIN, Math.round(viewportHeight * 0.12));

  panelPosition.value = clampPanelPosition({
    x: Math.round((viewportWidth - panelWidth) / 2),
    y: topOffset
  });
};

const clearPanelSyncTimers = () => {
  if (panelExpandFrameId) {
    cancelAnimationFrame(panelExpandFrameId);
    panelExpandFrameId = 0;
  }

  if (panelSyncTimeoutId) {
    clearTimeout(panelSyncTimeoutId);
    panelSyncTimeoutId = 0;
  }
};

const schedulePanelChartSync = ({ recreate = false, settle = true } = {}) => {
  clearPanelSyncTimers();

  const runSync = () => {
    routerRiskRef.value?.syncLayout?.({
      recreate,
      render: true,
      settle
    });
  };

  nextTick(() => {
    panelExpandFrameId = requestAnimationFrame(() => {
      panelExpandFrameId = 0;
      runSync();
    });
  });
};

const markPanelExpandedReady = () => {
  if (!panelVisible.value || panelMinimized.value) {
    panelExpandedReady.value = false;
    return;
  }

  panelExpandedReady.value = true;
};

const handleFloatingPanelAfterEnter = () => {
  markPanelExpandedReady();
};

const handlePanelBodyAfterEnter = () => {
  markPanelExpandedReady();
  schedulePanelChartSync({
    recreate: true,
    settle: true
  });
};

const handleFloatingPanelTransitionEnd = (event) => {
  if (!event || event.target !== floatingPanelRef.value || panelMinimized.value || !panelVisible.value) {
    return;
  }

  if (event.propertyName === "width" || event.propertyName === "max-height" || event.propertyName === "transform") {
    markPanelExpandedReady();
    schedulePanelChartSync({
      recreate: true,
      settle: true
    });
  }
};

const openRiskPanel = ({ resetPosition = false, minimized = false } = {}) => {
  panelVisible.value = true;
  panelMinimized.value = minimized;
  panelExpandedReady.value = !minimized;

  if (!minimized) {
    panelContentMounted.value = true;
  }

  if (resetPosition || !panelHasManualPosition.value) {
    nextTick(() => {
      resetPanelPosition();
    });
  }

  if (!minimized) {
    schedulePanelChartSync({
      recreate: true,
      settle: true
    });
  }
};

const hideRiskPanel = () => {
  panelVisible.value = false;
  panelDragging.value = false;
  panelExpandedReady.value = false;
  clearPanelSyncTimers();
};

const togglePanelMinimized = () => {
  const nextMinimized = !panelMinimized.value;
  panelMinimized.value = nextMinimized;
  panelExpandedReady.value = false;

  if (!nextMinimized) {
    panelContentMounted.value = true;
  }

  nextTick(() => {
    panelPosition.value = clampPanelPosition(panelPosition.value);

    if (!nextMinimized) {
      schedulePanelChartSync({
        recreate: true,
        settle: true
      });
      return;
    }

    clearPanelSyncTimers();
  });
};

const startPanelDrag = (event) => {
  if (!event.isPrimary) {
    return;
  }

  panelDragging.value = true;
  panelHasManualPosition.value = true;
  panelDragOffset.value = {
    x: event.clientX - panelPosition.value.x,
    y: event.clientY - panelPosition.value.y
  };

  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  } catch (error) {
    console.debug("setPointerCapture skipped:", error);
  }

  event.preventDefault();
};

const handlePanelDrag = (event) => {
  if (!panelDragging.value) {
    return;
  }

  panelPosition.value = clampPanelPosition({
    x: event.clientX - panelDragOffset.value.x,
    y: event.clientY - panelDragOffset.value.y
  });
};

const stopPanelDrag = () => {
  if (!panelDragging.value) {
    return;
  }

  panelDragging.value = false;
  panelPosition.value = clampPanelPosition(panelPosition.value);
};

const handlePanelViewportResize = () => {
  if (panelHasManualPosition.value) {
    panelPosition.value = clampPanelPosition(panelPosition.value);
    return;
  }

  resetPanelPosition();
};

const currentRouteInfo = computed(() => {
  const route = routeStore.currentRoute;

  if (!route) {
    return {
      startName: "起点",
      endName: "终点",
      waypoints: [],
      lengthText: "--",
      segmentsText: "--",
      aircraftModel: "--",
      averageRisk: 0
    };
  }

  const segmentCount = toFiniteNumber(route.segments, route.segmentData?.length || 0);
  const routeLength = toFiniteNumber(route.length, NaN);

  return {
    startName: route.startName || "起点",
    endName: route.endName || "终点",
    waypoints: Array.isArray(route.waypoints) ? route.waypoints : [],
    lengthText: Number.isFinite(routeLength) ? `${routeLength.toFixed(1)} km` : "--",
    segmentsText: segmentCount > 0 ? `${segmentCount} 段` : "--",
    aircraftModel: route.aircraftModel || "--",
    averageRisk: normalizeRiskScore(route.averageRisk)
  };
});

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
    String(route.name || `${route.startName || ""}${route.endName || ""}`)
      .toLowerCase()
      .includes(keyword)
  );
});



// 加载航线数据
const loadRoutes = async () => {
  isLoading.value = true;

  try {
    const { getRoutes } = await import("@/api");
    const routeResult = await getRoutes();
    const routeList = Array.isArray(routeResult?.routes) ? routeResult.routes : [];

    routes.value = routeList
      .map((route) => normalizeRouteForActivation(route))
      .filter((route) => route.id);

    routeStore.setRouteList(routes.value);
  } catch (error) {
    console.error("加载航线列表失败:", error);
    routes.value = [];
    routeStore.clearRouteList();
    ElMessage.error(error?.message || "加载航线列表失败，请稍后重试");
  } finally {
    isLoading.value = false;
  }
};



// 清空历史分析记录
const clearHistory = async () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    try {
      const { clearRoutes } = await import('@/api');
      await clearRoutes();
      routes.value = [];
      routeStore.clearRouteList();
      releaseRoute();
      ElMessage.success('历史记录已清空');
    } catch (error) {
      console.error('清空历史记录失败:', error);
      ElMessage.error(error?.message || '清空历史记录失败，请稍后重试');
    }
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
const clearHighlightedSegment = () => {
  const viewer = window.viewer;
  if (viewer?.entities) {
    const entity = viewer.entities.getById(HIGHLIGHT_SEGMENT_ENTITY_ID);
    if (entity) {
      viewer.entities.remove(entity);
    }
  }
  showSegmentTooltip.value = false;
  currentSegment.value = null;
};

const handleSegmentHighlight = (payload) => {
  if (!payload) return;

  const segmentNo = Number(payload.segment);
  const matchedSegment = currentRouteData.value.find(
    (item) => Number(item.segment) === segmentNo
  );
  currentSegment.value = matchedSegment || null;
  showSegmentTooltip.value = Boolean(matchedSegment);
  tooltipLeft.value = 24;
  tooltipTop.value = 140;

  const viewer = window.viewer;
  if (!viewer?.entities) return;

  const rawCoords = Array.isArray(payload.coordinates) ? payload.coordinates : [];
  const positions = rawCoords
    .filter((coord) => Array.isArray(coord) && coord.length >= 2)
    .map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), 320))
    .filter(Boolean);

  if (positions.length < 2) return;

  const oldEntity = viewer.entities.getById(HIGHLIGHT_SEGMENT_ENTITY_ID);
  if (oldEntity) {
    viewer.entities.remove(oldEntity);
  }

  const highlightEntity = viewer.entities.add({
    id: HIGHLIGHT_SEGMENT_ENTITY_ID,
    polyline: {
      positions,
      width: 10,
      material: Cesium.Color.YELLOW.withAlpha(0.9),
      depthFailMaterial: Cesium.Color.YELLOW.withAlpha(0.9),
      clampToGround: false
    }
  });

  viewer.flyTo(highlightEntity, { duration: 0.8 });
};

const activateRoute = async (routeLike, { scrollIntoView = false } = {}) => {
  if (!routeLike) {
    return null;
  }

  const routeId = routeLike.id;
  let detailPayload = null;

  if (routeId && (!Array.isArray(routeLike.segmentData) || routeLike.segmentData.length === 0)) {
    const { getRouteDetail } = await import("@/api");
    detailPayload = await getRouteDetail(routeId);
  }

  const normalizedRoute = normalizeRouteForActivation(routeLike, detailPayload);

  if (!normalizedRoute.id) {
    console.warn("航线缺少唯一标识，无法激活:", routeLike);
    return null;
  }

  currentRoute.value = normalizedRoute;
  currentRouteData.value = normalizedRoute.segmentData || [];
  routeStore.setCurrentRoute(normalizedRoute);
  heatmapStore.switchToCitywideMode();
  clearHighlightedSegment();
  openRiskPanel({ minimized: true });

  const existingIndex = routes.value.findIndex(
    (item) => item.id === normalizedRoute.id
  );

  if (existingIndex >= 0) {
    routes.value.splice(existingIndex, 1, normalizedRoute);
  } else {
    routes.value = [normalizedRoute, ...routes.value];
  }

  routeStore.setRouteList(routes.value);

  if (scrollIntoView) {
    nextTick(() => {
      document
        .querySelector(`[data-route-id="${normalizedRoute.id}"]`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    });
  }

  return normalizedRoute;
};

const handleAlternativeRouteSelected = async (route) => {
  try {
    await activateRoute(route, { scrollIntoView: true });
  } catch (error) {
    console.error("切换备选航线失败:", error);
    ElMessage.error(error?.message || "切换备选航线失败，请稍后重试");
  }
};

const onRouteClick = async (route) => {
  try {
    await activateRoute(route, { scrollIntoView: true });
  } catch (error) {
    console.error("加载航线详情失败:", error);
    ElMessage.error(error?.message || "加载航线详情失败，请稍后重试");
  }
};

const releaseRoute = () => {
  currentRoute.value = null;
  currentRouteData.value = [];
  clearHighlightedSegment();
  clearPanelSyncTimers();
  panelVisible.value = false;
  panelMinimized.value = true;
  panelDragging.value = false;
  panelExpandedReady.value = false;
  panelContentMounted.value = false;
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
  resetPanelPosition();
  window.addEventListener("pointermove", handlePanelDrag);
  window.addEventListener("pointerup", stopPanelDrag);
  window.addEventListener("resize", handlePanelViewportResize);
});

// 监听当前航线变化，更新图表数据
watch(
  () => routeStore.currentRoute,
  (newRoute) => {
    if (newRoute && newRoute.segmentData) {
      currentRouteData.value = newRoute.segmentData;
      clearHighlightedSegment();
    } else {
      currentRouteData.value = [];
      clearHighlightedSegment();
    }
  },
  { deep: true }
);

watch(
  () => routeStore.currentRoute?.id,
  (routeId) => {
    if (!routeId) {
      panelVisible.value = false;
      panelExpandedReady.value = false;
      panelContentMounted.value = false;
      return;
    }

    panelVisible.value = true;
    panelMinimized.value = true;
    panelExpandedReady.value = false;

    if (!panelHasManualPosition.value) {
      nextTick(() => {
        resetPanelPosition();
      });
    } else {
      nextTick(() => {
        panelPosition.value = clampPanelPosition(panelPosition.value);
      });
    }
  },
  { immediate: true }
);

const showAddRouteModalFlag = ref(false);

// 获取今天的最小和最大时间（用于限制 datetime-local 输入）
const now = new Date();
const todayMin = ref(now.toISOString().slice(0, 16)); // 今天 00:00
const todayMax = ref(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).toISOString().slice(0, 16)); // 今天 23:59

// 飞行器型号列表
const aircraftModels = ref([]);

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

// 加载飞行器型号列表
const loadAircraftModels = async () => {
  try {
    const { getActiveAircraftModels } = await import("@/api");
    const result = await getActiveAircraftModels();
    aircraftModels.value =result.map(item => item.modelName) 
  } catch (error) {
    console.error("加载飞行器型号失败:", error);
    aircraftModels.value = [];
  }
};
// 显示添加航线模态框
const showAddRouteModal = async () => {
  await loadAircraftModels();
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
  try {
    const { createRoute } = await import('@/api');
    const createdRoute = await createRoute(routeRequestData);
    const createdRouteId = createdRoute?.id;

    await loadRoutes();

    const matchedRoute = routes.value.find(
      (route) => route.id === createdRouteId
    );

    await activateRoute(matchedRoute || createdRoute, { scrollIntoView: true });
    closeAddRouteModal();
    ElMessage.success("航线添加成功");
  } catch (error) {
    console.error("航线添加失败:", error);
    ElMessage.error(error?.message || "航线添加失败，请稍后重试");
  }
};

onUnmounted(() => {
  stopPanelDrag();
  stopMapSelection();
  clearPanelSyncTimers();
  window.removeEventListener("pointermove", handlePanelDrag);
  window.removeEventListener("pointerup", stopPanelDrag);
  window.removeEventListener("resize", handlePanelViewportResize);
});

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
  .route-risk-floating-panel {
    width: calc(100vw - 24px);
    border-radius: 18px;

    &.minimized {
      width: calc(100vw - 24px);
    }
  }

  .floating-panel-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .panel-drag-handle,
  .panel-actions {
    width: 100%;
  }

  .panel-actions {
    justify-content: flex-end;
  }

  .panel-action-btn {
    flex: 1;
    min-width: 0;
  }

  .floating-panel-body {
    padding: 10px;
  }

  .risk-panel-launcher {
    right: 12px;
    bottom: 12px;
  }

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

.route-risk-floating-panel {
  position: fixed;
  width: min(720px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  z-index: 2200;
  display: flex;
  flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(8, 18, 37, 0.97), rgba(5, 13, 28, 0.95));
  border: 1px solid rgba(96, 165, 250, 0.18);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  transition:
    width 0.28s ease,
    max-height 0.28s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    transform 0.24s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 22px 22px;
    opacity: 0.16;
    pointer-events: none;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 36px 88px rgba(0, 0, 0, 0.5);
    border-color: rgba(125, 211, 252, 0.34);
    transform: scale(1.004);
  }

  &.minimized {
    width: min(520px, calc(100vw - 40px));
    max-height: 72px;
  }
}

.floating-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 72px;
  padding: 14px 16px 14px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: linear-gradient(180deg, rgba(13, 28, 54, 0.92), rgba(9, 21, 43, 0.82));
}

.panel-drag-handle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.panel-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: rgba(191, 219, 254, 0.9);
  font-size: 15px;
  letter-spacing: -1px;
}

.panel-title-group {
  min-width: 0;
}

.panel-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.82);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f8fbff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.panel-action-btn {
  min-width: 68px;
  padding: 8px 14px;
  border: 1px solid rgba(96, 165, 250, 0.24);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(30, 41, 59, 0.92);
    border-color: rgba(125, 211, 252, 0.36);
  }

  &:active {
    transform: translateY(0);
  }

  &.danger {
    border-color: rgba(248, 113, 113, 0.26);
    color: #fecaca;
    background: rgba(69, 10, 10, 0.38);

    &:hover {
      background: rgba(127, 29, 29, 0.5);
      border-color: rgba(252, 165, 165, 0.42);
    }
  }
}

.floating-panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(96, 165, 250, 0.46);
    border-radius: 999px;
  }
}

.risk-panel-body-enter-active,
.risk-panel-body-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s ease,
    max-height 0.28s ease,
    padding-top 0.24s ease,
    padding-bottom 0.24s ease;
}

.risk-panel-body-enter-from,
.risk-panel-body-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.risk-panel-body-enter-to,
.risk-panel-body-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: calc(100vh - 140px);
}

.risk-panel-launcher {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2190;
  padding: 12px 18px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 999px;
  background:
    radial-gradient(circle at top left, rgba(125, 211, 252, 0.26), transparent 40%),
    rgba(8, 18, 37, 0.94);
  color: #eff6ff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(125, 211, 252, 0.42);
    box-shadow: 0 26px 54px rgba(0, 0, 0, 0.38);
  }

  &:active {
    transform: translateY(0);
  }
}

.risk-panel-fade-enter-active,
.risk-panel-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.risk-panel-fade-enter-from,
.risk-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
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
