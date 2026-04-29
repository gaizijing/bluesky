<template>
  <section class="route-risk-card">
    <header class="card-header">
      <div class="header-main">
        <p class="header-eyebrow">航线风险监测</p>
        <div class="title-row">
          <h2 class="card-title">{{ routeTitle }}</h2>
          <span class="status-pill" :class="`status-${overallRiskLevelKey}`">
            {{ overallRiskText }}
          </span>
        </div>
        <p class="route-meta">
          <span>{{ routeOverviewText }}</span>
          <span v-if="routeHeightText">{{ routeHeightText }}</span>
          <span v-if="lastUpdatedText">{{ lastUpdatedText }}</span>
        </p>
      </div>

      <button
        class="refresh-btn"
        type="button"
        :disabled="isAnalyzing || !currentRouteId"
        @click="refreshAnalysis"
      >
        <span v-if="isAnalyzing" class="loading-spinner" aria-hidden="true"></span>
        <span>{{ refreshButtonText }}</span>
      </button>
    </header>

    <div class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="summary-card"
        :class="`tone-${card.tone}`"
      >
        <div class="summary-mark">{{ card.mark }}</div>
        <div class="summary-content">
          <p class="summary-label">{{ card.label }}</p>
          <p class="summary-value">{{ card.value }}</p>
          <p class="summary-desc">{{ card.description }}</p>
        </div>
      </article>
    </div>

    <div v-if="isAnalyzing || analyzeError || analysisStatusText" class="status-banner" :class="statusBannerClass">
      <span class="banner-dot"></span>
      <span>{{ analysisStatusText }}</span>
    </div>

    <div class="global-tabs" role="tablist" aria-label="航线风险面板">
      <button
        v-for="tab in tabs"
        :id="`router-risk-tab-${tab.key}`"
        :key="tab.key"
        class="tab-item"
        :class="{ active: globalActiveTab === tab.key }"
        type="button"
        role="tab"
        :aria-selected="globalActiveTab === tab.key"
        :aria-controls="`router-risk-panel-${tab.key}`"
        @click="globalActiveTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-count">{{ getTabCount(tab.key) }}</span>
      </button>
    </div>

    <div
      id="router-risk-panel-chart"
      v-show="globalActiveTab === 'chart'"
      class="tab-panel"
      role="tabpanel"
      aria-labelledby="router-risk-tab-chart"
    >
      <div ref="chartContainerRef" class="chart-container">
        <div ref="chartRef" class="risk-chart"></div>

        <div
          v-if="showTooltip && tooltipData"
          class="detail-tooltip"
          :style="{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }"
        >
          <div class="tooltip-header">
            <div>
              <p class="tooltip-title">航段 {{ tooltipData.segment }}</p>
              <p class="tooltip-subtitle">距离 {{ formatNumber(tooltipData.distance, 1) }} km</p>
            </div>
            <span class="tooltip-risk" :class="`status-${getRiskLevelKey(tooltipData.risk)}`">
              {{ getRiskText(tooltipData.risk) }}
            </span>
          </div>

          <div class="tooltip-grid">
            <div class="tooltip-item">
              <span>综合风险</span>
              <strong>{{ formatNumber(tooltipData.risk) }}</strong>
            </div>
            <div class="tooltip-item">
              <span>风速 / 风向</span>
              <strong>{{ formatWindText(tooltipData.windSpeed, tooltipData.windDir) }}</strong>
            </div>
            <div class="tooltip-item">
              <span>风切变</span>
              <strong>{{ formatNumber(tooltipData.windShear, 2) }} / {{ getLevelText(tooltipData.windShear) }}</strong>
            </div>
            <div class="tooltip-item">
              <span>湍流</span>
              <strong>{{ formatNumber(tooltipData.turbulence, 2) }} / {{ getLevelText(tooltipData.turbulence) }}</strong>
            </div>
            <div class="tooltip-item">
              <span>降水</span>
              <strong>{{ formatNumber(tooltipData.rainfall, 1) }} mm/h</strong>
            </div>
            <div class="tooltip-item">
              <span>航段长度</span>
              <strong>{{ formatNumber(tooltipData.segmentLength, 1) }} km</strong>
            </div>
          </div>

          <p v-if="tooltipData.reason" class="tooltip-reason">
            {{ tooltipData.reason }}
          </p>
        </div>
      </div>

      <div class="chart-footer">
        <div class="risk-legend">
          <div v-for="risk in riskLevels" :key="risk.value" class="legend-item">
            <span class="legend-color" :style="{ backgroundColor: risk.color }"></span>
            <span class="legend-text">{{ risk.label }} {{ risk.range }}</span>
          </div>
        </div>
        <p class="chart-hint">{{ chartHintText }}</p>
      </div>
    </div>

    <div
      id="router-risk-panel-measures"
      v-show="globalActiveTab === 'measures'"
      class="tab-panel"
      role="tabpanel"
      aria-labelledby="router-risk-tab-measures"
    >
      <div class="panel-head">
        <div>
          <h3 class="panel-title">风险应对措施</h3>
          <p class="panel-subtitle">优先展示高风险航段触发的飞行建议与处置动作。</p>
        </div>
        <span class="panel-count">{{ recommendations.length }} 条</span>
      </div>

      <div v-if="recommendations.length > 0" class="panel-list">
        <article
          v-for="(rec, index) in recommendations"
          :key="rec.id || index"
          class="recommendation-item"
          :class="`risk-level-${rec.level}`"
        >
          <div class="item-top">
            <span class="rec-icon">{{ rec.icon }}</span>
            <div class="item-heading">
              <h4>{{ rec.title }}</h4>
              <span class="level-chip" :class="`chip-${rec.level}`">{{ rec.levelText }}</span>
            </div>
          </div>
          <p>{{ rec.description }}</p>
        </article>
      </div>

      <div v-else class="empty-state">
        <p class="empty-title">暂无风险措施建议</p>
        <p class="empty-desc">{{ measureEmptyText }}</p>
      </div>
    </div>

    <div
      id="router-risk-panel-alternatives"
      v-show="globalActiveTab === 'alternatives'"
      class="tab-panel"
      role="tabpanel"
      aria-labelledby="router-risk-tab-alternatives"
    >
      <div class="panel-head">
        <div>
          <h3 class="panel-title">备选航线建议</h3>
          <p class="panel-subtitle">当主航线风险升高时，可快速切换到更稳妥的备选方案。</p>
        </div>
        <span class="panel-count">{{ alternativeRoutes.length }} 条</span>
      </div>

      <div v-if="alternativeRoutes.length > 0" class="panel-list">
        <button
          v-for="route in alternativeRoutes"
          :key="route.id"
          type="button"
          class="alternative-item"
          :class="{ selected: selectedAlternativeRouteId === route.id }"
          @click="selectAlternativeRoute(route)"
        >
          <div class="route-header">
            <span class="route-name">{{ route.name }}</span>
            <span class="route-risk" :class="`risk-${route.riskLevel}`">{{ route.riskText }}</span>
          </div>
          <div class="route-details">
            <span>距离 {{ route.distanceText }}</span>
            <span>预计 {{ route.estimatedTime }}</span>
            <span v-if="route.heightText">{{ route.heightText }}</span>
          </div>
          <p class="route-description">{{ route.description }}</p>
        </button>
      </div>

      <div v-else class="empty-state">
        <p class="empty-title">暂无备选航线建议</p>
        <p class="empty-desc">{{ alternativeEmptyText }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import * as echarts from "echarts";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useModuleStore } from "@/store/modules/module";
