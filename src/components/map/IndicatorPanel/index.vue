<template>
  <div class="indicator-switch-card">
    <!-- 指标按钮区 -->
    <div class="indicator-buttons">
      <button
        v-for="indicator in indicators"
        :key="indicator.value"
        :class="{ 
          'indicator-btn': true,
          'active': isActive(indicator.value),
          'multiple-active': selectMode === 'multiple' && isActive(indicator.value)
        }"
        @click="toggleIndicator(indicator.value)"
        @mouseenter="showTooltip(indicator.desc, $event)"
        @mouseleave="hideTooltip()"
      >
        <span class="btn-icon">{{ indicator.icon }}</span>
        <span class="btn-text">{{ indicator.label }}</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// 指标数据配置
const indicators = ref([
  {
    label: '风速',
    value: 'windSpeed',
    icon: '💨',
    desc: '空气流动速度，单位m/s，影响飞行稳定性',
    unit: 'm/s',
    min: 0,
    max: 30
  },
  {
    label: '风向',
    value: 'windDir',
    icon: '🧭',
    desc: '风的来向，以正北为0°顺时针递增，单位°',
    unit: '°',
    min: 0,
    max: 360
  },
  {
    label: '涡度',
    value: 'vorticity',
    icon: '🌀',
    desc: '局地旋转强度，正值为气旋式旋转，单位1/s',
    unit: '1/s',
    min: -0.1,
    max: 0.1
  },
  {
    label: '温度',
    value: 'temperature',
    icon: '🌡️',
    desc: '空气温度，影响空气密度与飞行器性能',
    unit: '℃',
    min: -20,
    max: 40
  },
  {
    label: '湍流强度',
    value: 'turbulence',
    icon: '🌊',
    desc: '气流脉动强度，0-10级，7级以上影响飞行安全',
    unit: '级',
    min: 0,
    max: 10
  }
])

// 状态管理
const selectMode = ref('single') // 单选/多选模式
const selectedIndicators = ref(['windSpeed']) // 选中的指标
const alarmThreshold = ref(10) // 报警阈值

// 计算属性：当前选中的单个指标（单选模式用）
const selectedIndicator = computed(() => {
  return selectedIndicators.value[0] || indicators.value[0].value
})


// 交互逻辑：判断指标是否激活
const isActive = (value) => {
  return selectedIndicators.value.includes(value)
}

// 切换指标选择
const toggleIndicator = (value) => {
  if (selectMode.value === 'single') {
    selectedIndicators.value = [value]
    // 单选模式下自动调整阈值范围
    const indicator = indicators.value.find(item => item.value === value)
    if (indicator) alarmThreshold.value = (indicator.min + indicator.max) / 2
  } else {
    if (isActive(value)) {
      selectedIndicators.value = selectedIndicators.value.filter(item => item !== value)
    } else {
      selectedIndicators.value.push(value)
    }
  }
  // 触发store更新（实际项目中替换为store.commit）
  console.log('指标更新：', selectedIndicators.value)
}

// Tooltip管理
const showTooltipFlag = ref(false)
const tooltipContent = ref('')
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

const showTooltip = (desc, e) => {
  tooltipContent.value = desc
  // 计算位置（避免溢出）
  const rect = e.target.getBoundingClientRect()
  tooltipLeft.value = rect.right + 10
  tooltipTop.value = rect.top
  showTooltipFlag.value = true
}

const hideTooltip = () => {
  showTooltipFlag.value = false
}

// 监听选中指标变化，同步更新地图渲染（实际项目中对接store）
watch(selectedIndicators, (newVal) => {
  // 示例：触发地图渲染更新
  console.log('触发地图更新：', newVal)
  // store.commit('windField/setIndicators', newVal)
})

// 暴露组件方法
defineExpose({
  getSelectedIndicators: () => selectedIndicators.value,
  setSelectMode: (mode) => {
    if (['single', 'multiple'].includes(mode)) {
      selectMode.value = mode
    }
  }
})
</script>

<style scoped lang="scss">
// 卡片基础样式
.indicator-switch-card {
  width: 100%;
 
}

// 卡片头部
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

// 指标按钮区域
.indicator-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 25px;
}

// 指标按钮样式（核心视觉元素）
.indicator-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  padding: 8px 15px;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  .btn-icon {
    font-size: 16px;
  }

  &:hover:not(.active) {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.4);
    color: #bfdbfe;
  }

  // 激活状态样式（发光效果）
  &.active {
    background-color: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #3b82f6;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    font-weight: 500;
  }

  // 多选模式激活样式
  &.multiple-active {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
  }
}

// 控制选项区
.control-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

// 模式选择器
.mode-selector {
  display: flex;
  align-items: center;
  gap: 15px;

  .option-label {
    font-size: 13px;
    color: #94a3b8;
    white-space: nowrap;
  }

  .mode-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #e2e8f0;
    cursor: pointer;

    .mode-radio {
      accent-color: #3b82f6;
      width: 14px;
      height: 14px;
    }
  }
}

// 阈值报警区域
.threshold-alarm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 6px;

  .alarm-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #e2e8f0;
    cursor: pointer;

    .alarm-checkbox {
      accent-color: #10b981;
      width: 14px;
      height: 14px;
    }
  }

  .threshold-input {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 13px;
      color: #94a3b8;
    }

    .threshold-number {
      width: 80px;
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

    .threshold-unit {
      color: #60a5fa;
      font-size: 12px;
    }
  }
}

// 指标提示框
.indicator-tooltip {
  position: fixed;
  background-color: rgba(15, 23, 51, 0.95);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #e2e8f0;
  z-index: 1000;
  pointer-events: none;
  max-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

// 响应式适配
@media (max-width: 576px) {
  .indicator-buttons {
    justify-content: center;
  }

  .control-options {
    flex-direction: column;
    gap: 10px;
  }

  .threshold-alarm {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>