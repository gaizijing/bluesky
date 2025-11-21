<template>
  <div class="landing-point-card">
    <div class="card-body">
      <div class="data-panel wind-speed-panel">
        <div class="panel-label">
          <span>实时风速</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ weatherStore.currentPointWeather.windSpeed.value }}</span>
          <span class="unit">{{ weatherStore.currentPointWeather.windSpeed.unit }}</span>
        </div>
        <div class="panel-desc">
          {{ WIND_SPEED_DESC[getWindSpeedLevel(weatherStore.currentPointWeather.windSpeed.value)] }}
        </div>
      </div>
      <div class="data-panel wind-shear-panel" :class="`level-${weatherStore.currentPointWeather.windShearLevel}`">
        <div class="panel-label">
          <span>风切变等级</span>
        </div>
        <div class="panel-value">
          <span class="value">{{
            WIND_SHEAR_MAP[weatherStore.currentPointWeather.windShearLevel]
          }}</span>
          <span class="level-tag" :class="`tag-${weatherStore.currentPointWeather.windShearLevel}`">
            {{ weatherStore.currentPointWeather.windShearLevel }}
          </span>
        </div>
        <div class="panel-desc" :class="`desc-${weatherStore.currentPointWeather.windShearLevel}`">
          {{ WIND_SHEAR_DESC[weatherStore.currentPointWeather.windShearLevel] }}
        </div>
      </div>
      <div class="data-panel stability-panel">
        <div class="panel-label">
          <span>稳定度指数</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ weatherStore.currentPointWeather.stabilityIndex }}</span>
          <span class="unit">类</span>
        </div>
        <div class="panel-desc">
          {{ STABILITY_DESC[weatherStore.currentPointWeather.stabilityIndex] }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { fetchCurrentPointWeather } from "@/api";
import { useWeatherStore } from "@/store/modules/weather";
const weatherStore = useWeatherStore();
import { useMonitoringPointStore } from "@/store/modules/monitoringPoints";
const monitoringPointStore = useMonitoringPointStore();
const isRefreshing = ref(false);

const WIND_SHEAR_MAP = {
  low: "低",
  medium: "中",
  high: "高",
};

const WIND_SHEAR_DESC = {
  low: "风切变微弱，对起降无影响",
  medium: "存在中等风切变，需谨慎操作",
  high: "强风切变风险！建议暂停起降",
};
// 稳定度指数描述常量
const STABILITY_DESC = {
  S: "大气极不稳定，强对流风险高",
  A: "大气不稳定，存在对流可能",
  B: "大气较稳定，气流轻微波动",
  C: "大气稳定，气流平稳",
};
// 风速描述常量 - 根据风速范围判断
const WIND_SPEED_DESC = {
  low: "当前风速微弱，起降条件优秀",
  medium: "当前风速适中，适合起降",
  high: "当前风速较强，需谨慎操作",
  extreme: "当前风速过强，不建议起降",
};

// 风速等级判断函数
const getWindSpeedLevel = (windSpeed) => {
  const speed = parseFloat(windSpeed);
  if (speed < 5) return "low";
  if (speed < 10) return "medium";
  if (speed < 15) return "high";
  return "extreme";
};
// const refreshData = async () => {
//   // 如果没有选中的监测点，不执行刷新
//   if (!monitoringPointStore.hasSelectedPoint) {
//     return;
//   }

//   isRefreshing.value = true;
//   try {
//     // 从API获取天气数据
//     const data = await fetchCurrentPointWeather(
//       monitoringPointStore.selectedPoint
//     );
//     console.log(data);
//     // 更新天气数据
//     weatherStore.currentPointWeather.value = data.weather;
//   } catch (err) {
//     console.error("数据刷新失败", err);
//     // 可以设置默认值或显示错误信息
//   } finally {
//     isRefreshing.value = false;
//   }
// };
//监听监测点的变化修改数据
// watch(
//   () => monitoringPointStore.selectedPoint,
//   (newPoint) => {
//     if (newPoint) {
//       refreshData();
//     }
//   }
// );
// onMounted(() => {
//   refreshData();
// });
// 对外暴露方法,传入点的id获取点的实时气象
// defineExpose({
//   updateLandingPoint: (pointName, newData) => {
//     currentLandingPoint.value = pointName;
//     if (newData) weatherStore.currentPointWeather.value = newData;
//   },
// });
</script>

<style scoped lang="scss">
.landing-point-card {}

// 核心数据区（三列布局）
.card-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

// 数据面板通用样式
.data-panel {
  background: url("@/assets/images/bg_wind_panel.png");
  background-size: cover;
  background-position: center;
  padding: 38px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .panel-label {
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  .panel-value {
    display: flex;
    align-items: baseline;
    gap: 6px;

    .value {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }

    .unit {
      font-size: 12px;
      color: #94a3b8;
    }

    .level-tag {
      font-size: 11px;
      font-weight: 600;
    }
  }

  .panel-desc {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
  }
}

// 风切变面板专属样式（颜色区分等级）
.wind-shear-panel {
  &.level-low {
    .value {
      color: #10b981;
    }

    .level-tag.tag-low {
      color: #10b981;
    }

    .panel-desc.desc-low {
      color: #34d399;
    }
  }

  &.level-medium {
    .value {
      color: #f59e0b;
    }

    .level-tag.tag-medium {
      color: #f59e0b;
    }

    .panel-desc.desc-medium {
      color: #fbbf24;
    }
  }

  &.level-high {
    .value {
      color: #ef4444;
    }

    .level-tag.tag-high {
      color: #ef4444;
    }

    .panel-desc.desc-high {
      color: #f87171;
    }
  }
}

// 稳定度面板专属样式
.stability-panel .panel-value {
  .value {
    color: #8b5cf6;
    font-size: 28px;
  }
}
</style>