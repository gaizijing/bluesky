<template>
  <div class="legend-panel">
    <div class="legend-panel__title">图例</div>
    <ul class="legend-panel__groups">
      <li v-for="group in groups" :key="group">
        <span>{{ legendLabel(group) }}</span>
        <div v-if="group === 'rMet'" class="legend-panel__bar legend-panel__bar--rmet" />
        <div v-else-if="group === 'metProduct'" class="legend-panel__bar legend-panel__bar--met" />
        <div v-else-if="group === 'flyability'" class="legend-panel__dots">
          <i class="dot dot--green" />适飞
          <i class="dot dot--yellow" />注意
          <i class="dot dot--red" />禁飞
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import dashboardConfig from '@/config/dashboard.config.json';

const groups = dashboardConfig.legend?.groups || [];

const labels = {
  noFly: '禁飞区',
  rMet: '气象风险 R_met',
  flyability: '适飞等级',
  metProduct: '气象产品填色',
};

function legendLabel(key) {
  return labels[key] || key;
}
</script>

<style scoped lang="scss">
.legend-panel {
  position: absolute;
  bottom: 72px;
  right: 72px;
  z-index: 16;
  min-width: 180px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(15, 23, 51, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  pointer-events: auto;
}

.legend-panel__title {
  font-weight: 600;
  margin-bottom: 8px;
}

.legend-panel__groups {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-panel__bar {
  height: 8px;
  margin-top: 6px;
  border-radius: 4px;
}

.legend-panel__bar--rmet {
  background: linear-gradient(90deg, #1d4ed8, #22c55e, #facc15, #fb923c, #ef4444);
}

.legend-panel__bar--met {
  background: linear-gradient(
    90deg,
    #4c1d95,
    #1d4ed8,
    #06b6d4,
    #22c55e,
    #eab308,
    #f97316,
    #ef4444,
    #7f1d1d
  );
}

.legend-panel__dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 2px;
}

.dot--green {
  background: #31d158;
}

.dot--yellow {
  background: #f97316;
}

.dot--red {
  background: #e25151;
}
</style>
