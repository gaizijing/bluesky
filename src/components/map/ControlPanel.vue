<!-- ControlPanel.vue -->
<template>
  <div class="control-panel">
    <!-- 图层控制部分 -->
    <div class="layer-control-section" v-if="layerSettingsStore">
      <div class="section-header" @click="toggleSection('layers')">
        <h3>图层控制</h3>
        <span class="toggle-icon">{{
          expandedSections.layers ? "−" : "+"
        }}</span>
      </div>

      <div v-show="expandedSections.layers" class="section-content">
        <div v-for="(layer, key) in layerSettingsStore.layers" :key="key" class="layer-item">
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

    <!-- 风场控制部分 -->
    <div class="control-section">
      <div class="section-header" @click="toggleSection('wind')">
        <h3>风场控制</h3>
        <span class="toggle-icon">{{ expandedSections.wind ? "−" : "+" }}</span>
      </div>

      <div v-show="expandedSections.wind" class="section-content">
        <div class="control-group">
          <label>粒子数量: {{ localOptions.particlesTextureSize }}</label>
          <input type="range" min="100" max="1000" step="10" :value="localOptions.particlesTextureSize"
            @input="handleParticlesTextureSizeChange" />
        </div>

        <div class="control-group">
          <label>速度因子: {{ localOptions.speedFactor.toFixed(2) }}</label>
          <input type="range" min="0" max="5" step="0.1" :value="localOptions.speedFactor"
            @input="handleSpeedFactorChange" />
        </div>

        <div class="control-group">
          <label>线宽范围: {{ localOptions.lineWidth.min }} -
            {{ localOptions.lineWidth.max }}</label>
          <div class="range-group">
            <input type="range" min="0" max="10" step="0.1" :value="localOptions.lineWidth.min"
              @input="handleLineWidthMinChange" />
            <input type="range" min="0" max="10" step="0.1" :value="localOptions.lineWidth.max"
              @input="handleLineWidthMaxChange" />
          </div>
        </div>

        <div class="control-group">
          <label>线条长度: {{ localOptions.lineLength.min }} -
            {{ localOptions.lineLength.max }}</label>
          <div class="range-group">
            <input type="range" min="1" max="100" step="1" :value="localOptions.lineLength.min"
              @input="handleLineLengthMinChange" />
            <input type="range" min="1" max="100" step="1" :value="localOptions.lineLength.max"
              @input="handleLineLengthMaxChange" />
          </div>
        </div>

        <div class="control-group">
          <label>显示速度范围: {{ localOptions.displayRange.min }} -
            {{ localOptions.displayRange.max }}</label>
          <div class="range-group">
            <input type="range" min="1" max="100" step="1" :value="localOptions.displayRange.min"
              @input="handleDisplayRangeMinChange" />
            <input type="range" min="1" max="100" step="1" :value="localOptions.displayRange.max"
              @input="handleDisplayRangeMaxChange" />
          </div>
        </div>
        <div class="control-group">
          <label>粒子高度: {{ localOptions.particleHeight }}</label>
          <input type="range" min="10" max="5000" step="10" :value="localOptions.particleHeight"
            @input="handleParticleHeightChange" />
        </div>

        <div class="control-group">
          <button @click="resetToDefaults" class="reset-button">
            重置为默认值
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, Ref, inject } from "vue";
import { WindLayer, WindLayerOptions } from "cesium-wind-layer";
import { WIND_LAYER_DEFAULTS } from "../../config/windLayerDefaults";
import { useLayerSettingsStore } from "@/store/modules/layerSettings";

// 定义组件属性
const props = defineProps<{
  windLayer: Ref<WindLayer> | null;
  initialOptions?: WindLayerOptions;
  layerControls: any;
}>();

// 定义事件发射器
const emit = defineEmits<{
  (e: "optionsChange", options: Partial<WindLayerOptions>): void;
}>();

// 使用图层设置store
const layerSettingsStore = useLayerSettingsStore();

// 展开的面板部分
const expandedSections = reactive({
  layers: true,
  wind: true,
});

// 切换面板展开/收起
const toggleSection = (section: string) => {
  expandedSections[section as keyof typeof expandedSections] =
    !expandedSections[section as keyof typeof expandedSections];
};

