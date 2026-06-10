<template>
  <div class="wind-field-demo">
    <div ref="cesiumRef" class="wind-field-demo__map" />

    <aside class="wind-field-demo__height-rail" aria-label="高度选择">
      <span class="wind-field-demo__height-title">高度</span>
      <div class="wind-field-demo__height-track">
        <div class="wind-field-demo__height-ticks">
          <span
            v-for="h in heightLevelsDesc"
            :key="h"
            class="wind-field-demo__height-tick"
            :class="{ 'is-active': h === heightM }"
          >{{ h }}m</span>
        </div>
        <input
          type="range"
          class="wind-field-demo__height-range"
          min="0"
          :max="heightLevels.length - 1"
          step="1"
          :value="heightSliderIndex"
          @input="onHeightSlider"
        />
      </div>
      <div class="wind-field-demo__height-value">{{ heightM }} m</div>
    </aside>

    <aside class="wind-field-demo__hud">
      <header class="wind-field-demo__title">风场粒子 Demo（生产链路）</header>
      <p class="wind-field-demo__subtitle">GET /wind-field · NetCDF · cesium-wind-layer</p>

      <p v-if="loading" class="wind-field-demo__status loading">{{ loadingText }}</p>
      <p v-else-if="error" class="wind-field-demo__status error">{{ error }}</p>
      <dl v-else class="wind-field-demo__metrics">
        <div><dt>数据源</dt><dd>后端 /wind-field</dd></div>
        <div><dt>区域</dt><dd>{{ regionName }} ({{ regionId || '—' }})</dd></div>
        <div><dt>高度</dt><dd>{{ heightM }} m</dd></div>
        <div><dt>网格</dt><dd>{{ gridLabel }}</dd></div>
        <div><dt>风速范围</dt><dd>{{ speedRangeLabel }}</dd></div>
        <div><dt>数据时间</dt><dd>{{ dataTimeLabel }}</dd></div>
        <div><dt>渲染</dt><dd>WebGL 粒子</dd></div>
      </dl>

      <label class="wind-field-demo__control">
        <span>粒子密度 {{ particlesTextureSize }}</span>
        <input
          type="range"
          min="64"
          max="160"
          step="8"
          v-model.number="particlesTextureSize"
          @input="onOptionsChange"
        />
      </label>

      <div class="wind-field-demo__actions">
        <button type="button" @click="reload" :disabled="loading">重新加载</button>
        <button type="button" class="danger" @click="clearLayer" :disabled="!controllerRef">清除图层</button>
      </div>

      <footer class="wind-field-demo__foot">
        <a href="#/dashboard">← 返回主系统</a>
        <a href="/wind-demo/index.html">Canvas 风场 Demo</a>
        <span>需后端运行且存在 uwnd.nc / vwnd.nc</span>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import * as Cesium from 'cesium';
import { createDemoViewer } from '@demos/shared/demoViewer.js';
import {
  WindFieldLayerController,
  resolveWindFieldPayload,
} from '@demos/cesium-wind-field-demo/core/windFieldLayer.js';
import { getWindData } from '@/api/weather';
import { fetchDefaultRegion } from '@/api/v2/region';
import { HEIGHT_LEVELS_M, MET_VIZ_WIND_OPTIONS } from '@/met-viz/constants';

const cesiumRef = ref(null);
const viewerRef = shallowRef(null);
const controllerRef = shallowRef(null);

const loading = ref(false);
const loadingText = ref('正在加载…');
const error = ref('');
const regionId = ref('');
const regionName = ref('—');
const heightM = ref(100);
const gridLabel = ref('—');
const speedRangeLabel = ref('—');
const dataTimeLabel = ref('—');
const particlesTextureSize = ref(MET_VIZ_WIND_OPTIONS.particlesTextureSize);

const heightLevels = HEIGHT_LEVELS_M;
const heightLevelsDesc = [...HEIGHT_LEVELS_M].reverse();
let heightDebounceTimer = null;

const heightSliderIndex = computed(() => {
  const idx = heightLevels.indexOf(heightM.value);
  return idx >= 0 ? idx : 0;
});

function flyToRegion(viewer, region) {
  const lng = Number(region?.centerLng ?? 120.38);
  const lat = Number(region?.centerLat ?? 36.07);
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 180000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-55),
      roll: 0,
    },
  });
}

function buildWindOptions() {
  return {
    ...MET_VIZ_WIND_OPTIONS,
    particlesTextureSize: particlesTextureSize.value,
  };
}

function updateMetrics(payload) {
  const { windData, meta } = payload;
  gridLabel.value = `${windData.width} × ${windData.height}`;
  const speed = windData.speed;
  if (speed && Number.isFinite(speed.min) && Number.isFinite(speed.max)) {
    speedRangeLabel.value = `${speed.min.toFixed(2)} ~ ${speed.max.toFixed(2)} m/s`;
  } else {
    speedRangeLabel.value = '—';
  }
  dataTimeLabel.value = meta?.time || '—';
}

function clearLayer() {
  controllerRef.value?.destroy();
  controllerRef.value = null;
  gridLabel.value = '—';
  speedRangeLabel.value = '—';
  dataTimeLabel.value = '—';
}

function scheduleReload() {
  clearTimeout(heightDebounceTimer);
  heightDebounceTimer = setTimeout(() => reload(), 280);
}

