<template>
  <div class="landing-point-card">
    <div v-if="dashboardWeatherStore.isLoading || dashboardWeatherStore.realTimeWeatherPanelData==null" class="loading-overlay">  
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>
    <div class="card-body" v-else>
      <div class="data-panel wind-speed-panel">
        <div class="panel-label">
          <span>实时风速</span>
        </div>
        <div class="panel-value wind-speed-value">
          <div class="wind-speed-primary">
            <span class="value">{{ dashboardWeatherStore.realTimeWeatherPanelData.windSpeed }}</span>
            <span class="unit">m/s</span>
          </div>
          <div
            v-if="dashboardWeatherStore.realTimeWeatherPanelData.windSpeedKmh"
            class="wind-speed-converted"
          >
            ({{ dashboardWeatherStore.realTimeWeatherPanelData.windSpeedKmh }} km/h)
          </div>
        </div>
        <div class="panel-desc">
          {{ WIND_SPEED_DESC[getWindSpeedLevel(dashboardWeatherStore.realTimeWeatherPanelData.windSpeed)] }}
        </div>
      </div>
      <div class="data-panel wind-shear-panel" :class="`level-${dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel}`">
        <div class="panel-label">
          <span>风切变等级</span>
        </div>
        <div class="panel-value">
          <span class="value">{{
            WIND_SHEAR_MAP[dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel]
          }}</span>
          <span class="level-tag" :class="`tag-${dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel}`">
            {{ dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel }}
          </span>
        </div>
        <div class="panel-desc" :class="`desc-${dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel}`">
          {{ WIND_SHEAR_DESC[dashboardWeatherStore.realTimeWeatherPanelData.windShearLevel] }}
        </div>
      </div>
      <div class="data-panel stability-panel">
        <div class="panel-label">
          <span>稳定度指数</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ dashboardWeatherStore.realTimeWeatherPanelData.stabilityIndex }}</span>
          <span class="unit">类</span>
        </div>
        <div class="panel-desc">
          {{ STABILITY_DESC[dashboardWeatherStore.realTimeWeatherPanelData.stabilityIndex] }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
const dashboardWeatherStore = useDashboardWeatherStore();


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

</script>

<style scoped lang="scss">
.landing-point-card {
  position: relative;
  height: 100%;
  min-height: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #94a3b8;
  font-size: 13px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 核心数据区（三列布局）
.card-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  height: 100%;
  min-height: 0;
  align-items: stretch;
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

// 风速面板：主数值与 km/h 换算分行展示，避免窄面板内换行错乱
.wind-speed-panel .panel-value.wind-speed-value {
  flex-direction: column;
  align-items: center;
  gap: 2px;

  .wind-speed-primary {
    display: flex;
    align-items: baseline;
    gap: 6px;
    white-space: nowrap;
  }

  .wind-speed-converted {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
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