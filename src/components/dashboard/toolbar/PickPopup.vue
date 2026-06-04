<template>
  <div v-if="popup" class="pick-popup" :style="positionStyle">
    <div class="pick-popup__header">
      <span>拾取点气象</span>
      <button type="button" class="pick-popup__close" @click="close">×</button>
    </div>
    <AsyncState
      :loading="false"
      :error="!!popup.error"
      :error-message="popup.error"
      :empty="!popup.weather && !popup.error"
      empty-text="暂无数据"
      :stale="popup.weather?.isStale"
    >
      <div v-if="popup.weather" class="pick-popup__body">
        <p>坐标：{{ popup.lng?.toFixed(5) }}, {{ popup.lat?.toFixed(5) }}</p>
        <p>高度：{{ Math.round(popup.heightM || 0) }} m</p>
        <p>温度：{{ popup.weather.temperature ?? '—' }} °C</p>
        <p>风速：{{ popup.weather.windSpeed ?? '—' }} m/s</p>
        <p>能见度：{{ popup.weather.visibility ?? '—' }} km</p>
        <div v-if="popup.weather.riskLevel" class="pick-popup__risk">
          风险：{{ popup.weather.riskLevel }}
        </div>
      </div>
    </AsyncState>
    <div class="pick-popup__actions">
      <el-button size="small" @click="close">关闭</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const appStore = useAppDashboardStore();

const popup = computed(() => appStore.pickPopup);

const positionStyle = computed(() => ({
  left: '50%',
  top: '120px',
  transform: 'translateX(-50%)',
}));

function close() {
  appStore.closePickPopup();
}
</script>

<style scoped lang="scss">
.pick-popup {
  position: absolute;
  z-index: 25;
  width: 320px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 51, 0.95);
  border: 1px solid rgba(96, 165, 250, 0.35);
  color: #fff;
  pointer-events: auto;
}

.pick-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.pick-popup__close {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.pick-popup__body {
  font-size: 13px;
  line-height: 1.6;
}

.pick-popup__risk {
  margin-top: 6px;
  color: #fbbf24;
}

.pick-popup__actions {
  margin-top: 10px;
  text-align: right;
}
</style>