import { fetchRouteRiskAnalysis } from "@/services/routeRiskService";

const moduleStore = useModuleStore();

const emit = defineEmits([ "alternativeRouteSelected"]);

const props = defineProps({
  currentRoute: {
    type: Object,
    default: () => ({})
  },
  routeData: {
    type: Array,
    default: () => []
  },
  panelVisible: {
    type: Boolean,
    default: true
  }
});

const tabs = [
  { key: "chart", label: "风险图表", icon: "◧" },
  { key: "measures", label: "应对措施", icon: "⛨" },
  { key: "alternatives", label: "备选航线", icon: "⇄" }
];

const riskLevels = [
  { value: 0, label: "低风险", color: "#29d391", range: "0.00 - 0.29" },
  { value: 1, label: "中风险", color: "#ffb84d", range: "0.30 - 0.69" },
  { value: 2, label: "高风险", color: "#ff6b6b", range: "0.70 - 1.00" }
];

const TOOLTIP_WIDTH = 280;
const TOOLTIP_BASE_HEIGHT = 212;
const TOOLTIP_REASON_HEIGHT = 56;

const chartRef = ref(null);
const chartContainerRef = ref(null);
const riskChart = ref(null);
const analysisData = ref(null);
const globalActiveTab = ref("chart");
const isAnalyzing = ref(false);
const analyzeError = ref("");
const lastUpdatedAt = ref(null);
const showTooltip = ref(false);
const tooltipData = ref(null);
const tooltipLeft = ref(16);
const tooltipTop = ref(16);
const selectedAlternativeRouteId = ref("");
const currentRouteId = computed(() => props.currentRoute?.id ?? "");

let analyzeSeq = 0;
let chartResizeObserver = null;
let chartFrameId = 0;
let chartSyncTimeoutId = 0;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clamp = (value, min, max) => {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

const isValidCoordinate = (coordinate) => {
  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return false;
  }

  return Number.isFinite(Number(coordinate[0])) && Number.isFinite(Number(coordinate[1]));
};

const sanitizeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter((coordinate) => isValidCoordinate(coordinate))
    .map(([lon, lat]) => [Number(lon), Number(lat)]);
};

const normalizeRisk = (value) => {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return 0;
  }

  if (num > 1) {
    return Math.max(0, Math.min(1, num / 100));
  }

  return Math.max(0, Math.min(1, num));
};

const toRouteIdentity = (route, fallback = "") => {
  return route?.id ?? fallback;
};

const normalizeWaypoint = (point, fallbackName = "") => {
  if (!point) {
    return null;
  }

  const longitude = toNumber(point.longitude, NaN);
  const latitude = toNumber(point.latitude, NaN);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    ...point,
    name: point.name || fallbackName || "",
    longitude,
    latitude,
    height: toNumber(point.height ?? point.altitude, 300)
  };
};

const buildWaypointsFromSegments = (segments, route, flightHeight) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const points = [];
  const start = isValidCoordinate(segments[0]?.startCoordinates) ? segments[0].startCoordinates : null;

  if (start) {
    points.push({
      name: route?.startName || props.currentRoute?.startName || "起点",
      longitude: Number(start[0]),
      latitude: Number(start[1]),
      height: flightHeight
    });
  }

  segments.forEach((segment, index) => {
    if (!isValidCoordinate(segment?.endCoordinates)) {
      return;
    }

    points.push({
      name:
        index === segments.length - 1
          ? route?.endName || props.currentRoute?.endName || "终点"
          : `途经点${index + 1}`,
      longitude: Number(segment.endCoordinates[0]),
      latitude: Number(segment.endCoordinates[1]),
      height: flightHeight
    });
  });

  return points;
};

const formatAlternativeDuration = (route) => {
  return (
    route?.estimatedTime ||
    (Number.isFinite(Number(route?.estimatedMinutes)) ? `${Number(route.estimatedMinutes)} 分钟` : "--")
  );
};

