<template>
  <div v-if="popup" class="pick-popup" :style="positionStyle">
    <div class="landing-popup">
      <button type="button" class="landing-popup__close" aria-label="关闭" @click="close">×</button>
      <div class="landing-popup__inner">
        <h3 class="landing-popup__title">拾取点气象</h3>
        <AsyncState
          :loading="false"
          :error="!!popup.error"
          :error-message="popup.error"
          :empty="!popup.weather && !popup.error"
          empty-text="暂无数据"
          :stale="popup.weather?.isStale"
        >
          <div v-if="popup.weather" class="pick-popup__body">
            <p class="landing-popup__row">坐标：{{ popup.lng?.toFixed(5) }}, {{ popup.lat?.toFixed(5) }}</p>
            <p class="landing-popup__row">高度：{{ Math.round(popup.heightM || 0) }} m</p>
            <p
              v-for="metric in metricRows"
              :key="metric.key"
              class="landing-popup__row"
              :class="metric.levelClass"
            >
              {{ metric.label }}：{{ metric.text }}
            </p>
            <p v-if="riskBadge" class="landing-popup__row">
              <span class="landing-popup__badge" :class="riskBadge.className">
                R_met {{ riskBadge.text }}
              </span>
            </p>
          </div>
        </AsyncState>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import {
  evaluateWeatherFlyability,
  metricLevelClass,
  riskBadgeClass,
} from '@/utils/flyabilityEvaluate';
import '@/region-meteo/landing-popup.css';

const appStore = useAppDashboardStore();

const popup = computed(() => appStore.pickPopup);

const positionStyle = computed(() => ({
  left: '50%',
  top: '120px',
  transform: 'translate(-50%, 0)',
}));

function formatMetric(value, unit = '') {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return `${n.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  return String(value);
}

const metricRows = computed(() => {
  const weather = popup.value?.weather;
  if (!weather) return [];

  const levels = evaluateWeatherFlyability(weather);
  return [
    {
      key: 'temperature',
      label: '温度',
      text: formatMetric(weather.temperature, '°C'),
      levelClass: metricLevelClass(levels.temperatureC),
    },
    {
      key: 'windSpeed',
      label: '风速',
      text: formatMetric(weather.windSpeed, 'm/s'),
      levelClass: metricLevelClass(levels.windSpeedMs),
    },
    {
      key: 'visibility',
      label: '能见度',
      text: formatMetric(weather.visibility, 'km'),
      levelClass: metricLevelClass(levels.visibilityKm),
    },
    {
      key: 'humidity',
      label: '湿度',
      text: formatMetric(weather.humidity, '%'),
      levelClass: '',
    },
    {
      key: 'precipitation',
      label: '降水',
      text: formatMetric(weather.precipitation, 'mm/h'),
      levelClass: metricLevelClass(levels.precipMmH),
    },
  ];
});

const riskBadge = computed(() => {
  const risk = popup.value?.weather?.risk;
  if (!risk) return null;
  const text = risk.value != null ? formatMetric(risk.value, '') : (risk.level || '—');
  return {
    text,
    className: riskBadgeClass(risk.level),
  };
});

function close() {
  appStore.closePickPopup();
}
</script>

<style scoped lang="scss">
.pick-popup {
  position: absolute;
  z-index: 25;
  width: 220px;
  max-width: min(220px, 78vw);
  pointer-events: auto;
}

.pick-popup__body {
  font-size: 14px;
  line-height: 1.45;
}
</style>
