<template>
  <div class="mc-demo">
    <div ref="cesiumRef" class="mc-demo__map" />

    <aside class="mc-demo__hud">
      <header class="mc-demo__title">Phase 0 · DEMO-1 · MC 风险云团</header>
      <p class="mc-demo__subtitle">假 R_met · 分块 MC · 时间轴 · destroy/update</p>

      <dl class="mc-demo__metrics">
        <div><dt>FPS</dt><dd :class="{ warn: fps > 0 && fps < 30 }">{{ fps || '—' }}</dd></div>
        <div><dt>可见 Chunk</dt><dd>{{ layerStats.visibleChunks }} / {{ totalChunks }}</dd></div>
        <div><dt>Primitive</dt><dd>{{ layerStats.activePrimitives }}</dd></div>
        <div><dt>顶点</dt><dd>{{ layerStats.vertexCount.toLocaleString() }}</dd></div>
        <div><dt>三角面</dt><dd>{{ layerStats.triangleCount.toLocaleString() }}</dd></div>
        <div><dt>更新耗时</dt><dd>{{ layerStats.lastUpdateMs }} ms</dd></div>
        <div v-if="memory"><dt>Heap</dt><dd>{{ memory.used }} / {{ memory.total }} MB</dd></div>
      </dl>

      <label class="mc-demo__control">
        <span>时间步 {{ timeIndex + 1 }} / {{ timeLabels.length }}</span>
        <input
          type="range"
          min="0"
          :max="timeLabels.length - 1"
          step="1"
          v-model.number="timeIndex"
          @input="onTimeIndexInput"
        />
      </label>

      <label class="mc-demo__control">
        <span>等值面阈值 {{ isovalue.toFixed(2) }}</span>
        <input
          type="range"
          min="0.15"
          max="0.75"
          step="0.01"
          v-model.number="isovalue"
          @input="onIsovalueInput"
        />
      </label>

      <label class="mc-demo__check">
        <input type="checkbox" v-model="enableCulling" @change="onCullingChange" />
        视锥分块裁剪
      </label>

      <div class="mc-demo__actions">
        <button type="button" @click="togglePlay">{{ playing ? '暂停' : '播放' }}</button>
        <button type="button" @click="recreateLayer">重建 Layer</button>
        <button type="button" class="danger" @click="destroyLayer">destroy()</button>
        <button type="button" @click="runStressTest" :disabled="stressRunning">
          {{ stressRunning ? `压测 ${stressProgress}/20` : '内存压测 ×20' }}
        </button>
      </div>

      <p v-if="stressResult" class="mc-demo__stress">{{ stressResult }}</p>

      <footer class="mc-demo__foot">
        <a href="/dashboard">← 返回主系统</a>
        <span>G0-1 验证页 · 不接业务</span>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { McRiskLayer } from '@demos/cesium-mc-demo/core/McRiskLayer.js'
import { DEFAULT_VOLUME, getTimeLabels } from '@demos/cesium-mc-demo/core/fakeRMetVolume.js'
import {
  createDemoViewer,
  flyToVolume,
  FpsMonitor,
  readMemoryMb,
  setTimelineStep,
  setupDiscreteTimeline
} from '@demos/cesium-mc-demo/core/demoViewer.js'

const cesiumRef = ref(null)
const viewerRef = shallowRef(null)
const layerRef = shallowRef(null)
const fpsMonitorRef = shallowRef(null)
const timelineCleanup = shallowRef(null)

const volume = DEFAULT_VOLUME
const timeLabels = getTimeLabels(volume.timeSteps)
const totalChunks = 16

const fps = ref(0)
const memory = ref(null)
const timeIndex = ref(0)
const isovalue = ref(0.42)
const enableCulling = ref(true)
const playing = ref(false)
const layerStats = ref({
  visibleChunks: 0,
  activePrimitives: 0,
  vertexCount: 0,
  triangleCount: 0,
  lastUpdateMs: 0
})

const stressRunning = ref(false)
const stressProgress = ref(0)
const stressResult = ref('')

let playTimer = null
let memoryTimer = null
let cameraMoveDebounce = null

const applyTimeIndex = (index) => {
  if (!layerRef.value) return
  layerStats.value = layerRef.value.update({ timeIndex: index, reason: 'time' })
  if (viewerRef.value) {
    setTimelineStep(viewerRef.value, timeLabels, index)
  }
}

const initLayer = () => {
  if (!viewerRef.value) return
  layerRef.value?.destroy()
  const layer = new McRiskLayer()
  layerStats.value = layer.initialize(viewerRef.value, {
    volume,
    isovalue: isovalue.value,
    enableCulling: enableCulling.value,
    timeIndex: timeIndex.value,
    divisions: 4
  })
  layerRef.value = layer
}

const onTimeIndexInput = () => applyTimeIndex(timeIndex.value)

const onIsovalueInput = () => {
  if (layerRef.value) {
    layerStats.value = layerRef.value.setIsovalue(isovalue.value)
  }
}

const onCullingChange = () => {
  if (layerRef.value) {
    layerStats.value = layerRef.value.setEnableCulling(enableCulling.value)
  }
}