const normalizeAlternativeRoute = (route, index) => {
  const routeId = toRouteIdentity(
    route,
    `${currentRouteId.value || "route"}-alt-${index + 1}`
  );
  const length = toNumber(route?.length, NaN);
  const flightHeight = toNumber(
    route?.flightHeight ?? props.currentRoute?.flightHeight,
    300
  );
  const riskValue = normalizeRisk(route?.averageRisk);
  const riskLevel = normalizePriority(route?.riskLevel ?? riskValue);
  const segmentData = normalizeRouteData(route?.segmentData);
  const waypointsSource = Array.isArray(route?.waypoints) ? route.waypoints : [];
  const waypoints =
    waypointsSource
      .map((point, pointIndex) =>
        normalizeWaypoint(
          point,
          pointIndex === 0
            ? route?.startName || props.currentRoute?.startName || "起点"
            : pointIndex === waypointsSource.length - 1
              ? route?.endName || props.currentRoute?.endName || "终点"
              : `途经点${pointIndex}`
        )
      )
      .filter(Boolean);

  const normalizedWaypoints =
    waypoints.length >= 2 ? waypoints : buildWaypointsFromSegments(segmentData, route, flightHeight);
  const fallbackDistance = Number.isFinite(segmentData[segmentData.length - 1]?.distance)
    ? segmentData[segmentData.length - 1].distance
    : segmentData.reduce(
        (sum, segment) => sum + (Number.isFinite(segment.segmentLength) ? segment.segmentLength : 0),
        0
      );
  const normalizedDistance = Number.isFinite(length) ? length : fallbackDistance;
  const normalizedLength = Number.isFinite(length) ? length : fallbackDistance;

  return {
    ...route,
    id: routeId,
    name: route?.name || `备选航线 ${index + 1}`,
    startName: route?.startName || props.currentRoute?.startName || normalizedWaypoints[0]?.name || "起点",
    endName:
      route?.endName ||
      props.currentRoute?.endName ||
      normalizedWaypoints[normalizedWaypoints.length - 1]?.name ||
      "终点",
    riskLevel,
    riskText: getRiskTextByLevel(riskLevel),
    risk: riskValue,
    averageRisk: riskValue,
    distance: Number.isFinite(normalizedDistance) ? normalizedDistance : normalizedLength,
    length: Number.isFinite(normalizedLength) ? normalizedLength : 0,
    distanceText:
      Number.isFinite(normalizedDistance) || Number.isFinite(normalizedLength)
        ? `${(Number.isFinite(normalizedDistance) ? normalizedDistance : normalizedLength).toFixed(1)} km`
        : "--",
    estimatedTime: formatAlternativeDuration(route),
    flightHeight,
    heightText: Number.isFinite(flightHeight) ? `高度 ${flightHeight.toFixed(0)} m` : "",
    segments: toNumber(route?.segments, segmentData.length),
    segmentData,
    waypoints: normalizedWaypoints,
    description: route?.description || "可在主航线风险升高时作为替代方案。",
    source: "analysis"
  };
};

const normalizeCoordinates = (segment, startLon, startLat, endLon, endLat) => {
  const pathCoordinates = sanitizeCoordinates(segment?.pathCoordinates);
  if (pathCoordinates.length > 1) {
    return pathCoordinates;
  }

  return [
    [startLon, startLat],
    [endLon, endLat]
  ].filter((coordinate) => isValidCoordinate(coordinate));
};

const normalizeRouteData = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  let accumulatedDistance = 0;

  return segments.map((segment, index) => {
    const segmentLengthRaw = Number(segment?.segmentLength);
    const distanceRaw = Number(segment?.distance);

    let segmentLength = Number.isFinite(segmentLengthRaw) ? segmentLengthRaw : 0;
    let distance = Number.isFinite(distanceRaw) ? distanceRaw : NaN;

    if (!Number.isFinite(distance) && Number.isFinite(segmentLengthRaw)) {
      distance = accumulatedDistance + segmentLengthRaw;
    }

    if (Number.isFinite(distance) && !Number.isFinite(segmentLengthRaw)) {
      segmentLength = Math.max(0, distance - accumulatedDistance);
    }

    if (!Number.isFinite(distance)) {
      distance = accumulatedDistance;
    }

    accumulatedDistance = distance;

    const start = Array.isArray(segment?.startCoordinates) ? segment.startCoordinates : [];
    const end = Array.isArray(segment?.endCoordinates) ? segment.endCoordinates : [];

    const startLon = toNumber(start[0], NaN);
    const startLat = toNumber(start[1], NaN);
    const endLon = toNumber(end[0], NaN);
    const endLat = toNumber(end[1], NaN);
    const pathCoordinates = normalizeCoordinates(segment, startLon, startLat, endLon, endLat);

    return {
      segment: toNumber(segment?.segment, index + 1),
      distance,
      segmentLength,
      risk: normalizeRisk(segment?.risk),
      windSpeed: toNumber(segment?.windSpeed, NaN),
      windDir: toNumber(segment?.windDir, NaN),
      windShear: toNumber(segment?.windShear, NaN),
      turbulence: toNumber(segment?.turbulence, NaN),
      rainfall: toNumber(segment?.rainfall, NaN),
      startCoordinates: Number.isFinite(startLon) && Number.isFinite(startLat) ? [startLon, startLat] : [],
      endCoordinates: Number.isFinite(endLon) && Number.isFinite(endLat) ? [endLon, endLat] : [],
      pathCoordinates,
      coordinates: pathCoordinates,
      reason: typeof segment?.reason === "string" ? segment.reason.trim() : ""
    };
  });
};

const getRiskLevel = (value) => {
  if (value < 0.3) return 0;
  if (value < 0.7) return 1;
  return 2;
};

const getRiskLevelKey = (value) => {
  const level = getRiskLevel(value);
  if (level === 2) return "high";
  if (level === 1) return "medium";
  return "low";
};

const getRiskText = (value) => {
  if (value < 0.3) return "低风险";
  if (value < 0.7) return "中风险";
  return "高风险";
};

const getLevelText = (value) => {
  if (!Number.isFinite(value)) return "未知";

  if (value <= 1.5) {
    if (value < 0.25) return "弱";
    if (value < 0.6) return "中";
    return "强";
  }

  if (value < 3) return "弱";
  if (value < 7) return "中";
  return "强";
};

const getRiskColor = (value) => {
  const level = getRiskLevel(value);
  return riskLevels[level]?.color || "#5dc1ff";
};

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(digits);
};

const formatWindText = (speed, direction) => {
  const speedText = Number.isFinite(speed) ? `${speed.toFixed(1)} m/s` : "--";
  const directionText = Number.isFinite(direction) ? `${direction.toFixed(0)}°` : "--";
  return `${speedText} / ${directionText}`;
};

const formatDateTime = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value);
};

const getPriorityLabel = (level) => {
  if (level === "high") return "高优先级";
  if (level === "medium") return "中优先级";
  return "低优先级";
};

const normalizePriority = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const risk = normalizeRisk(numeric);

    if (risk >= 0.7) return "high";
    if (risk < 0.3) return "low";
    return "medium";
  }

  const text = String(value || "").toLowerCase();

  if (text.includes("high") || text.includes("高")) return "high";
  if (text.includes("low") || text.includes("低")) return "low";
  return "medium";
};

const getIconByLevel = (level) => {
  if (level === "high") return "⚠";
  if (level === "medium") return "⌁";
  return "✓";
};

const getRiskTextByLevel = (level) => {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  return "低风险";
};

const isHighWindShear = (value) => {
  if (!Number.isFinite(value)) return false;
  return value <= 1.5 ? value >= 0.45 : value >= 7;
};

