<template>
  <div class="control-panel">

    <!-- ================= 图层控制 ================= -->
    <div class="control-section" v-if="layerSettingsStore">
      <div class="section-header" @click="toggleSection('layers')">
        <h3>图层控制</h3>
        <span class="toggle-icon">{{ expandedSections.layers ? '−' : '+' }}</span>
      </div>

      <div v-show="expandedSections.layers" class="section-content">
        <div v-for="(layer, key) in (layerSettingsStore?.layers || {})" :key="key" class="layer-item">
          <div class="layer-row">
            <span class="layer-name">{{ layer.name }}</span>
            <label class="switch">
              <input type="checkbox" :checked="layer.visible" @change="toggleLayerVisibility(key, $event)" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 风场控制 ================= -->
    <div class="control-section">
      <div class="section-header" @click="toggleSection('wind')">
        <h3>风场控制</h3>
        <span class="toggle-icon">{{ expandedSections.wind ? '−' : '+' }}</span>
      </div>

      <div v-show="expandedSections.wind" class="section-content">

        <!-- 粒子密度 -->
        <div class="control-group">
          <label class="control-label">
            粒子密度
            <div class="help-tooltip">
              <span class="help-icon">?</span>
              <span class="tooltip-text">调整风场粒子的密度，数值越大粒子越多</span>
            </div>
          </label>
          <div class="slider-input-group">
            <input type="range" min="1" max="100" step="1" v-model.number="localOptions.particlesTextureSize" />
            <input type="number" min="1" max="100" step="1" v-model.number="localOptions.particlesTextureSize"
              class="num-input" />
          </div>
        </div>

        <!-- 速度因子 -->
        <div class="control-group">
          <label class="control-label">
            速度因子
            <div class="help-tooltip">
              <span class="help-icon">?</span>
              <span class="tooltip-text">调整风场粒子的移动速度，数值越大速度越快</span>
            </div>
          </label>
          <div class="slider-input-group">
            <input type="range" min="0" max="1" step="0.01" v-model.number="localOptions.speedFactor" />
            <input type="number" min="0" max="1" step="0.01" v-model.number="localOptions.speedFactor"
              class="num-input" />
          </div>
        </div>

        <!-- 线宽范围 -->
        <div class="control-group">
          <label class="control-label">
            线宽范围
            <div class="help-tooltip">
              <span class="help-icon">?</span>
              <span class="tooltip-text">调整风场粒子轨迹线的宽度范围</span>
            </div>
          </label>
          <div class="range-inputs">
            <input type="number" min="0" max="0.1" step="0.001" v-model.number="localOptions.lineWidth.min"
              class="num-input" />
            <input type="number" min="0" max="0.1" step="0.001" v-model.number="localOptions.lineWidth.max"
              class="num-input" />
          </div>
        </div>

        <!-- 线条长度 -->
        <div class="control-group">
          <label class="control-label">
            线条长度
            <div class="help-tooltip">
              <span class="help-icon">?</span>
              <span class="tooltip-text">调整风场粒子轨迹线的长度范围</span>
            </div>
          </label>
          <div class="range-inputs">
            <input type="number" min="0" max="10" step="0.01" v-model.number="localOptions.lineLength.min"
              class="num-input" />
            <input type="number" min="0" max="10" step="0.01" v-model.number="localOptions.lineLength.max"
              class="num-input" />
          </div>
        </div>

        <!-- 显示速度范围 -->
        <div class="control-group">
          <label class="control-label">
            显示速度范围
            <div class="help-tooltip">
              <span class="help-icon">?</span>
              <span class="tooltip-text">调整风场显示的风速范围，超出范围的风速将被过滤</span>
            </div>
          </label>
          <div class="range-inputs">
            <input type="number" min="0" max="100" step="0.1" v-model.number="localOptions.displayRange.min"
              class="num-input" />
            <input type="number" min="0" max="100" step="0.1" v-model.number="localOptions.displayRange.max"
              class="num-input" />
          </div>
        </div>

        <button class="reset-button" @click="resetToDefaults">
          重置为默认值
        </button>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch  } from 'vue'
import type { WindLayer, WindLayerOptions } from 'cesium-wind-layer'
import { WIND_LAYER_DEFAULTS } from '@/config/windLayerDefaults'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'

/* ================= props ================= */

const props = defineProps<{
  windLayer: WindLayer | null
}>()

/* ================= emit ================= */

// 定义emit事件
const emit = defineEmits<{
  (e: "options-change", options: Partial<WindLayerOptions>): void;
  (e: "layer-visibility-change"): void; // 新增图层可见性变化事件
}>();

/* ================= store ================= */

const layerSettingsStore = useLayerSettingsStore()

/* ================= panel ================= */

const expandedSections = reactive({
  layers: true,
  wind: true
})

