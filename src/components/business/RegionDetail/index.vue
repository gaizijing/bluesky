<template>
   <div class="panel-header">
          <span class="panel-title">{{ regionDetail.regionName }}详情</span>
        </div>
  <div class="region-weather-detail">
    <el-collapse
      v-model="activeName"
      accordion
      class="region-weather-detail__collapse"
    >
      <el-collapse-item
        v-for="(timeSlot, index) in regionDetail.timeSeries"
        :key="index"
        :name="index"
        :class="{
          'weather-warning': timeSlot.warnings && timeSlot.warnings.length > 0,
        }"
      >
        <template #title>
          <div class="weather-time-header">
            <!-- 时间始终显示 -->
            <img
              src="@/assets/icons/ic_warn_time.png"
              alt="警告"
              class="icon-time-warning"
              v-if="timeSlot.warnings && timeSlot.warnings.length > 0"
            />
            <span :class="{'time-label':true,'time-label-warning':timeSlot.warnings && timeSlot.warnings.length > 0}">{{ getTimeLabel(index) }}</span>

            <!-- 如果有警告，在时间后面追加警告信息 -->
            <template v-if="timeSlot.warnings && timeSlot.warnings.length > 0">
              <span class="warning-text">{{
                timeSlot.warnings.join("；")
              }}</span>
            </template>

            <!-- 如果没有警告，显示默认的展开图标占位 -->
            <template v-else>
              <div class="spacer"></div>
            </template>
          </div>
          <img
            src="@/assets/icons/ic_arrow.png"
            alt="展开/收起"
            class="icon-expand-arrow"
          />
        </template>

        <div class="weather-detail-list">
          <div
            v-for="weatherItem in timeSlot.weatherItems"
            :key="weatherItem.type"
            :class="{
              'weather-detail-item': true,
              'weather-detail-item--warning': !weatherItem.isSuitable,
            }"
          >
            <!-- <template v-if="!weatherItem.isSuitable">
              <img
                src="@/assets/icons/ic_warn.png"
                alt="警告"
                class="icon-warning"
              />
            </template> -->
            {{ WEATHER_TYPE_LABELS[weatherItem.type] }}<br />{{
              weatherItem.value
            }}
            {{ weatherItem.unit }}
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { WEATHER_TYPE_LABELS } from "@/mock/regionWeatherData.js";

// Props定义
const props = defineProps({
  regionDetail: {
    type: Object,
    default: () => ({}),
  },
});
watch((regionDetail) => {
  console.log(regionDetail);
});
const next12Hours = ref([]);
// 添加一个函数来获取时间标签
const getTimeLabel = (index) => {
  const currentHour = new Date().getHours();
  const targetHour = (currentHour + index) % 24;
  return `${targetHour.toString().padStart(2, "0")}:00`;
};
// 计算属性优化时间计算
const next12HoursComputed = computed(() => {
  const currentHour = new Date().getHours();
  return Array.from({ length: 12 }, (_, i) => (currentHour + i) % 24);
});
// 生命周期钩子
onMounted(() => {
  next12Hours.value = next12HoursComputed.value;
});
</script>
<style scoped lang="scss">
.region-weather-detail {
  color: $text-light;
  font-family: "AiDeepFont";
  padding: 10px 24px 10px 10px;

  :deep(.region-weather-detail__collapse) {
    background: transparent;

    // 隐藏默认箭头
    .el-collapse-item__header .el-collapse-item__arrow {
      display: none;
    }

    // 折叠面板标题 - 正常态
    .el-collapse-item__header {
      background-blend-mode: overlay;
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      border-radius: 15px;
      margin-top: 5px;
      background: #248c994f;
      color: $text-light;
    }

    // 警告态样式
    .weather-warning > .el-collapse-item__header {
      background: linear-gradient(to right, #781e1e, #8a2e2e85) !important;
      color: #ffdddd !important;
    }

    .el-collapse-item__title {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .el-collapse-item__content {
      padding: 0;
    }
  }
}

.weather-time-header {
  width: 330px;
  padding-left: 10px;
  display: flex;
  align-items: center;
  background: transparent;
  flex: 1;
 
  display: flex;
}
.time-label{
  padding-left:40px;
  display: inline-block;
}
.time-label-warning{
  padding-left:0px;
  display: inline-block;
  padding-right:5px;
  color: #ec4d4d;
}
.warning-text{
   white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
// 图标基础样式
%icon-base {
  flex-shrink: 0;
}

.icon-time-warning {
  @extend %icon-base;
  width: 35px;
  height: 35px;
}

.icon-warning {
  @extend %icon-base;
  width: 20px;
  height: 28px;
}

.icon-expand-arrow {
  @extend %icon-base;
  width: 25px;
  height: 40px;
  transition: transform 0.3s ease;
  margin-right: 15px;
  transform: rotate(-90deg);

  :deep(.is-active) & {
    transform: rotate(0deg);
  }
}
.weather-detail-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr); // 精确的三列布局
  color: $text-light;
  padding: 10px;
  gap: 10px;

  .weather-detail-item {
    text-align: center;
    padding: 2px 0px;
    display: flex;
    align-items: center;
    justify-content: center;

    // 移除背景图片，使用渐变背景
    background: linear-gradient(50deg, #294d55d1, rgba(42, 73, 124, 0.021));

    // 设置两头圆角
    border-radius: 25px;

    // 添加阴影效果
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    &.weather-detail-item--warning {
      // 警告状态使用不同的渐变背景
      background: linear-gradient(130deg, rgba(42, 73, 124, 0.021), #781e1e);
      color: #ffdddd;
      font-weight: bold;
    }
  }
}
</style>