const isHighTurbulence = (value) => {
  if (!Number.isFinite(value)) return false;
  return value <= 2 ? value >= 0.8 : value >= 7;
};

const isHighRainfall = (value) => {
  if (!Number.isFinite(value)) return false;
  return value >= 2.5;
};

const getAltitudeRecommendation = (segments) => {
  if (!segments.length) return "300 - 500 m";

  const avgWindSpeed =
    segments.reduce((sum, segment) => sum + (Number.isFinite(segment.windSpeed) ? segment.windSpeed : 0), 0) /
    segments.length;
  const avgTurbulence =
    segments.reduce((sum, segment) => sum + (Number.isFinite(segment.turbulence) ? segment.turbulence : 0), 0) /
    segments.length;

  if (avgWindSpeed > 10 || avgTurbulence > 1) return "600 - 800 m";
  if (avgWindSpeed > 7 || avgTurbulence > 0.7) return "500 - 700 m";
  return "300 - 500 m";
};

const joinSegments = (segments) => segments.map((segment) => segment.segment).join("、");

const analysisRouteDataRef = computed(() => normalizeRouteData(analysisData.value?.segmentData));
const normalizedRouteDataRef = computed(() => {
  const routeSegments = normalizeRouteData(props.routeData);

  if (routeSegments.length > 0) {
    return routeSegments;
  }

  return analysisRouteDataRef.value;
});
const hasRouteData = computed(() => normalizedRouteDataRef.value.length > 0);

const routeDistance = computed(() => {
  const currentLength = Number(props.currentRoute?.length);
  if (Number.isFinite(currentLength)) {
    return currentLength;
  }

  const lastSegment = normalizedRouteDataRef.value[normalizedRouteDataRef.value.length - 1];
  if (Number.isFinite(lastSegment?.distance)) {
    return lastSegment.distance;
  }

  return normalizedRouteDataRef.value.reduce(
    (sum, segment) => sum + (Number.isFinite(segment.segmentLength) ? segment.segmentLength : 0),
    0
  );
});

const routeSegmentsCount = computed(() => {
  const currentSegments = Number(props.currentRoute?.segments);
  if (Number.isFinite(currentSegments) && currentSegments > 0) {
    return currentSegments;
  }

  return normalizedRouteDataRef.value.length;
});

const routeTitle = computed(() => {
  const startName = props.currentRoute?.startName || "起点待定";
  const endName = props.currentRoute?.endName || "终点待定";
  return `${startName} → ${endName}`;
});

const routeHeightText = computed(() => {
  const flightHeight = Number(props.currentRoute?.flightHeight);
  if (!Number.isFinite(flightHeight)) {
    return "";
  }

  return `计划高度 ${flightHeight.toFixed(0)} m`;
});

const routeOverviewText = computed(() => {
  const parts = [];

  if (Number.isFinite(routeDistance.value) && routeDistance.value > 0) {
    parts.push(`全程 ${routeDistance.value.toFixed(1)} km`);
  }

  if (routeSegmentsCount.value > 0) {
    parts.push(`航段 ${routeSegmentsCount.value} 段`);
  }

  if (!parts.length) {
    return "等待航线与气象数据接入";
  }

  return parts.join(" · ");
});

const averageRiskSource = computed(() => {
  return Number(
    analysisData.value?.averageRisk ??
      props.currentRoute?.averageRisk
  );
});

const overallRiskValue = computed(() => {
  if (Number.isFinite(averageRiskSource.value)) {
    return normalizeRisk(averageRiskSource.value);
  }

  if (!normalizedRouteDataRef.value.length) {
    return 0;
  }

  const totalRisk = normalizedRouteDataRef.value.reduce((sum, segment) => sum + segment.risk, 0);
  return totalRisk / normalizedRouteDataRef.value.length;
});

const overallRiskLevelKey = computed(() => getRiskLevelKey(overallRiskValue.value));
const overallRiskText = computed(() => getRiskText(overallRiskValue.value));

const riskBreakdown = computed(() => {
  return normalizedRouteDataRef.value.reduce(
    (accumulator, segment) => {
      const level = getRiskLevel(segment.risk);
      if (level === 2) accumulator.high += 1;
      else if (level === 1) accumulator.medium += 1;
      else accumulator.low += 1;
      return accumulator;
    },
    { low: 0, medium: 0, high: 0 }
  );
});

const peakRiskSegment = computed(() => {
  if (!normalizedRouteDataRef.value.length) {
    return null;
  }

  return normalizedRouteDataRef.value.reduce((peak, current) => {
    if (!peak || current.risk > peak.risk) {
      return current;
    }

    return peak;
  }, null);
});

const lastUpdatedText = computed(() => {
  if (!lastUpdatedAt.value) {
    return "";
  }

  return `更新于 ${formatDateTime(lastUpdatedAt.value)}`;
});

const derivedRecommendations = computed(() => {
  const list = [];
  const highRiskSegments = normalizedRouteDataRef.value.filter((segment) => segment.risk >= 0.7);
  const highWindShearSegments = normalizedRouteDataRef.value.filter((segment) => isHighWindShear(segment.windShear));
  const highTurbulenceSegments = normalizedRouteDataRef.value.filter((segment) => isHighTurbulence(segment.turbulence));
  const highRainfallSegments = normalizedRouteDataRef.value.filter((segment) => isHighRainfall(segment.rainfall));

  if (highRiskSegments.length > 0) {
    const reasons = highRiskSegments
      .map((segment) => segment.reason)
      .filter(Boolean)
      .slice(0, 2)
      .join("；");

    list.push({
      id: "derived-high-risk",
      level: "high",
      levelText: getPriorityLabel("high"),
      icon: "⚠",
      title: "高风险航段预警",
      description: `高风险航段 ${joinSegments(highRiskSegments)} 需优先复核。建议优先评估绕飞，或将飞行高度调整到 ${getAltitudeRecommendation(
        highRiskSegments
      )}。${reasons ? `触发原因：${reasons}` : ""}`
    });
  }

  if (highWindShearSegments.length > 0) {
    list.push({
      id: "derived-windshear",
      level: "medium",
      levelText: getPriorityLabel("medium"),
      icon: "⌁",
      title: "风切变控制建议",
      description: `航段 ${joinSegments(highWindShearSegments)} 风切变偏强，建议降低速度并提高姿态与抗扰控制监控频率。`
    });
  }

  if (highTurbulenceSegments.length > 0) {
    list.push({
      id: "derived-turbulence",
      level: "medium",
      levelText: getPriorityLabel("medium"),
      icon: "≈",
      title: "湍流风险提醒",
      description: `航段 ${joinSegments(highTurbulenceSegments)} 存在明显湍流，建议预留绕飞空间并关注飞控稳定性。`
    });
  }

  if (highRainfallSegments.length > 0) {
    list.push({
      id: "derived-rainfall",
      level: "low",
      levelText: getPriorityLabel("low"),
      icon: "☂",
      title: "降水影响提醒",
      description: `航段 ${joinSegments(highRainfallSegments)} 检测到降水，建议重点关注能见度、镜头污染和起降区条件。`
    });
  }

  if (!list.length && normalizedRouteDataRef.value.length > 0) {
    list.push({
      id: "derived-controllable",
      level: "low",
      levelText: getPriorityLabel("low"),
      icon: "✓",
      title: "当前风险可控",
      description: "当前航线未发现显著高风险航段，可按计划执行，并持续跟踪实况气象变化。"
    });
  }

  return list;
});

