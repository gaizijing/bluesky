<template>
  


    <!-- 图层列表 -->
    <div class="layer-list">
      <div
        v-for="layer in layers"
        :key="layer.value"
        class="layer-item"
      >
        <!-- 图层开关与名称 -->
        <div class="layer-header">
          <label class="layer-toggle">
            <input
              type="checkbox"
              v-model="layer.visible"
              class="toggle-checkbox"
              @change="handleLayerToggle(layer.value)"
            >
            <span class="toggle-slider"></span>
          </label>
          <div class="layer-info" @click="handleLayerClick(layer.value)">
            <span class="layer-icon">{{ layer.icon }}</span>
            <span class="layer-name">{{ layer.label }}</span>
            <span class="config-arrow" v-if="layer.configurable">→</span>
          </div>
        </div>

        <!-- 图层配置项（仅当图层可见且有配置项时显示） -->
        <div
          class="layer-config"
          v-if="layer.visible && layer.configurable"
          :class="{ expanded: layer.configExpanded }"
        >
          <div class="config-item" v-for="(config, key) in layer.configs" :key="key">
            <label class="config-label">{{ config.label }}：</label>
            <div class="config-control">
              <template v-if="config.type === 'range'">
                <input
                  type="range"
                  :min="config.min"
                  :max="config.max"
                  :step="config.step"
                  v-model="config.value"
                  class="range-input"
                  @input="handleConfigChange(layer.value, key, config.value)"
                >
                <span class="range-value">{{ config.value }}{{ config.unit || '' }}</span>
              </template>
              <template v-if="config.type === 'select'">
                <select
                  v-model="config.value"
                  class="select-input"
                  @change="handleConfigChange(layer.value, key, config.value)"
                >
                  <option
                    v-for="option in config.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  
</template>

<script setup>
import { ref, watch } from 'vue'

// 图层数据配置
const layers = ref([
  {
    label: '流线层',
    value: 'streamline',
    icon: '🌬️',
    visible: true,
    configurable: true,
    configExpanded: false,
    configs: [
      {
        label: '粒子密度',
        key: 'density',
        type: 'range',
        min: 1,
        max: 10,
        step: 1,
        value: 5,
        unit: ''
      },
      {
        label: '流速',
        key: 'speed',
        type: 'select',
        options: [
          { label: '慢', value: 'slow' },
          { label: '中', value: 'medium' },
          { label: '快', value: 'fast' }
        ],
        value: 'medium'
      }
    ]
  },
  {
    label: '风险层',
    value: 'risk',
    icon: '⚠️',
    visible: true,
    configurable: true,
    configExpanded: false,
    configs: [
      {
        label: '透明度',
        key: 'opacity',
        type: 'range',
        min: 0.1,
        max: 1,
        step: 0.1,
        value: 0.7,
        unit: ''
      },
      {
        label: '风险等级',
        key: 'level',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '中高风险', value: 'medium+' },
          { label: '高风险', value: 'high' }
        ],
        value: 'all'
      }
    ]
  },
  {
    label: '剖面层',
    value: 'profile',
    icon: '📉',
    visible: false,
    configurable: true,
    configExpanded: false,
    configs: [
      {
        label: '剖面高度',
        key: 'height',
        type: 'range',
        min: 100,
        max: 1000,
        step: 50,
        value: 300,
        unit: 'm'
      }
    ]
  }
])

// 图层开关切换
const handleLayerToggle = (value) => {
  const layer = layers.value.find(item => item.value === value)
  if (layer) {
    console.log(`图层${layer.label} ${layer.visible ? '开启' : '关闭'}`)
    // 实际项目中触发地图图层更新
    // store.commit('map/setLayerVisible', { value, visible: layer.visible })
  }
}

// 图层点击（展开/收起配置或跳转详情）
const handleLayerClick = (value) => {
  const layer = layers.value.find(item => item.value === value)
  if (layer && layer.configurable) {
    layer.configExpanded = !layer.configExpanded
  }
}

// 配置项变更
const handleConfigChange = (layerValue, configKey, value) => {
  const layer = layers.value.find(item => item.value === layerValue)
  if (layer) {
    console.log(`图层${layer.label}配置更新：${configKey}=${value}`)
    // 实际项目中触发地图图层样式更新
    // store.commit('map/updateLayerConfig', { 
    //   layer: layerValue, 
    //   config: { [configKey]: value } 
    // })
  }
}

// 监听图层可见性变化
watch(
  () => layers.value.map(l => ({ value: l.value, visible: l.visible })),
  (newVal) => {
    console.log('图层可见性汇总：', newVal)
  },
  { deep: true }
)

// 暴露组件方法
defineExpose({
  getVisibleLayers: () => {
    return layers.value.filter(l => l.visible).map(l => l.value)
  },
  setLayerVisible: (value, visible) => {
    const layer = layers.value.find(item => item.value === value)
    if (layer) layer.visible = visible
  }
})
</script>

<style scoped lang="scss">
// 卡片基础样式


// 卡片头部（与指标切换区保持一致）
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .card-icon {
    font-size: 24px;
    color: #3b82f6;
  }

  .header-text {
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
    }

    p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #94a3b8;
    }
  }
}

// 图层列表
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// 图层项
.layer-item {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

// 图层头部（开关+名称）
.layer-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;

  // 自定义开关样式
  .layer-toggle {
    position: relative;
    width: 40px;
    height: 20px;
    margin-right: 12px;

    .toggle-checkbox {
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .toggle-slider {
        background-color: #3b82f6;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
      }

      &:checked + .toggle-slider:before {
        transform: translateX(20px);
      }
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #334155;
      transition: 0.3s;
      border-radius: 20px;

      &:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
    }
  }

  .layer-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;

    .layer-icon {
      font-size: 16px;
      color: #94a3b8;
    }

    .layer-name {
      font-size: 14px;
      color: #e2e8f0;
    }

    .config-arrow {
      font-size: 12px;
      color: #60a5fa;
      margin-left: auto;
      transition: transform 0.2s;
    }
  }
}

// 图层配置区域
.layer-config {
  padding: 0 15px;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease-out;
  background-color: rgba(255, 255, 255, 0.03);

  &.expanded {
    padding: 10px 15px 15px;
    max-height: 300px;
  }

  .config-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .config-label {
      font-size: 13px;
      color: #94a3b8;
      width: 80px;
      white-space: nowrap;
    }

    .config-control {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .range-input {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      background: #334155;
      border-radius: 2px;
      outline: none;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
      }
    }

    .range-value {
      font-size: 12px;
      color: #60a5fa;
      min-width: 40px;
      text-align: center;
    }

    .select-input {
      flex: 1;
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid #334155;
      border-radius: 4px;
      color: #e2e8f0;
      padding: 4px 8px;
      font-size: 13px;

      &:focus {
        outline: none;
        border-color: #3b82f6;
      }
    }
  }
}

// 展开状态的箭头旋转
.layer-item .layer-header .config-arrow {
  transition: transform 0.2s;
}

.layer-item .layer-config.expanded ~ .layer-header .config-arrow {
  transform: rotate(90deg);
}
</style>