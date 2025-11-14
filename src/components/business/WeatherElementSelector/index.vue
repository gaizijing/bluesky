<template>
  <div class="weather-element-selector">
    <!-- 元素类型区域 -->
    <div
      v-for="(group, groupIndex) in optionGroups"
      :key="groupIndex"
      class="element-group"
    >

      <div class="selector-group">
        <div
          v-for="(item, index) in group.options"
          :key="`${groupIndex}-${index}`"
          class="element-btn"
          :class="[
            { 'element-btn--active': isSelected(item.value) },
            { 'element-long-btn': group.isLongBtn },
          ]"
          @click="handleSelect(item.value)"
          @mouseenter="handleHover(groupIndex, index, true)"
          @mouseleave="handleHover(groupIndex, index, false)"
        >
          <span class="btn-text">{{ item.label }}</span>
          <div v-if="isSelected(item.value)" class="active-indicator"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, defineProps, defineEmits, computed } from "vue";
import {
  DEFAULT_COMMON_OPTIONS,
  DEFAULT_FINE_OPTIONS,
} from "@/mock/WeatherElementSelectorData.js";

// 定义Props
const props = defineProps({
  commonOptions: {
    type: Array,
    default: () => DEFAULT_COMMON_OPTIONS,
  },
  fineOptions: {
    type: Array,
    default: () => DEFAULT_FINE_OPTIONS,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
});

// 定义Emits
const emit = defineEmits(["update:modelValue"]);

// 计算属性：将选项组合成组
const optionGroups = computed(() => [
  {
    title: "单要素气象",
    options: props.commonOptions,
    isLongBtn: false,
    icon: "icon-single-weather"
  },
  {
    title: "精细化气象",
    options: props.fineOptions,
    isLongBtn: true,
    icon: "icon-fine-weather"
  },
]);

// hover状态管理
const hoverState = ref({ groupIndex: -1, itemIndex: -1 });

// 处理hover状态
const handleHover = (groupIndex, itemIndex, isHover) => {
  hoverState.value = isHover
    ? { groupIndex, itemIndex }
    : { groupIndex: -1, itemIndex: -1 };
};

// 选中状态判断
const isSelected = (value) => {
  return props.modelValue.includes(value);
};

// 处理按钮点击
const handleSelect = (value) => {
  const newSelected = [...props.modelValue];
  const valueIndex = newSelected.indexOf(value);

  if (valueIndex > -1) {
    newSelected.splice(valueIndex, 1);
  } else {
    newSelected.push(value);
  }

  emit("update:modelValue", newSelected);
};
</script>
<style scoped lang="scss">
.weather-element-selector {
  box-sizing: border-box;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;

}

.element-group {
  &:not(:first-child) {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
}

.element-type {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  
  &-badge {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00c6ff, #0072ff);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    box-shadow: 0 2px 8px rgba(0, 114, 255, 0.3);
  }
  
  .type-icon {
    font-size: 14px;
    color: white;
  }
  
  &-text {
    font-size: 16px;
    font-weight: 600;
    color: #40ecff;
    letter-spacing: 1px;
    text-shadow: 0 0 8px rgba(64, 236, 255, 0.3);
  }
}

.selector-group {
  display: grid;
  gap: 8px;
}

.element-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #8aa0b8;
  font-family: "Microsoft YaHei", sans-serif;
  font-size: 14px;
  text-align: center;
  border-radius: 8px;
  background: rgba(30, 40, 70, 0.6);
  border: 1px solid rgba(100, 150, 200, 0.3);
  min-height: 30px;
  
  &:hover {
    transform: translateY(-2px);
    background: rgba(40, 100, 180, 0.4);
    border-color: rgba(100, 180, 255, 0.5);
    box-shadow: 0 4px 15px rgba(0, 150, 255, 0.2);
    color: #a0d0ff;
  }

  &--active {
    background: linear-gradient(135deg, rgba(0, 198, 255, 0.2), rgba(0, 114, 255, 0.3));
    color: #40ecff;
    border: 1px solid rgba(64, 236, 255, 0.6);
    box-shadow: 0 0 15px rgba(64, 236, 255, 0.3);
    
    .btn-text {
      font-weight: 600;
      text-shadow: 0 0 8px rgba(64, 236, 255, 0.5);
    }
  }
  
  &.element-long-btn {
    grid-column: span 2;
  }
  
  .btn-text {
    position: relative;
    z-index: 2;
    transition: all 0.2s ease;
  }
}

.active-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: #00c6ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00c6ff;
  border: 2px solid rgba(15, 23, 51, 0.8);
  z-index: 3;
  
  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .weather-element-selector {
    padding: 15px 10px;
    margin-left: 5px;
  }
  
  .selector-group {
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 8px;
  }
  
  .element-btn {
    padding: 10px 6px;
    font-size: 13px;
    min-height: 38px;
  }
  
  .element-type-text {
    font-size: 15px;
  }
}
</style>