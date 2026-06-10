<template>
  <div class="kriging-demo">
    <div ref="cesiumRef" class="kriging-demo__map" />

    <aside class="kriging-demo__height-rail" aria-label="高度选择">
      <span class="kriging-demo__height-title">高度</span>
      <div class="kriging-demo__height-track">
        <div class="kriging-demo__height-ticks">
          <span
            v-for="h in heightLevelsDesc"
            :key="h"
            class="kriging-demo__height-tick"
            :class="{ 'is-active': h === heightM }"
          >{{ h }}m</span>
        </div>
        <input
          type="range"
          class="kriging-demo__height-range"
          min="0"
          :max="heightLevels.length - 1"
          step="1"
          :value="heightSliderIndex"
          @input="onHeightSlider"
        />
      </div>
      <div class="kriging-demo__height-value">{{ heightM }} m</div>
    </aside>

    <aside class="kriging-demo__legend" aria-label="色标图例">
      <div class="kriging-demo__legend-labels">
        <span>{{ legendMaxLabel }}</span>
        <span>{{ legendMinLabel }}</span>
      </div>
      <div class="kriging-demo__legend-bar" :style="{ background: legendGradient }" />
      <div class="kriging-demo__legend-title">{{ currentProductLabel }}</div>
    </aside>

    <aside class="kriging-demo__hud">
      <header class="kriging-demo__title">气象格点插值 Demo</header>
      <p class="kriging-demo__subtitle">全要素可选 · 高度切片 · 风速仅标量填色</p>

      <p v-if="loading" class="kriging-demo__status loading">{{ loadingText }}</p>
      <p v-else-if="error" class="kriging-demo__status error">{{ error }}</p>
      <dl v-else class="kriging-demo__metrics">
        <div><dt>数据源</dt><dd>GET /weather/grid-field</dd></div>
        <div><dt>区域</dt><dd>{{ regionName }} ({{ regionId }})</dd></div>
        <div><dt>要素</dt><dd>{{ currentProductLabel }}</dd></div>
        <div><dt>高度</dt><dd>{{ heightM }} m</dd></div>
        <div><dt>数值范围</dt><dd>{{ valueRangeLabel }}</dd></div>
        <div><dt>时间桶</dt><dd>{{ bucketTimeLabel }}</dd></div>
      </dl>

      <label class="kriging-demo__control">
        <span>气象要素</span>
        <select v-model="product" @change="onProductChange">
          <option v-for="p in productOptions" :key="p.id" :value="p.id">
            {{ p.label }} ({{ p.unit }})
          </option>
        </select>
      </label>

      <label class="kriging-demo__control">
        <span>图层透明度 {{ Math.round(alpha * 100) }}%</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          v-model.number="alpha"
          @input="onAlphaChange"
        />
      </label>

      <div class="kriging-demo__actions">
        <button type="button" @click="reload" :disabled="loading">重新加载</button>
        <button type="button" class="danger" @click="clearLayer">清除图层</button>
      </div>

      <footer class="kriging-demo__foot">
        <a href="#/dashboard">← 返回主系统</a>
        <span>独立 KrigingGridLayer（不影响生产大屏）</span>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'
import { createDemoViewer } from '@demos/shared/demoViewer.js'
import { fetchDefaultRegion } from '@/api/v2/region'
import { HEIGHT_LEVELS_M, MET_PRODUCTS } from '@demos/shared/met-viz/constants'
import { getColormap } from '@demos/shared/met-viz/core/colormaps'
import { KrigingGridLayer } from '@demos/shared/met-viz/layers/KrigingGridLayer'

const IMAGERY_IDS = ['temperature', 'wind', 'visibility', 'precipitation', 'humidity', 'cloud', 'pressure']

const productOptions = MET_PRODUCTS.filter((p) => IMAGERY_IDS.includes(p.id)).map((p) => {
  const colormap = getColormap(p.id === 'precipitation' ? 'precip' : p.id)
  return { ...p, unit: colormap.unit }
})

function normalizeProductId(id) {
  const key = String(id || 'temperature').toLowerCase()
  if (key === 'precip' || key === 'precipitation') return 'precipitation'
  return IMAGERY_IDS.includes(key) ? key : 'temperature'
}

function apiProduct(id) {
  return id === 'precipitation' ? 'precip' : id
}

