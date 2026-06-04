<template>
  <AsyncState :loading="false" :empty="false">
    <div class="placeholder-panel">
      <div class="placeholder-panel__title">{{ title || panelId }}</div>
      <div class="placeholder-panel__hint">待 P4 接入</div>
      <div v-if="focusHint" class="placeholder-panel__meta">{{ focusHint }}</div>
    </div>
  </AsyncState>
</template>

<script setup>
import { computed } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const props = defineProps({
  panelId: { type: String, default: '' },
  title: { type: String, default: '' },
});

const appStore = useAppDashboardStore();

const focusHint = computed(() => {
  if (appStore.focus.type === 'none') return '';
  return `当前焦点：${appStore.focus.type} / ${appStore.focus.id ?? '—'}`;
});
</script>

<style scoped lang="scss">
.placeholder-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
}

.placeholder-panel__title {
  font-size: 16px;
  font-weight: 600;
}

.placeholder-panel__hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.placeholder-panel__meta {
  font-size: 12px;
  color: rgba(64, 236, 255, 0.8);
}
</style>
