<template>
  <div class="panel-header">
          <span class="panel-title">区域监测</span>
        </div>
  <div class="dot-indicator">
    <span
      class="score-dot-indicator"
      :class="`score-dot-indicator--green`"
    ></span
    >适飞
    <span
      class="score-dot-indicator"
      :class="`score-dot-indicator--red`"
    ></span
    >不适飞
  </div>
  <div
    class="region-container"
    @click="toggleFocus(index)"
    :class="{ 'region-container--focused': activeIndex === index }"
    v-for="(region, index) in regionMonitorList"
    :key="index"
  >
    <div class="region-title">
      <img :src="buildIcon" class="region-title__icon" alt="区域图标" />
      <span class="region-title__text">{{ region.name }}</span>
    </div>

    <div class="region-content">
      <div class="region-content__label">适飞指数</div>

      <!-- 时间+点模块 -->
      <div
        class="region-item"
        v-for="(score, timeIndex) in region.flightScore"
        :key="`${index}-${timeIndex}`"
      >
        <div class="time-dot-wrapper">
          <span class="hour-text">{{ next12Hours[timeIndex] }}</span>
          <div class="dot-icon-container">
            <i class="iconfont icon-region"></i>
            <span
              class="score-dot"
              :class="`score-dot--${getScoreColorClass(score)}`"
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted, computed, watch } from "vue";
import mockRegionMonitorData from "@/mock/regionMonitorData.js";
import buildIcon from "@/assets/icons/ic_build.png";
import { useRegionStore } from "@/store/modules/region"; // 引入store
import { el } from "element-plus/es/locales.mjs";

// Props定义
const props = defineProps({
  regionMonitorList: {
    type: Array,
    default: () => mockRegionMonitorData,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
});

// 使用store
const regionStore = useRegionStore();
regionStore.setSelectedRegion(mockRegionMonitorData[0],0)
// 响应式数据
const activeIndex = ref(-1);
const next12Hours = ref([]);

// 计算属性优化时间计算
const next12HoursComputed = computed(() => {
  const currentHour = new Date().getHours();
  return Array.from({ length: 12 }, (_, i) => (currentHour + i) % 24);
});

// 生命周期钩子
onMounted(() => {
  next12Hours.value = next12HoursComputed.value;
});

// 监听选中区域变化，同步到store
watch(activeIndex, (newIndex) => {
  if (newIndex >= 0 && newIndex < props.regionMonitorList.length) {
    const selectedRegion = props.regionMonitorList[newIndex];
    regionStore.setSelectedRegion(selectedRegion, newIndex);
  } else {
    regionStore.clearSelectedRegion();
  }
});

// 方法定义
const toggleFocus = (index) => {
  activeIndex.value = activeIndex.value === index ? -1 : index;
};

// 评分颜色映射
const getScoreColorClass = (score) => {
  if (score) return "green";
  else return "red";
};
</script>

<style scoped lang="scss">
.region-container {
  font-family: "AiDeepFont";
  color: $text-light;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0px 10px 0px 10px;
  padding-bottom: 20px;
  position: relative;

  &:hover {
    transform: scale(1.09);
  }

  &--focused {
    background-color: #3d8cb169;
    border-left: 3px solid #0cc6cc;
    box-shadow: 0 2px 8px rgba(53, 215, 236, 0.836);
    transform: scale(1);
  }
}
.dot-indicator {
  position: absolute;
  top: 10px;
  color: #fff;
  left: 250px;
  font-size: 12px;
  font-family: "AiDeepFont";
  display: flex;
  align-items: center;
}
.region-title {
  display: flex;
  align-items: center;

  &__icon {
    width: 100px;
  }

  &__text {
    // 添加文本样式
  }
}

.region-content {
  display: flex;
  margin-top: -16px;

  &__label {
    position: relative;
    top: 14px;
    left: 10px;
    font-size: 13px;
    width: 100px;
  }
}

.region-item {
  display: inline-block;
  margin: 0 5px;
  width: 20px;
}

.time-dot-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hour-text {
  font-size: 12px;
}

.dot-icon-container {
  position: relative;
  font-size: 20px;
}

.score-dot {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, 2px);
  width: 13px;
  height: 13px;
  border-radius: 50%;

  &--green {
    background-color: #28a745;
  }

  &--yellow {
    background-color: #ffc107;
  }

  &--red {
    background-color: #dc3545;
  }
}
.score-dot-indicator {
  display: inline-block;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  margin-right: 8px;
  margin-left: 10px;
  &--green {
    background-color: #28a745;
  }

  &--yellow {
    background-color: #ffc107;
  }

  &--red {
    background-color: #dc3545;
  }
}
</style>