const recommendations = computed(() => {
  const measures = analysisData.value?.measures;

  if (Array.isArray(measures) && measures.length > 0) {
    return measures.map((item, index) => {
      const level = normalizePriority(item?.priority ?? item?.level);

      return {
        id: item?.id || `measure-${index + 1}`,
        level,
        levelText: getPriorityLabel(level),
        icon: getIconByLevel(level),
        title: item?.title || `应对建议 ${index + 1}`,
        description: item?.description || item?.content || "建议结合当前实时气象继续观察。"
      };
    });
  }

  return derivedRecommendations.value;
});

const alternativeRoutes = computed(() => {
  const routes = analysisData.value?.alternativeRoutes;

  if (!Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  return routes.map((route, index) => normalizeAlternativeRoute(route, index));
});

const summaryCards = computed(() => {
  const focusCount = riskBreakdown.value.high + riskBreakdown.value.medium;
  const peak = peakRiskSegment.value;
  const strategyTone =
    alternativeRoutes.value.length > 0 ? "medium" : recommendations.value.length > 0 ? "low" : "neutral";

  return [
    {
      key: "average-risk",
      mark: "风",
      label: "平均风险",
      value: hasRouteData.value ? formatNumber(overallRiskValue.value) : "--",
      description: hasRouteData.value ? overallRiskText.value : "等待航段数据",
      tone: hasRouteData.value ? overallRiskLevelKey.value : "neutral"
    },
    {
      key: "peak-risk",
      mark: "峰",
      label: "最高风险航段",
      value: peak ? `段 ${peak.segment}` : "--",
      description: peak ? `${formatNumber(peak.risk)} · ${getRiskText(peak.risk)}` : "暂无峰值",
      tone: peak ? getRiskLevelKey(peak.risk) : "neutral"
    },
    {
      key: "focus-segments",
      mark: "警",
      label: "重点关注",
      value: hasRouteData.value ? `${riskBreakdown.value.high} 段高风险` : "--",
      description: hasRouteData.value ? `中高风险共 ${focusCount} 段` : "暂无航段分析",
      tone: riskBreakdown.value.high > 0 ? "high" : riskBreakdown.value.medium > 0 ? "medium" : "low"
    },
    {
      key: "strategy-output",
      mark: "策",
      label: "分析输出",
      value: `${recommendations.value.length} / ${alternativeRoutes.value.length}`,
      description: `措施 ${recommendations.value.length} 条 · 备选 ${alternativeRoutes.value.length} 条`,
      tone: strategyTone
    }
  ];
});

const analysisStatusText = computed(() => {
  if (isAnalyzing.value) {
    return "正在同步最新气象分析结果…";
  }

  if (analyzeError.value) {
    return analyzeError.value;
  }

  if (lastUpdatedAt.value) {
    return `分析结果已同步，最近一次更新时间 ${formatDateTime(lastUpdatedAt.value)}`;
  }

  return "";
});

const statusBannerClass = computed(() => {
  if (isAnalyzing.value) return "banner-loading";
  if (analyzeError.value) return "banner-error";
  return "banner-success";
});

const refreshButtonText = computed(() => {
  if (isAnalyzing.value) {
    return "分析中";
  }

  return "刷新分析";
});

const chartHintText = computed(() => {
  if (!hasRouteData.value) {
    return "选中航线后，这里会展示逐航段风险分布和气象细项。";
  }

  const highRiskSegments = riskBreakdown.value.high;
  if (highRiskSegments > 0) {
    return `悬停查看气象细项，点击柱体可在地图中高亮航段。当前共有 ${highRiskSegments} 段高风险航段。`;
  }

  return "当前航段整体较稳定，仍建议持续关注实况气象变化。";
});

const measureEmptyText = computed(() => {
  if (analyzeError.value) {
    return "分析接口暂未返回措施结果，可先参考图表中的高风险航段进行人工判断。";
  }

  if (!hasRouteData.value) {
    return "暂无可分析的航段气象数据。";
  }

  return "当前未识别出需要额外干预的风险措施。";
});

const alternativeEmptyText = computed(() => {
  if (analyzeError.value) {
    return "分析接口暂未返回备选航线结果，建议保留人工绕飞预案。";
  }

  if (!currentRouteId.value) {
    return "当前航线缺少唯一标识，暂时无法请求备选航线分析。";
  }

  return "当前主航线风险可控，暂未生成额外备选航线。";
});

const getTabCount = (key) => {
  if (key === "chart") {
    return routeSegmentsCount.value;
  }

  if (key === "measures") {
    return recommendations.value.length;
  }

  return alternativeRoutes.value.length;
};

const buildChartOption = () => {
  const routeData = normalizedRouteDataRef.value;

  if (!routeData.length) {
    return {
      backgroundColor: "transparent",
      animation: false,
      tooltip: { show: false },
      grid: {
        left: "6%",
        right: "4%",
        top: "16%",
        bottom: "10%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: []
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 1
      },
      series: [],
      graphic: {
        type: "group",
        left: "center",
        top: "middle",
        children: [
          {
            type: "text",
            top: -8,
            style: {
              text: "暂无航段气象数据",
              fill: "#f8fbff",
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center"
            }
          },
          {
            type: "text",
            top: 20,
            style: {
              text: "等待选中航线后载入逐段风险分析",
              fill: "rgba(202, 216, 235, 0.75)",
              fontSize: 12,
              textAlign: "center"
            }
          }
        ]
      }
    };
  }

  const showTopLabel = routeData.length <= 12;

  return {
    backgroundColor: "transparent",
    animation: true,
    animationDuration: 450,
    animationEasing: "cubicOut",
    tooltip: {
      show: false
    },
    grid: {
      left: "4%",
      right: "4%",
      top: "16%",
      bottom: "14%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: routeData.map((item) => `段 ${item.segment}`),
      axisTick: { show: false },
      axisLine: {
        lineStyle: {
          color: "rgba(154, 187, 230, 0.28)"
        }
      },
      axisLabel: {
        color: "#bfd3ea",
        fontSize: 12,
        margin: 14
      }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      splitNumber: 5,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(191, 211, 234, 0.78)",
        fontSize: 11,
        formatter: (value) => Number(value).toFixed(1)
      },
      splitLine: {
        lineStyle: {
          color: "rgba(120, 162, 214, 0.14)",
          type: "dashed"
        }
      },
      name: "风险指数",
      nameTextStyle: {
        color: "rgba(191, 211, 234, 0.78)",
        padding: [0, 0, 0, 14]
      }
    },
    series: [
      {
        type: "bar",
        data: routeData.map(() => 1),
        barWidth: "54%",
        silent: true,
        barGap: "-100%",
        itemStyle: {
          color: "rgba(255, 255, 255, 0.05)",
          borderRadius: [10, 10, 0, 0]
        },
        z: 1
      },
      {
        name: "风险指数",
        type: "bar",
        data: routeData.map((item) => {
          return {
            value: item.risk,
            itemStyle: {
              color: getRiskColor(item.risk),
              borderRadius: [10, 10, 0, 0],
              borderColor: "rgba(255, 255, 255, 0.25)",
              borderWidth: 1
            }
          };
        }),
        barWidth: "54%",
        z: 3,
        label: {
          show: showTopLabel,
          position: "top",
          distance: 10,
          color: "#edf6ff",
          fontSize: 11,
          formatter: ({ value }) => formatNumber(Number(value))
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 18,
            shadowColor: "rgba(93, 193, 255, 0.35)",
            borderColor: "#ffffff"
          }
        },
        markLine: {
          symbol: "none",
          silent: true,
          label: {
            formatter: ({ value }) => (value === 0.7 ? "高风险阈值" : "中风险阈值"),
            color: "rgba(219, 232, 247, 0.85)",
            fontSize: 10,
            padding: [2, 6],
            backgroundColor: "rgba(10, 26, 55, 0.9)",
            borderRadius: 10
          },
          lineStyle: {
            type: "dashed",
            width: 1
          },
          data: [
            {
              yAxis: 0.3,
              lineStyle: {
                color: "rgba(255, 184, 77, 0.6)"
              }
            },
            {
              yAxis: 0.7,
              lineStyle: {
                color: "rgba(255, 107, 107, 0.6)"
              }
            }
          ]
        }
      }
    ]
  };
};

