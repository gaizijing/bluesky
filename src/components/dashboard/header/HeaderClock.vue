<template>
  <div class="header-clock">
    <div class="header-clock__wall">{{ wallClock }}</div>
    <div class="header-clock__timeline">数据时刻 {{ timelineLabel }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCurrentTime } from '@/hooks/useTime';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const { currentTime: wallClock } = useCurrentTime();
const appStore = useAppDashboardStore();

const timelineLabel = computed(() => {
  const raw = appStore.timelineTime || '';
  return raw.replace('+08:00', '').replace('T', ' ');
});
</script>

<style scoped lang="scss">
.header-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 13px;
  line-height: 1.3;
}

.header-clock__wall {
  font-weight: 600;
}

.header-clock__timeline {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}
</style>