function formatLegendValue(value, productId) {
  const colormap = getColormap(productId === 'precipitation' ? 'precip' : productId)
  if (!Number.isFinite(value)) return '—'
  if (productId === 'visibility') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`
  }
  if (productId === 'pressure' || productId === 'humidity' || productId === 'cloud') {
    return `${value.toFixed(0)}${colormap.unit}`
  }
  return `${value.toFixed(1)}${colormap.unit}`
}

function buildLegendGradient(productId) {
  const colormap = getColormap(productId === 'precipitation' ? 'precip' : productId)
  const parts = colormap.stops.map((s) => `${s.color} ${Math.round(s.stop * 100)}%`)
  return `linear-gradient(to top, ${parts.join(', ')})`
}

const route = useRoute()
const cesiumRef = ref(null)
const viewerRef = shallowRef(null)
const layerRef = shallowRef(null)

const loading = ref(false)
const loadingText = ref('正在加载…')
const error = ref('')
const alpha = ref(0.72)
const regionId = ref('')
const regionName = ref('—')
const product = ref('temperature')
const heightM = ref(100)
const valueRangeLabel = ref('—')
const bucketTimeLabel = ref('—')

const heightLevels = HEIGHT_LEVELS_M
const heightLevelsDesc = [...HEIGHT_LEVELS_M].reverse()
let heightDebounceTimer = null

const heightSliderIndex = computed(() => {
  const idx = heightLevels.indexOf(heightM.value)
  return idx >= 0 ? idx : 0
})

const currentProductLabel = computed(
  () => productOptions.find((p) => p.id === product.value)?.label || product.value,
)

const legendGradient = computed(() => buildLegendGradient(product.value))

const legendMinLabel = computed(() => {
  const colormap = getColormap(product.value === 'precipitation' ? 'precip' : product.value)
  return formatLegendValue(colormap.vmin, product.value)
})

const legendMaxLabel = computed(() => {
  const colormap = getColormap(product.value === 'precipitation' ? 'precip' : product.value)
  return formatLegendValue(colormap.vmax, product.value)
})

function flyToRegion(viewer, region) {
  const lng = Number(region?.centerLng ?? 120.38)
  const lat = Number(region?.centerLat ?? 36.07)
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 180000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-55),
      roll: 0,
    },
  })
}

function clearLayer() {
  layerRef.value?.clear()
}

function onAlphaChange() {
  layerRef.value?.setAlpha(alpha.value)
}

function scheduleReload() {
  clearTimeout(heightDebounceTimer)
  heightDebounceTimer = setTimeout(() => reload(), 280)
}

function onHeightSlider(event) {
  const idx = Number(event.target.value)
  heightM.value = heightLevels[idx] ?? heightLevels[0]
  scheduleReload()
}

function onProductChange() {
  scheduleReload()
}

async function reload() {
  const viewer = viewerRef.value
  const layer = layerRef.value
  if (!viewer || !layer || !regionId.value) return

  loading.value = true
  loadingText.value = `正在加载 ${heightM.value}m ${currentProductLabel.value}…`
  error.value = ''

  try {
    layer.setAlpha(alpha.value)
    await layer.update({
      regionId: regionId.value,
      product: apiProduct(product.value),
      heightM: heightM.value,
      time: 'now',
    })
    bucketTimeLabel.value = '见控制台 KrigingGridLayer 日志'
    valueRangeLabel.value = '见控制台日志'
  } catch (err) {
    console.error('[KrigingDemo]', err)
    error.value = err?.message || '加载失败（请确认后端已启动且 Flyway V21 种子已写入）'
  } finally {
    loading.value = false
  }
}

const FALLBACK_REGION = {
  regionId: 'R2',
  name: '青岛',
  centerLng: 120.38,
  centerLat: 36.07,
}

onMounted(async () => {
  await nextTick()

  if (!cesiumRef.value) {
    error.value = '地图容器未就绪'
    return
  }

  const viewer = createDemoViewer(cesiumRef.value)
  viewerRef.value = viewer
  const layer = new KrigingGridLayer(viewer)
  layerRef.value = layer

  regionId.value = String(route.query.regionId || FALLBACK_REGION.regionId)
  product.value = normalizeProductId(route.query.product)
  const fromQuery = Number(route.query.heightM)
  heightM.value = heightLevels.includes(fromQuery) ? fromQuery : heightLevels[0]

  let region = FALLBACK_REGION
  try {
    region = await fetchDefaultRegion()
    regionId.value = route.query.regionId || region.regionId || region.id || FALLBACK_REGION.regionId
    regionName.value = region.name || regionId.value
  } catch (err) {
    console.warn('[KrigingDemo] 后端 Region 不可用，使用本地回退', err)
    regionName.value = `${FALLBACK_REGION.name}（离线回退）`
  }

  flyToRegion(viewer, region)
  viewer.resize()
  await reload()
})

onUnmounted(() => {
  layerRef.value?.destroy()
  layerRef.value = null
  viewerRef.value?.destroy()
  viewerRef.value = null
})
</script>

<style scoped>
.kriging-demo {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0b1a2a;
}

.kriging-demo__map {
  width: 100%;
  height: 100%;
}

.kriging-demo__hud {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 10;
  width: 320px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(8, 20, 36, 0.88);
  color: #d7ecff;
  font: 13px/1.5 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);
}

.kriging-demo__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.kriging-demo__subtitle {
  margin: 0 0 12px;
  color: #9ec7e8;
  font-size: 12px;
}

.kriging-demo__status {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.kriging-demo__status.loading {
  background: rgba(77, 179, 255, 0.12);
  color: #9ed8ff;
}

.kriging-demo__status.error {
  background: rgba(255, 96, 96, 0.15);
  color: #ffb4b4;
}

.kriging-demo__metrics {
  display: grid;
  gap: 6px;
  margin: 0 0 12px;
}

.kriging-demo__metrics div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.kriging-demo__metrics dt {
  color: #8eb6d4;
}

.kriging-demo__metrics dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.kriging-demo__control {
  display: block;
  margin-bottom: 10px;
}

.kriging-demo__control span {
  display: block;
  margin-bottom: 4px;
  color: #9ec7e8;
  font-size: 12px;
}

.kriging-demo__control select,
.kriging-demo__control input[type='range'] {
  width: 100%;
  accent-color: #4db3ff;
}

.kriging-demo__control select {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(126, 200, 255, 0.35);
  background: rgba(20, 48, 78, 0.85);
  color: #d7ecff;
  font: inherit;
}

.kriging-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.kriging-demo__actions button {
  padding: 6px 12px;
  border: 1px solid rgba(125, 196, 255, 0.35);
  border-radius: 6px;
  background: rgba(30, 72, 110, 0.65);
  color: #e8f4ff;
  cursor: pointer;
  font-size: 12px;
}

.kriging-demo__actions button:hover:not(:disabled) {
  background: rgba(45, 98, 145, 0.85);
}

.kriging-demo__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.kriging-demo__actions button.danger {
  border-color: rgba(255, 120, 120, 0.45);
  background: rgba(120, 36, 36, 0.55);
}

.kriging-demo__foot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(125, 196, 255, 0.15);
  font-size: 11px;
  color: #7ea8c8;
}

.kriging-demo__foot a {
  color: #7ec8ff;
  text-decoration: none;
}

.kriging-demo__foot a:hover {
  text-decoration: underline;
}

.kriging-demo__height-rail {
  position: absolute;
  top: 50%;
  right: 16px;
  z-index: 10;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 10px;
  border-radius: 12px;
  background: rgba(8, 20, 36, 0.88);
  border: 1px solid rgba(126, 200, 255, 0.22);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38);
  color: #d7ecff;
  font-size: 12px;
  user-select: none;
}

.kriging-demo__height-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #8fb8d8;
  writing-mode: vertical-rl;
}

.kriging-demo__height-track {
  position: relative;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kriging-demo__height-ticks {
  position: absolute;
  right: 28px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.kriging-demo__height-tick {
  min-width: 42px;
  font-size: 11px;
  color: #6f95b5;
  text-align: right;
  transition: color 0.15s;
}

.kriging-demo__height-tick.is-active {
  color: #4db3ff;
  font-weight: 600;
}

.kriging-demo__height-range {
  width: 220px;
  height: 6px;
  margin: 0;
  transform: rotate(-90deg);
  accent-color: #4db3ff;
  cursor: pointer;
}

.kriging-demo__height-value {
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(77, 179, 255, 0.14);
  color: #9ec7e8;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  min-width: 56px;
  text-align: center;
}

.kriging-demo__legend {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(8, 20, 36, 0.88);
  border: 1px solid rgba(126, 200, 255, 0.22);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38);
  color: #d7ecff;
  font-size: 12px;
}

.kriging-demo__legend-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  color: #8fb8d8;
  font-variant-numeric: tabular-nums;
  min-width: 48px;
  text-align: right;
}

.kriging-demo__legend-bar {
  width: 18px;
  height: 160px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.kriging-demo__legend-title {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  font-weight: 600;
  color: #9ec7e8;
  letter-spacing: 0.06em;
  align-self: center;
}
</style>