const hideTooltip = () => {
  showTooltip.value = false;
  tooltipData.value = null;
};

const getChartViewportSize = () => {
  const container = chartContainerRef.value;
  const chartDom = chartRef.value;
  const width = container?.clientWidth ?? chartDom?.clientWidth ?? 0;
  const height = container?.clientHeight ?? chartDom?.clientHeight ?? 0;

  return { width, height };
};

const isChartReadyForRender = () => {
  if (!props.panelVisible || globalActiveTab.value !== "chart" || !chartRef.value) {
    return false;
  }

  const { width, height } = getChartViewportSize();
  return width > 0 && height > 0;
};


const clearPendingChartSync = () => {
  if (chartFrameId) {
    cancelAnimationFrame(chartFrameId);
    chartFrameId = 0;
  }

  if (chartSyncTimeoutId) {
    clearTimeout(chartSyncTimeoutId);
    chartSyncTimeoutId = 0;
  }
};

const disposeChart = () => {
  const currentInstance = riskChart.value;
  const domInstance = chartRef.value ? echarts.getInstanceByDom(chartRef.value) : null;

  currentInstance?.dispose();

  if (domInstance && domInstance !== currentInstance) {
    domInstance.dispose();
  }

  riskChart.value = null;
};

const getOrCreateChart = () => {
  if (!isChartReadyForRender()) {
    return null;
  }

  const currentInstance = riskChart.value;
  const domInstance = echarts.getInstanceByDom(chartRef.value);

  if (currentInstance && currentInstance.getDom() === chartRef.value) {
    currentInstance.resize();
    return currentInstance;
  }

  if (domInstance && domInstance !== currentInstance) {
    domInstance.dispose();
  }

  currentInstance?.dispose();
  riskChart.value = echarts.init(chartRef.value);
  return riskChart.value;
};

const renderChart = ({ recreate = false } = {}) => {
  if (!isChartReadyForRender()) {
    disposeChart();
    return;
  }

  if (recreate) {
    disposeChart();
  }

  const option = buildChartOption();
  const applyOption = (chart) => {
    chart.resize();
    chart.setOption(option, {
      notMerge: true,
      lazyUpdate: false
    });
  };

  let chart = getOrCreateChart();
  if (!chart) {
    return;
  }

  try {
    applyOption(chart);
  } catch (error) {
    console.error("RouterRisk chart render failed, retrying with a fresh instance:", error);
    disposeChart();
    chart = getOrCreateChart();

    if (!chart) {
      return;
    }

    applyOption(chart);
  }
};

const initChart = () => {
  renderChart({ recreate: true });
};

const updateChart = () => {
  renderChart();
};

const resizeChart = () => {
  if (!isChartReadyForRender()) {
    disposeChart();
    return;
  }

  if (!riskChart.value) {
    renderChart();
    return;
  }

  riskChart.value.resize();
};

const handleResize = () => {
  if (!props.panelVisible || globalActiveTab.value !== "chart") {
    disposeChart();
    return;
  }

  syncLayout();
};

