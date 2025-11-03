<template>
  <div class="weather-element-selector">
    <!-- 元素类型区域 -->
    <div
      v-for="(group, groupIndex) in optionGroups"
      :key="groupIndex"
      class="element-group"
    >
      <!-- <div class="element-type">
        <img
          src="@/assets/icons/ic_weater_type.png"
          alt=""
          class="element-type-icon"
        />
        {{ group.title }}
      </div> -->

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
  },
  {
    title: "精细化气象",
    options: props.fineOptions,
    isLongBtn: true,
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
  font-family: "AiDeepFont";
  margin-left: 10px;
}

.element-group {
  &:not(:first-child) {
    margin-top: 10px;
  }
}

.element-type {
  font-size: 16px;
  height: 30px;
  display: flex;
  align-items: center;
  color: #40ecff;

  &-icon {
    width: 30px;
    margin-right: 10px;
  }
}

.selector-group {
  // display: flex;
  // flex-wrap: wrap;
  // gap: 12px;
  // align-content: center;
  // justify-content: center;
}

.element-btn {
  display: flex;
  margin-top: 10px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid #637274;
  transition: all 0.2s ease;
  color: #637274;
  font-family: "heitiFont";
  font-size: 18px;
  text-align: center;
  &:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
  }

  &--active {
    color: #40ecff;
    border: 1px solid #40ecff;
    filter: brightness(0.8) contrast(1.1);
  }
}
</style>