const toggleSection = (key: keyof typeof expandedSections) => {
  expandedSections[key] = !expandedSections[key]
}

/* ================= 图层控制 ================= */

const toggleLayerVisibility = (key: string, e: Event) => {
  const visible = (e.target as HTMLInputElement).checked
  layerSettingsStore.setLayerVisibility(key, visible)
  layerSettingsStore.saveSettingsToLocal()
  // 通知父组件更新地图显示
  emit("layer-visibility-change")
}

/* ================= 风场参数 ================= */

const localOptions = reactive<WindLayerOptions>({
  ...WIND_LAYER_DEFAULTS,
})
const applyOptions = (changedOptions: Partial<WindLayerOptions>) => {
  if (props.windLayer) {
    const layers = Array.isArray(props.windLayer)
      ?
      props.windLayer
      :
      [props.windLayer.value];
    layers.forEach(layer => layer?.updateOptions?.(changedOptions));
  }
  emit("optionsChange", changedOptions);
  layerSettingsStore.updateWindOptions(changedOptions);
  layerSettingsStore.saveSettingsToLocal();
}

/* 单值参数 */

watch(() => localOptions.speedFactor, v =>
  applyOptions({ speedFactor: v })
)

watch(() => localOptions.particlesTextureSize, v =>
  applyOptions({ particlesTextureSize: v })
)

/* range 参数 */

watch(() => localOptions.lineWidth, v => {
  v.min = Math.min(v.min, v.max)
  v.max = Math.max(v.max, v.min)
  applyOptions({ lineWidth: { ...v } })
}, { deep: true })

watch(() => localOptions.lineLength, v => {
  v.min = Math.min(v.min, v.max)
  v.max = Math.max(v.max, v.min)
  applyOptions({ lineLength: { ...v } })
}, { deep: true })

watch(() => localOptions.displayRange, v => {
  v.min = Math.min(v.min, v.max)
  v.max = Math.max(v.max, v.min)
  applyOptions({ displayRange: { ...v } })
}, { deep: true })

/* windLayer变化时更新 */

watch(() => props.windLayer, (newLayer) => {
  if (newLayer) {
    applyOptions(localOptions)
  }
}, { immediate: true })

/* reset */

const resetToDefaults = () => {
  Object.assign(localOptions, WIND_LAYER_DEFAULTS)
  applyOptions(WIND_LAYER_DEFAULTS)
}
</script>


<style scoped>
.control-panel {
  width: 300px;
  position: absolute;
  top: 80px;
  left: 20px;
  background: #0f1733 url("@/assets/images/bg_dialog.png") center/cover no-repeat;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 320px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 控制区域 */
.control-section {
  margin-bottom: 10px;
}

/* 标题栏样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 15px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.section-header:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.section-header:active {
  background-color: rgba(255, 255, 255, 0.2);
}

.section-header h3 {
  margin: 0;
  color: #fff;
  font-size: 23px;
  font-weight: 600;
  font-family: "AiDeepFont";
}

.toggle-icon {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.section-header:hover .toggle-icon {
  transform: scale(1.2);
}

/* 面板内容区 */
.section-content {
  margin-bottom: 20px;
}

/* 图层项样式 */
.layer-item {
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.layer-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.layer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-name {
  color: #fff;
  font-size: 14px;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked+.slider {
  background-color: #1890ff;
}

input:checked+.slider:before {
  transform: translateX(20px);
}

/* 控制项通用样式 */
.control-group {
  margin-bottom: 15px;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 13px;
  color: #fff;
}

/* 滑块+输入框组合 */
.slider-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.slider-input-group input[type="range"] {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
}

.slider-input-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1890ff;
  cursor: pointer;
}

/* 范围类参数布局 */
.range-inputs {
  display: flex;
  gap: 15px;
}

/* 数值输入框样式 */
.num-input {
  flex: 1;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #022848;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
  text-align: center;
  outline: none;
  transition: all 0.3s ease;
}

.num-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 帮助提示样式 */
.help-tooltip {
  position: relative;
  display: inline-block;
  cursor: help;
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background-color: #1890ff;
  color: white;
  font-size: 12px;
  font-weight: bold;
  border-radius: 50%;
  margin-left: 4px;
  transition: all 0.3s ease;
}

.help-icon:hover {
  background-color: #40a9ff;
  transform: scale(1.1);
}

.tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: #0f1733;
  color: #fff;
  text-align: left;
  border-radius: 4px;
  padding: 8px 10px;
  position: absolute;
  z-index: 1001;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  border: 1px solid #1890ff;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
}

.help-tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

/* 重置按钮样式 */
.reset-button {
  width: 100%;
  padding: 10px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.reset-button:hover {
  background-color: #40a9ff;
}

.reset-button:active {
  background-color: #096dd9;
}
</style>
