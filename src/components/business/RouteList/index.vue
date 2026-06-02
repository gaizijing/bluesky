<template>
  <div class="route-list-container">
    <div class="top-toolbar">
      <button type="button" class="clear-screen-btn" @click="clearScreen">清屏</button>
      <button
        type="button"
        class="export-kml-btn"
        :disabled="!canExportKml"
        @click="exportKml"
      >
        导出路径文件
      </button>
    </div>

    <div class="plan-section">
      <div class="section-title">
        <div class="title-bg"><span>规划航线</span></div>
      </div>

      <form class="add-route-form" @submit.prevent="generatePreview">
        <div class="form-group">
          <label>起始地点</label>
          <input v-model="planForm.startName" type="text" placeholder="名称" required />
          <div class="coordinate-inputs">
            <input
              v-model.number="planForm.startLon"
              type="number"
              step="any"
              placeholder="经度"
              required
              @blur="blurRoundPlanField('startLon')"
            />
            <input
              v-model.number="planForm.startLat"
              type="number"
              step="any"
              placeholder="纬度"
              required
              @blur="blurRoundPlanField('startLat')"
            />
            <button type="button" class="map-select-btn" @click="startMapSelection('start')">地图选点</button>
          </div>
        </div>

        <div class="form-group">
          <label>终点</label>
          <input v-model="planForm.endName" type="text" placeholder="名称" required />
          <div class="coordinate-inputs">
            <input
              v-model.number="planForm.endLon"
              type="number"
              step="any"
              placeholder="经度"
              required
              @blur="blurRoundPlanField('endLon')"
            />
            <input
              v-model.number="planForm.endLat"
              type="number"
              step="any"
              placeholder="纬度"
              required
              @blur="blurRoundPlanField('endLat')"
            />
            <button type="button" class="map-select-btn" @click="startMapSelection('end')">地图选点</button>
          </div>
        </div>

        <div class="form-group">
          <label>途经点（可选）</label>
          <div v-for="(waypoint, index) in planForm.waypoints" :key="index" class="waypoint-item">
            <input v-model="waypoint.name" type="text" placeholder="名称" />
            <div class="coordinate-inputs">
              <input
                v-model.number="waypoint.lon"
                type="number"
                step="any"
                placeholder="经度"
                @blur="blurRoundWaypoint(index, 'lon')"
              />
              <input
                v-model.number="waypoint.lat"
                type="number"
                step="any"
                placeholder="纬度"
                @blur="blurRoundWaypoint(index, 'lat')"
              />
              <button type="button" class="map-select-btn" @click="startMapSelection(`waypoint_${index}`)">
                地图选点
              </button>
            </div>
            <button type="button" class="remove-waypoint-btn" @click="removeWaypoint(index)">删除</button>
          </div>
          <button type="button" class="add-waypoint-btn" @click="addWaypoint">+ 添加途经点</button>
        </div>

        <div class="form-group">
          <label>飞行器型号</label>
          <el-select v-model="planForm.aircraftModel" placeholder="请选择" style="width: 100%">
            <el-option value="" label="请选择" />
            <el-option v-for="m in aircraftModels" :key="m" :label="m" :value="m" />
          </el-select>
        </div>

        <div class="form-group">
          <label>巡航高度 (m)</label>
          <input v-model.number="planForm.flightHeight" type="number" step="10" min="50" max="500" required />
        </div>

        <div class="form-actions">
          <button type="submit" class="primary-btn">生成预览</button>
        </div>
      </form>
    </div>

    <div v-if="routeStore.currentRoute" class="current-route-section">
      <div class="section-title">
        <div class="title-bg"><span>当前航线</span></div>
      </div>
      <div class="current-route-info">
        <div class="route-path">
          <span class="start-point">{{ routeStore.currentRoute.startName }}</span>
          <span class="path-arrow">→</span>
          <span v-for="(w, i) in midWaypointLabels" :key="i" class="waypoint">{{ w }}</span>
          <span v-if="midWaypointLabels.length" class="path-arrow">→</span>
          <span class="end-point">{{ routeStore.currentRoute.endName }}</span>
        </div>
        <div class="route-details">
          <span class="detail-item">总长: {{ routeStore.currentRoute.lengthText }}</span>
          <span class="detail-item">飞行器: {{ routeStore.currentRoute.aircraftModel || '—' }}</span>
        </div>
      </div>
    </div>

  </div>

  <Teleport to="body">
    <div
      v-show="landingOverlayVisible && landingCard"
      class="map-landing-overlay-root"
      :style="{ left: landingScreenPos.x + 'px', top: landingScreenPos.y + 'px' }"
    >
      <div class="map-landing-card" >
        <button type="button" class="map-landing-close" aria-label="关闭" @click="closeLandingCard">×</button>
        <div class="map-landing-card-inner">
          <div class="map-landing-title">起降点信息</div>
          <p><span class="lbl">位置</span> 经度 {{ fmt(lonDisplay) }}　纬度 {{ fmt(latDisplay) }}</p>
          <p><span class="lbl">海拔</span> {{ landingCard?.altitudeText }}</p>
          <p><span class="lbl">地面风速</span> {{ landingCard?.windSpeed }}</p>
          <p><span class="lbl">风向风力</span> {{ landingCard?.windDirScale }}</p>
          <p><span class="lbl">能见度</span> {{ landingCard?.visibility }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as Cesium from 'cesium'
import { ElMessage } from 'element-plus'
import eventManager from '@/cesium/core/eventManager'
import { useRouteStore } from '@/store/modules/routeStore'
import { useHeatmapStore } from '@/store/modules/heatmap'
import { useAircraftStore } from '@/store/modules/aircraft'
import { getRiskZones, getWeatherByCoords } from '@/api'
import routePlanMarkerUrl from '@/assets/icons/route-plan-marker.png'
import pickPointPopupBg from '@/assets/icons/pick-point-popup-bg.png'
import {
  buildEvotlPath3D,
  cumulativeDistanceKm,
  fetchWindAlongPath
} from '@/utils/routePathBuilder'
import { buildKmlLineString, downloadKml } from '@/utils/exportKmlTrack'

const routeStore = useRouteStore()
const heatmapStore = useHeatmapStore()
const aircraftStore = useAircraftStore()

const aircraftModels = ref([])
const planForm = ref({
  startName: '',
  startLon: null,
  startLat: null,
  endName: '',
  endLon: null,
  endLat: null,
  waypoints: [],
  aircraftModel: '',
  flightHeight: 300
})

const selectingPointTarget = ref(null)
const lastPathSamples = ref([])

/** Cesium entity ids for planning pick markers (start / waypoints / end) */
const PICK_MARKER_PREFIX = 'route-plan-pick-marker-'
const pickMarkerIds = []

function getViewer() {
  return window.viewer
}

function clearPickMarkers() {
  const viewer = getViewer()
  if (!viewer) return
  while (pickMarkerIds.length) {
    const id = pickMarkerIds.pop()
    try {
      const e = viewer.entities.getById(id)
      if (e) viewer.entities.remove(e)
    } catch {
      /* noop */
    }
  }
}

function syncPickMarkers() {
  clearPickMarkers()
  const viewer = getViewer()
  if (!viewer) return
  const f = planForm.value
  const entries = []
  if (Number.isFinite(f.startLon) && Number.isFinite(f.startLat)) {
    entries.push({
      id: `${PICK_MARKER_PREFIX}start`,
      lon: f.startLon,
      lat: f.startLat,
      text: '起点'
    })
  }
  f.waypoints.forEach((w, i) => {
    if (Number.isFinite(w.lon) && Number.isFinite(w.lat)) {
      entries.push({
        id: `${PICK_MARKER_PREFIX}wp-${i}`,
        lon: w.lon,
        lat: w.lat,
        text: w.name?.trim() || `途经${i + 1}`
      })
    }
  })
  if (Number.isFinite(f.endLon) && Number.isFinite(f.endLat)) {
    entries.push({
      id: `${PICK_MARKER_PREFIX}end`,
      lon: f.endLon,
      lat: f.endLat,
      text: '终点'
    })
  }
  for (const p of entries) {
    viewer.entities.add({
      id: p.id,
      position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
      billboard: {
        image: routePlanMarkerUrl,
        width: 40,
        height: 40,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: p.text,
        font: '13px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -46),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    pickMarkerIds.push(p.id)
  }
}

const landingOverlayVisible = ref(false)
const landingCard = ref(null)
const lonDisplay = ref(null)
const latDisplay = ref(null)
const landingScreenPos = ref({ x: 0, y: 0 })
const landingAnchorCartesian = ref(null)
let landingPostRenderHandler = null

function syncLandingOverlayPosition() {
  const viewer = getViewer()
  const anchor = landingAnchorCartesian.value
  if (!viewer || !anchor || !landingOverlayVisible.value) return
  const canvasCoords = viewer.scene.cartesianToCanvasCoordinates(anchor)
  if (!Cesium.defined(canvasCoords)) return
  const rect = viewer.canvas.getBoundingClientRect()
  landingScreenPos.value = {
    x: rect.left + canvasCoords.x,
    y: rect.top + canvasCoords.y
  }
}

function closeLandingCard() {
  landingOverlayVisible.value = false
  landingAnchorCartesian.value = null
  const viewer = getViewer()
  if (viewer && landingPostRenderHandler) {
    viewer.scene.postRender.removeEventListener(landingPostRenderHandler)
    landingPostRenderHandler = null
  }
}

const canExportKml = computed(
  () => lastPathSamples.value.length >= 2 && routeStore.currentRoute?.mode === 'session'
)

const midWaypointLabels = computed(() => {
  const r = routeStore.currentRoute
  if (!r?.midLabels?.length) return []
  return r.midLabels
})

function fmt(v) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(4)
}

function roundCoord4(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return n
  return Math.round(n * 10000) / 10000
}

function blurRoundPlanField(key) {
  const raw = planForm.value[key]
  if (raw == null || raw === '') return
  planForm.value[key] = roundCoord4(raw)
}

function blurRoundWaypoint(index, key) {
  const w = planForm.value.waypoints[index]
  if (!w) return
  const raw = w[key]
  if (raw == null || raw === '') return
  w[key] = roundCoord4(raw)
}

function normalizePlanCoordsTo4dp() {
  const f = planForm.value
  if (Number.isFinite(f.startLon)) f.startLon = roundCoord4(f.startLon)
  if (Number.isFinite(f.startLat)) f.startLat = roundCoord4(f.startLat)
  if (Number.isFinite(f.endLon)) f.endLon = roundCoord4(f.endLon)
  if (Number.isFinite(f.endLat)) f.endLat = roundCoord4(f.endLat)
  for (const w of f.waypoints) {
    if (Number.isFinite(w.lon)) w.lon = roundCoord4(w.lon)
    if (Number.isFinite(w.lat)) w.lat = roundCoord4(w.lat)
  }
}

function addWaypoint() {
  planForm.value.waypoints.push({ name: '', lon: null, lat: null })
}

function removeWaypoint(index) {
  planForm.value.waypoints.splice(index, 1)
}

async function loadAircraftModels() {
  try {
    const list = await aircraftStore.fetchActiveAircraftModels()
    aircraftModels.value = list.map((x) => x.modelName)
  } catch {
    aircraftModels.value = []
  }
}

function horizontalPointsFromForm() {
  const f = planForm.value
  const pts = [{ lon: f.startLon, lat: f.startLat }]
  for (const w of f.waypoints) {
    if (w.lon != null && w.lat != null && Number.isFinite(w.lon) && Number.isFinite(w.lat)) {
      pts.push({ lon: w.lon, lat: w.lat })
    }
  }
  pts.push({ lon: f.endLon, lat: f.endLat })
  return pts
}

async function generatePreview(silent = false) {
  const f = planForm.value
  if (
    !f.startName ||
    f.startLon == null ||
    f.startLat == null ||
    !f.endName ||
    f.endLon == null ||
    f.endLat == null
  ) {
    if (!silent) ElMessage.warning('请填写起点与终点')
    return
  }
  normalizePlanCoordsTo4dp()
  const cruise = Math.min(500, Math.max(50, Number(f.flightHeight) || 300))
  let zones = []
  try {
    const res = await getRiskZones()
    zones = res?.zones || []
  } catch {
    zones = []
  }

  const horizontal = horizontalPointsFromForm()
  const midLabels = horizontal.slice(1, -1).map((_, i) => f.waypoints[i]?.name || `途经${i + 1}`)
  const evotl = buildEvotlPath3D(horizontal, cruise, zones, {
    cruiseSamples: 340,
    verticalSteps: 22,
    cruiseSmoothPasses: 2,
    cruiseSmoothLambda: 0.15
  })
  const path = evotl.path
  const pathTubeSlices = evotl.pathTubeSlices
  const distKm = cumulativeDistanceKm(path)
  const windAlong = await fetchWindAlongPath(path)
  const totalKm = distKm[distKm.length - 1] || 0

  const waypointsForStore = path.map((p) => ({
    longitude: p.lon,
    latitude: p.lat,
    height: p.alt,
    name: ''
  }))

  const sessionRoute = {
    id: `session-${Date.now()}`,
    mode: 'session',
    startName: f.startName,
    endName: f.endName,
    flightHeight: cruise,
    aircraftModel: f.aircraftModel,
    pathSamples: path,
    distKm,
    windAlong,
    horizontalControls: horizontal,
    pathTubeSlices,
    midLabels,
    waypoints: waypointsForStore,
    length: totalKm,
    lengthText: `${totalKm.toFixed(2)} km`,
    segmentsText: `${path.length} 点`,
    averageRisk: 0,
    corridorRadiusM: 38
  }

  lastPathSamples.value = path
  routeStore.setCurrentRoute(sessionRoute)
  if (!silent) {
    routeStore.markVerticalProfileAfterPreview()
    ElMessage.success('已生成预览')
  }
}

let dragRaf = 0
function onControlMoved(e) {
  const { index, lon, lat } = e.detail || {}
  if (index == null || lon == null || lat == null) return
  const pts = horizontalPointsFromForm()
  const last = pts.length - 1
  if (index < 0 || index > last) return
  if (index === 0) {
    planForm.value.startLon = roundCoord4(lon)
    planForm.value.startLat = roundCoord4(lat)
  } else if (index === last) {
    planForm.value.endLon = roundCoord4(lon)
    planForm.value.endLat = roundCoord4(lat)
  } else {
    const wi = index - 1
    if (!planForm.value.waypoints[wi]) {
      planForm.value.waypoints.splice(wi, 0, { name: '', lon: roundCoord4(lon), lat: roundCoord4(lat) })
    } else {
      planForm.value.waypoints[wi].lon = roundCoord4(lon)
      planForm.value.waypoints[wi].lat = roundCoord4(lat)
    }
  }
  cancelAnimationFrame(dragRaf)
  dragRaf = requestAnimationFrame(() => generatePreview(true))
}

function exportKml() {
  if (!canExportKml.value) return
  const name = `${planForm.value.startName || 'route'}-${planForm.value.endName || ''}`
  const kml = buildKmlLineString(lastPathSamples.value, name)
  downloadKml(kml, `${name}.kml`)
}

function clearScreen() {
  routeStore.clearCurrentRoute()
  routeStore.clearRouteList()
  lastPathSamples.value = []
  heatmapStore.resetToDefault()
  clearPickMarkers()
}

function startMapSelection(target) {
  selectingPointTarget.value = target
  eventManager.unregisterClickHandlers()
  const handleMapClick = (viewer, movement) => {
    const cartesian = viewer.scene.pickPosition(movement.position)
    if (!cartesian) return false
    const cg = Cesium.Cartographic.fromCartesian(cartesian)
    const lon = Cesium.Math.toDegrees(cg.longitude)
    const lat = Cesium.Math.toDegrees(cg.latitude)
    fillSelectedCoordinates([lon, lat])
    stopMapSelection()
    openLandingCard(lon, lat)
    return true
  }
  eventManager.registerClickHandler(handleMapClick)
}

function fillSelectedCoordinates([longitude, latitude]) {
  const lon = roundCoord4(longitude)
  const lat = roundCoord4(latitude)
  const t = selectingPointTarget.value
  if (t === 'start') {
    planForm.value.startLon = lon
    planForm.value.startLat = lat
  } else if (t === 'end') {
    planForm.value.endLon = lon
    planForm.value.endLat = lat
  } else if (typeof t === 'string' && t.startsWith('waypoint_')) {
    const index = parseInt(t.split('_')[1], 10)
    if (planForm.value.waypoints[index]) {
      planForm.value.waypoints[index].lon = lon
      planForm.value.waypoints[index].lat = lat
    }
  }
}

function stopMapSelection() {
  selectingPointTarget.value = null
  eventManager.unregisterClickHandlers()
}

function formatLandingWeatherFromApi(payload) {
  if (!payload || typeof payload !== 'object') return null
  const mps = Number(payload.windSpeed)
  const kmh = Number.isFinite(mps) ? mps * 3.6 : NaN
  const windSpeed =
    Number.isFinite(mps)
      ? `${mps.toFixed(1)} m/s（${kmh.toFixed(1)} km/h）`
      : '—'
  const dir = payload.windDirection != null ? String(payload.windDirection) : '—'
  const visNum = Number(payload.visibility)
  const visibility = Number.isFinite(visNum) ? `${visNum} km` : '—'
  return { windSpeed, windDirScale: dir, visibility }
}

async function openLandingCard(lon, lat) {
  closeLandingCard()
  lonDisplay.value = lon
  latDisplay.value = lat
  landingCard.value = {
    altitudeText: '读取中…',
    windSpeed: '读取中…',
    windDirScale: '读取中…',
    visibility: '读取中…'
  }

  const viewer = getViewer()
  const weatherTask = (async () => {
    try {
      const res = await getWeatherByCoords(lon, lat)
      const formatted = formatLandingWeatherFromApi(res)
      if (
        formatted &&
        landingCard.value &&
        lonDisplay.value === lon &&
        latDisplay.value === lat
      ) {
        landingCard.value.windSpeed = formatted.windSpeed
        landingCard.value.windDirScale = formatted.windDirScale
        landingCard.value.visibility = formatted.visibility
      }
    } catch {
      if (landingCard.value && lonDisplay.value === lon && latDisplay.value === lat) {
        landingCard.value.windSpeed = '暂不可用'
        landingCard.value.windDirScale = '暂不可用'
        landingCard.value.visibility = '暂不可用'
      }
    }
  })()

  let altText = '地形高程暂不可用'
  let surfaceH = 0
  try {
    if (viewer?.terrainProvider) {
      const positions = [Cesium.Cartographic.fromDegrees(lon, lat)]
      await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions)
      const h = positions[0].height
      if (Number.isFinite(h)) {
        surfaceH = h
        altText = `${h.toFixed(1)} m`
      }
    }
  } catch {
    /* keep default */
  }
  if (landingCard.value) {
    landingCard.value.altitudeText = altText
  }
  await weatherTask

  const anchorH = Number.isFinite(surfaceH) ? surfaceH + 14 : 18
  landingAnchorCartesian.value = Cesium.Cartesian3.fromDegrees(lon, lat, anchorH)
  landingOverlayVisible.value = true

  nextTick(() => {
    syncLandingOverlayPosition()
    if (viewer && !landingPostRenderHandler) {
      landingPostRenderHandler = () => syncLandingOverlayPosition()
      viewer.scene.postRender.addEventListener(landingPostRenderHandler)
    }
  })
}

watch(
  planForm,
  () => {
    nextTick(syncPickMarkers)
  },
  { deep: true }
)

onMounted(() => {
  loadAircraftModels()
  window.addEventListener('session-route-control-moved', onControlMoved)
  nextTick(syncPickMarkers)
  setTimeout(syncPickMarkers, 600)
  setTimeout(syncPickMarkers, 2200)
})

onUnmounted(() => {
  stopMapSelection()
  closeLandingCard()
  window.removeEventListener('session-route-control-moved', onControlMoved)
  clearPickMarkers()
})
</script>

<style scoped lang="scss">
.route-list-container {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.clear-screen-btn {
  padding: 8px 14px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid #ef4444;
  color: #fecaca;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.export-kml-btn {
  padding: 8px 14px;
  background: #2563eb;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.plan-section,
.current-route-section {
  padding: 8px 12px 12px;
}

.section-title {
  margin-bottom: 8px;
  .title-bg {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(59, 130, 246, 0.25);
    border-radius: 4px;
    span {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
  }
}

.add-route-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  label {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  input {
    width: 100%;
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.5);
    color: #e2e8f0;
    font-size: 13px;
  }
}

.coordinate-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  input {
    flex: 1;
    min-width: 90px;
  }
}

.map-select-btn,
.remove-waypoint-btn,
.add-waypoint-btn {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
}

.waypoint-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.form-actions {
  margin-top: 6px;
}

.primary-btn {
  width: 100%;
  padding: 10px;
  background: #3b82f6;
  border: none;
  color: #fff;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
}

.current-route-info {
  font-size: 13px;
  color: #cbd5e1;
}

.route-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.path-arrow {
  color: #64748b;
}

.detail-item {
  margin-right: 12px;
}

.map-landing-overlay-root {
  position: fixed;
  z-index: 20000;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 18px));
}

.map-landing-card {
  pointer-events: auto;
  min-width: 260px;
  max-width: min(320px, 92vw);
  padding: 0;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(15, 23, 42, 0.6) inset;

  position: relative;
  overflow: hidden;
}

.map-landing-card-inner {
  position: relative;
  z-index: 1;
  padding: 14px 16px 16px;
  min-height: 100%;
  box-sizing: border-box;
  background: linear-gradient(
    165deg,
    rgba(15, 23, 42, 0.2) 0%,
    rgba(15, 23, 42, 0.55) 50%,
    rgba(15, 23, 42, 0.72) 100%
  );
}

.map-landing-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f1f5f9;
  margin-bottom: 10px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
}

.map-landing-card-inner p {
  margin: 5px 0;
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.map-landing-card-inner .lbl {
  display: inline-block;
  min-width: 4.5em;
  color: #94a3b8;
  font-weight: 600;
}

.map-landing-close {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.55);
  color: #f8fafc;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.map-landing-close:hover {
  background: rgba(239, 68, 68, 0.55);
}
</style>