const syncLayout = (options = {}) => {
  const config =
    typeof options === "boolean"
      ? {
          recreate: options,
          render: options,
          settle: false
        }
      : {
          recreate: false,
          render: false,
          settle: false,
          ...options
        };

  if (chartFrameId) {
    cancelAnimationFrame(chartFrameId);
  }

  chartFrameId = requestAnimationFrame(() => {
    chartFrameId = 0;

    if (!isChartReadyForRender()) {
      disposeChart();
      return;
    }

    if (config.recreate) {
      initChart();
      return;
    }

    if (config.render || !riskChart.value) {
      updateChart();
      return;
    }

    resizeChart();
  });

  if (!config.settle) {
    return;
  }

  if (chartSyncTimeoutId) {
    clearTimeout(chartSyncTimeoutId);
  }

  chartSyncTimeoutId = window.setTimeout(() => {
    chartSyncTimeoutId = 0;
    syncLayout();
  }, 280);
};

const refreshAnalysis = () => {
  loadRouteAnalysis();
};

const loadRouteAnalysis = async () => {
  const routeId = currentRouteId.value;

  if (!routeId) {
    analysisData.value = null;
    analyzeError.value = "";
    isAnalyzing.value = false;
    lastUpdatedAt.value = null;
    disposeChart();
    return;
  }

  const requestId = ++analyzeSeq;
  isAnalyzing.value = true;
  analyzeError.value = "";

  try {
    const payload = await fetchRouteRiskAnalysis(routeId, {
      currentTime: new Date().toISOString()
    });

    if (requestId !== analyzeSeq) {
      return;
    }

    analysisData.value = payload;
    analyzeError.value = "";
    lastUpdatedAt.value = new Date();
  } catch (error) {
    if (requestId !== analyzeSeq) {
      return;
    }

    analysisData.value = null;
    analyzeError.value = error?.message ? `分析更新失败：${error.message}` : "分析更新失败，请稍后重试。";
    console.error("航线分析接口调用失败:", error);
  } finally {
    if (requestId === analyzeSeq) {
      isAnalyzing.value = false;
    }
  }
};

const selectAlternativeRoute = (route) => {
  selectedAlternativeRouteId.value = route.id;
  emit("alternativeRouteSelected", route);
};

watch(
  normalizedRouteDataRef,
  () => {
    hideTooltip();
    nextTick(() => {
      syncLayout({
        render: true,
        settle: true
      });
    });
  },
  { immediate: true }
);

watch(
  () => currentRouteId.value,
  (routeId) => {
    selectedAlternativeRouteId.value = "";
    hideTooltip();

    if (!routeId) {
      analysisData.value = null;
      analyzeError.value = "";
      lastUpdatedAt.value = null;
      disposeChart();
      return;
    }

    loadRouteAnalysis();
  },
  { immediate: true }
);

watch(
  alternativeRoutes,
  (routes) => {
    if (!Array.isArray(routes) || routes.length === 0) {
      selectedAlternativeRouteId.value = "";
      return;
    }

    const currentSelected = routes.find((route) => route.id === selectedAlternativeRouteId.value);
    if (!currentSelected) {
      selectedAlternativeRouteId.value = "";
    }
  },
  { deep: true }
);

watch(
  () => moduleStore.currentModule,
  () => {
    nextTick(() => {
      syncLayout();
    });
  }
);

watch(
  () => props.panelVisible,
  (visible) => {
    if (!visible) {
      hideTooltip();
      disposeChart();
      return;
    }

    nextTick(() => {
      syncLayout({
        recreate: true,
        render: true,
        settle: true
      });
    });
  },
  { immediate: true }
);

watch(
  () => globalActiveTab.value,
  (tab) => {
    if (tab === "chart") {
      nextTick(() => {
        syncLayout({
          recreate: true,
          render: true,
          settle: true
        });
      });
      return;
    }

    hideTooltip();
    disposeChart();
  }
);

onMounted(() => {
  window.addEventListener("resize", handleResize);
  nextTick(() => {
    syncLayout({
      recreate: true,
      render: true,
      settle: true
    });

    if (typeof ResizeObserver !== "undefined" && chartContainerRef.value) {
      chartResizeObserver = new ResizeObserver(() => {
        if (props.panelVisible && globalActiveTab.value === "chart") {
          syncLayout();
          return;
        }

        disposeChart();
      });

      chartResizeObserver.observe(chartContainerRef.value);
    }
  });
});

onUnmounted(() => {
  hideTooltip();
  clearPendingChartSync();
  disposeChart();
  chartResizeObserver?.disconnect?.();
  chartResizeObserver = null;

  window.removeEventListener("resize", handleResize);
});

defineExpose({
  syncLayout
});
</script>

<style scoped lang="scss">
.route-risk-card {
  --card-bg: rgba(8, 21, 44, 0.9);
  --panel-bg: rgba(10, 28, 56, 0.72);
  --panel-bg-strong: rgba(11, 32, 63, 0.88);
  --line-color: rgba(121, 167, 226, 0.16);
  --text-main: #eff6ff;
  --text-subtle: rgba(202, 216, 235, 0.78);
  --text-faint: rgba(176, 194, 217, 0.62);
  --success: #29d391;
  --warning: #ffb84d;
  --danger: #ff6b6b;
  position: relative;
  padding: 18px;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(93, 193, 255, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(12, 31, 62, 0.96), rgba(7, 18, 38, 0.96));
  border: 1px solid var(--line-color);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 18px 18px;
    pointer-events: none;
    opacity: 0.32;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.22);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.header-main {
  min-width: 0;
}

.header-eyebrow {
  margin: 0 0 6px;
  color: rgba(153, 196, 242, 0.92);
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title {
  margin: 0;
  color: var(--text-main);
  font-size: 20px;
  line-height: 1.3;
  font-weight: 700;
}

.status-pill,
.tooltip-risk {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.08);
}

.status-low {
  color: var(--success);
  background: rgba(41, 211, 145, 0.12);
  border-color: rgba(41, 211, 145, 0.24);
}

.status-medium {
  color: var(--warning);
  background: rgba(255, 184, 77, 0.12);
  border-color: rgba(255, 184, 77, 0.24);
}

.status-high {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.24);
}

.route-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin: 8px 0 0;
  color: var(--text-subtle);
  font-size: 12px;
}