// 切换图层可见性
const toggleLayerVisibility = (key: string, event: Event) => {
  const visible = (event.target as HTMLInputElement).checked;
  layerSettingsStore.setLayerVisibility(key, visible);
  // 保存设置到本地存储
  layerSettingsStore.saveSettingsToLocal();

  // 调用传入的Cesium控制方法
  if (props.layerControls) {
    switch (key) {
      case "model":
        props.layerControls.setModelVisibility?.(visible);
        break;
      case "wind":
        props.layerControls.setWindVisibility?.(visible);
        break;
      case "areas":
        props.layerControls.setAreasVisibility?.(visible);
        break;
      case "temperature":
        props.layerControls.setTemperatureVisibility?.(visible);
        break;
    }
  }
};

// 本地选项状态
const localOptions = reactive<WindLayerOptions>({
  ...props.initialOptions,
});

// 默认选项
const defaultOptions = WIND_LAYER_DEFAULTS;

// 监听初始选项变化
watch(
  () => props.initialOptions,
  (newOptions) => {
    if (newOptions) {
      Object.assign(localOptions, newOptions);
    }
  },
  { deep: true }
);

// 更新风场选项
const updateWindLayerOptions = (changedOptions: Partial<WindLayerOptions>) => {
  props.windLayer.updateOptions(changedOptions);
  emit("optionsChange", changedOptions);

  // 同步更新store中的风场配置
  layerSettingsStore.updateWindOptions(changedOptions);

  // 保存设置到本地存储
  layerSettingsStore.saveSettingsToLocal();

};

// 处理各种参数变更
const handleParticlesTextureSizeChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.particlesTextureSize = value;
  updateWindLayerOptions({ particlesTextureSize: value });
};

const handleSpeedFactorChange = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  localOptions.speedFactor = value;
  updateWindLayerOptions({ speedFactor: value });
};

const handleLineWidthMinChange = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  localOptions.lineWidth.min = value;
  updateWindLayerOptions({ lineWidth: { ...localOptions.lineWidth } });
};

const handleLineWidthMaxChange = (event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  localOptions.lineWidth.max = value;
  updateWindLayerOptions({ lineWidth: { ...localOptions.lineWidth } });
};

const handleLineLengthMinChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.lineLength.min = value;
  updateWindLayerOptions({ lineLength: { ...localOptions.lineLength } });
};

const handleLineLengthMaxChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.lineLength.max = value;
  updateWindLayerOptions({ lineLength: { ...localOptions.lineLength } });
};
const handleDisplayRangeMinChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.displayRange.min = value;
  updateWindLayerOptions({ displayRange: { ...localOptions.displayRange } });
};

const handleDisplayRangeMaxChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.displayRange.max = value;
  updateWindLayerOptions({ displayRange: { ...localOptions.displayRange } });
};

const handleParticleHeightChange = (event: Event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  localOptions.particleHeight = value;
  updateWindLayerOptions({ particleHeight: value });
};

// 重置为默认值
const resetToDefaults = () => {
  Object.assign(localOptions, defaultOptions);

  props.windLayer.updateOptions(defaultOptions);
  emit("optionsChange", defaultOptions);

  // 重置store中的风场配置
  layerSettingsStore.resetWindOptions();

};
</script>

<style scoped>
.control-panel {
  width: 300px;
  position: absolute;
  top: 80px;
  left: 20px;
  background-color: #0f1733;
  border-radius: 8px;
  background-image: url("@/assets/images/bg_dialog.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 320px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

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

.toggle-icon {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.section-header:hover .toggle-icon {
  transform: scale(1.2);
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
}

.section-content {
  margin-bottom: 20px;
}

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

/* Switch样式 */
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

/* 原有的风场控制样式 */
.control-section h3 {
  margin-top: 0;
  color: #fff;
  font-size: 23px;
  font-weight: 600;
  font-family: "AiDeepFont";
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 13px;
  color: #fff;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1890ff;
  cursor: pointer;
}

.range-group {
  display: flex;
  gap: 10px;
}

.range-group input {
  flex: 1;
}

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