function onHeightSlider(event) {
  const idx = Number(event.target.value);
  heightM.value = heightLevels[idx] ?? heightLevels[0];
  scheduleReload();
}

function onOptionsChange() {
  const controller = controllerRef.value;
  const viewer = viewerRef.value;
  if (!controller || !viewer) return;
  controller.baseOptions = buildWindOptions();
  reload();
}

async function reload() {
  const viewer = viewerRef.value;
  if (!viewer || !regionId.value) return;

  loading.value = true;
  loadingText.value = `正在请求 /wind-field @ ${heightM.value}m…`;
  error.value = '';

  try {
    const raw = await getWindData({
      regionId: regionId.value,
      heightM: heightM.value,
      time: 'now',
    });

    const payload = resolveWindFieldPayload(raw);
    if (!payload) {
      throw new Error('接口返回无有效 windData（检查后端 NetCDF 是否就绪）');
    }

    if (!controllerRef.value) {
      controllerRef.value = new WindFieldLayerController(viewer, buildWindOptions());
    } else {
      controllerRef.value.baseOptions = buildWindOptions();
    }

    controllerRef.value.upsert(payload);
    updateMetrics(payload);
  } catch (err) {
    console.error('[WindFieldDemo]', err);
    error.value = err?.message || '加载失败（请确认后端已启动且 wind NC 文件存在）';
    clearLayer();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const viewer = createDemoViewer(cesiumRef.value);
  viewerRef.value = viewer;
  viewer.scene.debugShowFramesPerSecond = true;

  loading.value = true;
  loadingText.value = '正在获取默认 Region…';

  try {
    const region = await fetchDefaultRegion();
    regionId.value = region.regionId;
    regionName.value = region.name || region.regionId;
    flyToRegion(viewer, region);
    await reload();
  } catch (err) {
    console.error('[WindFieldDemo] init', err);
    error.value = err?.message || 'Region 或风场接口不可用';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  clearTimeout(heightDebounceTimer);
  controllerRef.value?.destroy();
  controllerRef.value = null;
  viewerRef.value?.destroy();
  viewerRef.value = null;
});
</script>

<style scoped>
.wind-field-demo {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0b1a2a;
}

.wind-field-demo__map {
  width: 100%;
  height: 100%;
}

.wind-field-demo__hud {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  width: min(360px, calc(100vw - 120px));
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(8, 20, 36, 0.88);
  color: #d7ecff;
  font: 13px/1.5 'Segoe UI', sans-serif;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}

.wind-field-demo__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.wind-field-demo__subtitle {
  margin: 0 0 12px;
  font-size: 12px;
  color: #9ec7e8;
}

.wind-field-demo__status {
  margin: 0;
  padding: 8px 0;
}

.wind-field-demo__status.loading {
  color: #9ec7e8;
}

.wind-field-demo__status.error {
  color: #ffb4b4;
}

.wind-field-demo__metrics {
  display: grid;
  gap: 6px;
  margin: 0 0 12px;
}

.wind-field-demo__metrics div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.wind-field-demo__metrics dt {
  margin: 0;
  color: #7ea8c8;
}

.wind-field-demo__metrics dd {
  margin: 0;
  text-align: right;
}

.wind-field-demo__control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.wind-field-demo__control input[type='range'] {
  width: 100%;
  accent-color: #4db3ff;
}

.wind-field-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.wind-field-demo__actions button {
  padding: 6px 12px;
  border: 1px solid rgba(125, 196, 255, 0.35);
  border-radius: 6px;
  background: rgba(30, 72, 110, 0.65);
  color: #e8f4ff;
  cursor: pointer;
  font-size: 12px;
}

.wind-field-demo__actions button:hover:not(:disabled) {
  background: rgba(45, 98, 145, 0.85);
}

.wind-field-demo__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wind-field-demo__actions button.danger {
  border-color: rgba(255, 120, 120, 0.45);
  background: rgba(120, 36, 36, 0.55);
}

.wind-field-demo__foot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(125, 196, 255, 0.15);
  font-size: 11px;
  color: #7ea8c8;
}

.wind-field-demo__foot a {
  color: #7ec8ff;
  text-decoration: none;
}

.wind-field-demo__foot a:hover {
  text-decoration: underline;
}

.wind-field-demo__height-rail {
  position: absolute;
  right: 18px;
  top: 50%;
  z-index: 10;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border-radius: 10px;
  background: rgba(8, 20, 36, 0.88);
  color: #d7ecff;
  font: 12px/1.4 'Segoe UI', sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  user-select: none;
}

.wind-field-demo__height-title {
  font-weight: 600;
}

.wind-field-demo__height-track {
  display: flex;
  align-items: stretch;
  gap: 8px;
  height: 220px;
}

.wind-field-demo__height-ticks {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #7a9bb8;
  text-align: right;
  min-width: 3.2em;
}

.wind-field-demo__height-tick.is-active {
  color: #4db3ff;
  font-weight: 600;
}

.wind-field-demo__height-range {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 28px;
  accent-color: #4db3ff;
  cursor: pointer;
}

.wind-field-demo__height-value {
  color: #9ec7e8;
  font-variant-numeric: tabular-nums;
}

.wind-field-demo :deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