const togglePlay = () => {
  playing.value = !playing.value
  if (playing.value) {
    playTimer = setInterval(() => {
      timeIndex.value = (timeIndex.value + 1) % timeLabels.length
      applyTimeIndex(timeIndex.value)
    }, 900)
  } else if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

const recreateLayer = () => {
  initLayer()
}

const destroyLayer = () => {
  layerRef.value?.destroy()
  layerRef.value = null
  layerStats.value = {
    visibleChunks: 0,
    activePrimitives: 0,
    vertexCount: 0,
    triangleCount: 0,
    lastUpdateMs: 0
  }
}

const runStressTest = async () => {
  if (!layerRef.value || stressRunning.value) return
  stressRunning.value = true
  stressResult.value = ''
  const before = performance.memory?.usedJSHeapSize ?? 0

  for (let i = 0; i < 20; i++) {
    stressProgress.value = i + 1
    for (let t = 0; t < timeLabels.length; t++) {
      layerRef.value.update({ timeIndex: t, reason: 'stress' })
      await new Promise((r) => requestAnimationFrame(r))
    }
  }

  const after = performance.memory?.usedJSHeapSize ?? 0
  const deltaMb = before ? ((after - before) / 1048576).toFixed(1) : 'N/A'
  stressResult.value = `压测完成：20 轮 × ${timeLabels.length} 步；Heap Δ ${deltaMb} MB（Chrome 需 --enable-precise-memory-info 才精确）`
  stressRunning.value = false
}

onMounted(() => {
  const viewer = createDemoViewer(cesiumRef.value)
  viewerRef.value = viewer
  flyToVolume(viewer, volume)

  initLayer()

  timelineCleanup.value = setupDiscreteTimeline(viewer, timeLabels, (idx) => {
    if (timeIndex.value !== idx) {
      timeIndex.value = idx
      applyTimeIndex(idx)
    }
  })

  const fpsMon = new FpsMonitor(viewer)
  fpsMonitorRef.value = fpsMon
  const fpsTick = () => {
    fps.value = fpsMon.fps
    requestAnimationFrame(fpsTick)
  }
  fpsTick()

  memoryTimer = setInterval(() => {
    memory.value = readMemoryMb()
  }, 2000)

  viewer.camera.moveEnd.addEventListener(() => {
    clearTimeout(cameraMoveDebounce)
    cameraMoveDebounce = setTimeout(() => {
      if (layerRef.value) {
        layerStats.value = layerRef.value.update({ timeIndex: timeIndex.value, reason: 'camera' })
      }
    }, 120)
  })
})

onUnmounted(() => {
  if (playTimer) clearInterval(playTimer)
  if (memoryTimer) clearInterval(memoryTimer)
  clearTimeout(cameraMoveDebounce)
  timelineCleanup.value?.()
  fpsMonitorRef.value?.destroy()
  layerRef.value?.destroy()
  viewerRef.value?.destroy()
  viewerRef.value = null
})
</script>

<style scoped>
.mc-demo {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0b1020;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.mc-demo__map {
  width: 100%;
  height: 100%;
}

.mc-demo__hud {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 300px;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px;
  border-radius: 12px;
  background: rgba(8, 14, 28, 0.88);
  border: 1px solid rgba(120, 160, 220, 0.25);
  color: #e8eef8;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.mc-demo__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mc-demo__subtitle {
  margin: 6px 0 14px;
  font-size: 12px;
  color: #8fa3c4;
}

.mc-demo__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  margin: 0 0 16px;
  font-size: 12px;
}

.mc-demo__metrics div {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.mc-demo__metrics dt {
  margin: 0;
  color: #8fa3c4;
}

.mc-demo__metrics dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.mc-demo__metrics dd.warn {
  color: #ff8a65;
}

.mc-demo__control {
  display: block;
  margin-bottom: 12px;
  font-size: 12px;
}

.mc-demo__control span {
  display: block;
  margin-bottom: 4px;
  color: #b8c8e0;
}

.mc-demo__control input[type='range'] {
  width: 100%;
}

.mc-demo__check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #b8c8e0;
}

.mc-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mc-demo__actions button {
  flex: 1 1 calc(50% - 4px);
  padding: 8px 10px;
  border: 1px solid rgba(120, 160, 220, 0.35);
  border-radius: 8px;
  background: rgba(40, 70, 120, 0.45);
  color: #e8eef8;
  font-size: 12px;
  cursor: pointer;
}

.mc-demo__actions button:hover {
  background: rgba(60, 100, 160, 0.55);
}

.mc-demo__actions button.danger {
  border-color: rgba(255, 100, 80, 0.5);
  background: rgba(120, 40, 30, 0.5);
}

.mc-demo__actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mc-demo__stress {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #a8c4e8;
}

.mc-demo__foot {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(120, 160, 220, 0.15);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #6d849e;
}

.mc-demo__foot a {
  color: #7eb6ff;
  text-decoration: none;
}
</style>

<style>
/* Cesium timeline above HUD z-index */
.mc-demo .cesium-viewer-bottom {
  z-index: 5;
}
</style>