.refresh-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 108px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(93, 193, 255, 0.28);
  background:
    linear-gradient(180deg, rgba(93, 193, 255, 0.16), rgba(93, 193, 255, 0.08)),
    rgba(255, 255, 255, 0.03);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(93, 193, 255, 0.5);
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summary-card {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(12, 32, 63, 0.82), rgba(8, 20, 41, 0.76));
  border: 1px solid rgba(140, 172, 214, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.summary-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.summary-content {
  min-width: 0;
}

.summary-label {
  margin: 0 0 6px;
  color: var(--text-faint);
  font-size: 12px;
}

.summary-value {
  margin: 0;
  color: var(--text-main);
  font-size: 20px;
  line-height: 1.1;
  font-weight: 700;
}

.summary-desc {
  margin: 6px 0 0;
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.45;
}

.tone-low .summary-mark {
  background: rgba(41, 211, 145, 0.18);
}

.tone-medium .summary-mark {
  background: rgba(255, 184, 77, 0.18);
}

.tone-high .summary-mark {
  background: rgba(255, 107, 107, 0.18);
}

.tone-neutral .summary-mark {
  background: rgba(93, 193, 255, 0.16);
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 10px 14px;
  margin-bottom: 14px;
  border-radius: 14px;
  font-size: 12px;
  color: var(--text-main);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
}

.banner-loading {
  border-color: rgba(93, 193, 255, 0.24);
  background: rgba(93, 193, 255, 0.1);
}

.banner-error {
  border-color: rgba(255, 107, 107, 0.26);
  background: rgba(255, 107, 107, 0.12);
}

.banner-success {
  border-color: rgba(41, 211, 145, 0.2);
  background: rgba(41, 211, 145, 0.1);
}

.banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.92;
}

.global-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(121, 167, 226, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-subtle);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(93, 193, 255, 0.34);
    color: var(--text-main);
  }

  &.active {
    color: var(--text-main);
    border-color: rgba(93, 193, 255, 0.44);
    background:
      linear-gradient(180deg, rgba(93, 193, 255, 0.16), rgba(93, 193, 255, 0.06)),
      rgba(255, 255, 255, 0.04);
    box-shadow: 0 10px 24px rgba(6, 14, 28, 0.24);
  }
}

.tab-icon {
  font-size: 12px;
  opacity: 0.85;
}

.tab-label {
  font-weight: 600;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-size: 11px;
}

.tab-panel {
  min-height: 248px;
}

.chart-container {
  position: relative;
  height: 280px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(13, 32, 63, 0.82), rgba(7, 18, 36, 0.84)),
    var(--panel-bg);
  border: 1px solid rgba(121, 167, 226, 0.14);
  overflow: hidden;
}

.risk-chart {
  width: 100%;
  height: 100%;
}

.chart-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 16px;
  margin-top: 12px;
  padding: 12px 2px 0;
}

.risk-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-subtle);
  font-size: 12px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.chart-hint {
  margin: 0;
  color: var(--text-faint);
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
}

.detail-tooltip {
  position: absolute;
  width: 280px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(93, 193, 255, 0.28);
  background:
    linear-gradient(180deg, rgba(9, 27, 52, 0.96), rgba(6, 16, 34, 0.96)),
    rgba(5, 14, 29, 0.96);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.34);
  pointer-events: none;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.tooltip-title {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.tooltip-subtitle {
  margin: 4px 0 0;
  color: var(--text-faint);
  font-size: 12px;
}

.tooltip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tooltip-item {
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.04);

  span {
    display: block;
    margin-bottom: 4px;
    color: var(--text-faint);
    font-size: 11px;
  }

  strong {
    color: var(--text-main);
    font-size: 12px;
    line-height: 1.5;
  }
}

.tooltip-reason {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.5;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-title {
  margin: 0;
  color: var(--text-main);
  font-size: 17px;
  font-weight: 700;
}

.panel-subtitle {
  margin: 6px 0 0;
  color: var(--text-faint);
  font-size: 12px;
}

.panel-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(121, 167, 226, 0.14);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
}

.panel-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommendation-item,
.alternative-item {
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(12, 32, 63, 0.82), rgba(8, 20, 41, 0.78));
  border: 1px solid rgba(121, 167, 226, 0.14);
}

.recommendation-item {
  padding: 14px;

  p {
    margin: 0;
    color: var(--text-subtle);
    font-size: 13px;
    line-height: 1.6;
  }
}

.item-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.rec-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 16px;
  font-weight: 700;
}

.item-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;

  h4 {
    margin: 0;
    color: var(--text-main);
    font-size: 14px;
    font-weight: 700;
  }
}

.level-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.chip-high {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.12);
}

.chip-medium {
  color: var(--warning);
  background: rgba(255, 184, 77, 0.12);
}

.chip-low {
  color: var(--success);
  background: rgba(41, 211, 145, 0.12);
}

.risk-level-high {
  border-color: rgba(255, 107, 107, 0.2);
}

.risk-level-medium {
  border-color: rgba(255, 184, 77, 0.2);
}

.risk-level-low {
  border-color: rgba(41, 211, 145, 0.18);
}

.alternative-item {
  width: 100%;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(93, 193, 255, 0.3);
  }

  &.selected {
    border-color: rgba(93, 193, 255, 0.44);
    background:
      linear-gradient(180deg, rgba(16, 42, 79, 0.9), rgba(8, 22, 43, 0.82)),
      rgba(255, 255, 255, 0.03);
    box-shadow: 0 14px 30px rgba(5, 13, 26, 0.28);
  }
}

.route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.route-name {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.route-risk {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.route-risk.risk-high {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.12);
}

.route-risk.risk-medium {
  color: var(--warning);
  background: rgba(255, 184, 77, 0.12);
}

.route-risk.risk-low {
  color: var(--success);
  background: rgba(41, 211, 145, 0.12);
}

.route-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-bottom: 8px;
  color: var(--text-faint);
  font-size: 12px;
}

.route-description {
  margin: 0;
  color: var(--text-subtle);
  font-size: 13px;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 28px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(121, 167, 226, 0.18);
  text-align: center;
}

.empty-title {
  margin: 0 0 8px;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 700;
}

.empty-desc {
  margin: 0;
  max-width: 420px;
  color: var(--text-faint);
  font-size: 13px;
  line-height: 1.6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .route-risk-card {
    padding: 14px;
    border-radius: 16px;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .refresh-btn {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 320px;
  }

  .detail-tooltip {
    width: calc(100% - 24px);
  }

  .tooltip-grid {
    grid-template-columns: 1fr;
  }

  .chart-hint {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .route-risk-card {
    padding: 12px;
  }

  .card-title {
    font-size: 18px;
  }

  .global-tabs {
    gap: 6px;
  }

  .tab-item {
    flex: 1 1 calc(50% - 6px);
    justify-content: center;
  }

  .chart-container {
    height: 340px;
  }
}
</style>
