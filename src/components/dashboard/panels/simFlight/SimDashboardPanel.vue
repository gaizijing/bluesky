<template>
  <div class="sim-dashboard">
    <div class="sim-dashboard__content">
      <div class="sim-dashboard__weather">
        <div v-for="item in weatherStrip" :key="item.key" class="sim-dashboard__weather-item">
          <span class="sim-dashboard__weather-label">{{ item.label }}</span>
          <span class="sim-dashboard__weather-value">{{ item.value }}</span>
        </div>
      </div>

      <div class="sim-dashboard__instruments">
        <div class="sim-dashboard__side-gauge">
          <div class="sim-dashboard__gauge-box">
          <CircularGauge
            :value="animBattery"
            :max="100"
            :apex-value="60"
            :ticks="[0, 20, 40, 60, 80, 100]"
            label="电量"
          />
          </div>
          <span class="sim-dashboard__gauge-caption">电量 %</span>
        </div>

      <AttitudeIndicator
        :roll="animRoll"
        :pitch="animPitch"
        :altitude="animAltitude"
        :vertical-speed="animVerticalSpeed"
      />

        <div class="sim-dashboard__side-gauge">
          <div class="sim-dashboard__gauge-box">
          <CircularGauge
            :value="animSpeed"
            :max="120"
            :ticks="[0, 20, 40, 60, 80, 100, 120]"
            label="飞行速度"
          />
          </div>
          <span class="sim-dashboard__gauge-caption">飞行速度 m/s</span>
        </div>
      </div>

      <SimConnectBar />
    </div>
  </div>
</template>

<script setup>
import CircularGauge from './instruments/CircularGauge.vue';
import AttitudeIndicator from './instruments/AttitudeIndicator.vue';
import SimConnectBar from './SimConnectBar.vue';
import { useSimDashboardData } from '@/composables/useSimDashboardData';
import { useAnimatedFlight } from '@/composables/useAnimatedNumber';

defineProps({
  panelId: { type: String, default: 'simDashboard' },
  title: { type: String, default: '' },
});

const { flight, weatherStrip } = useSimDashboardData();
const {
  roll: animRoll,
  pitch: animPitch,
  altitude: animAltitude,
  verticalSpeed: animVerticalSpeed,
  speed: animSpeed,
  battery: animBattery,
} = useAnimatedFlight(flight);
</script>

<style scoped lang="scss">
.sim-dashboard {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #1e2338;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.sim-dashboard__content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  min-height: 0;
  padding: 18px 22px 10px;
  gap: 2px;
  color: #fff;
  font-family: 'AiDeepFont', 'Microsoft YaHei', sans-serif;
}

.sim-dashboard__weather {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px 6px;
  border-bottom: 1px solid rgba(0, 232, 255, 0.1);
}

.sim-dashboard__weather-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1 1 0;
  justify-content: center;
  white-space: nowrap;
}

.sim-dashboard__weather-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.52);
}

.sim-dashboard__weather-value {
  font-size: 13px;
  font-weight: 600;
  color: #00e8ff;
}

.sim-dashboard__instruments {
  flex: 1 1 auto;
  min-height: 210px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 36px;
  overflow: visible;
  padding-bottom: 2px;
}

.sim-dashboard__side-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 168px;
  width: 168px;
  padding-bottom: 2px;
}

.sim-dashboard__gauge-box {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.sim-dashboard__gauge-caption {
  margin-top: 6px;
  font-size: 10px;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.48);
  flex-shrink: 0;
}
</style>

<style lang="scss">
.bottom-full-panel .main-panel.left_bg {
  background: transparent !important;
  background-image: none !important;
  overflow: visible;
}

.bottom-full-panel .panel-content--chromeless {
  padding: 0;
  overflow: visible;
  height: 100%;
  background: transparent;
}

.bottom-full-panel .main-panel--chromeless {
  overflow: visible;
  background: transparent;
}
</style>
