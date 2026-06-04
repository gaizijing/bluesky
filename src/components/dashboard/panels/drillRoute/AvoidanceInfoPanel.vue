<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!routeId"
    empty-text="请选择航路"
    :retry="reload"
  >
    <div class="avoidance-panel">
      <section v-if="structuredItems.length" class="avoidance-panel__section">
        <h4 class="avoidance-panel__heading">风险与约束</h4>
        <ul class="avoidance-panel__list">
          <li
            v-for="(item, idx) in structuredItems"
            :key="idx"
            class="avoidance-panel__item"
            :class="`avoidance-panel__item--${item.tone}`"
          >
            <span class="avoidance-panel__item-type">{{ item.type }}</span>
            <span>{{ item.text }}</span>
          </li>
        </ul>
      </section>

      <section class="avoidance-panel__section">
        <h4 class="avoidance-panel__heading">AI 解读</h4>
        <div v-if="aiLoading" class="avoidance-panel__skeleton">
          <div v-for="i in 3" :key="i" class="avoidance-panel__skeleton-line" />
        </div>
        <div v-else class="avoidance-panel__ai">
          <p class="avoidance-panel__summary">{{ aiSummary }}</p>
          <ul v-if="keyRisks.length" class="avoidance-panel__bullets">
            <li v-for="(r, i) in keyRisks" :key="i">{{ r }}</li>
          </ul>
          <ul v-if="suggestedActions.length" class="avoidance-panel__actions">
            <li v-for="(a, i) in suggestedActions" :key="i">{{ a }}</li>
          </ul>
          <p v-if="disclaimer" class="avoidance-panel__disclaimer">{{ disclaimer }}</p>
        </div>
      </section>
    </div>
  </AsyncState>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { analyzeRouteRisk } from '@/api/v2/route';
import { fetchAiConclusion } from '@/api/v2/ai';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const appStore = useAppDashboardStore();
const { routeId, timelineTime } = useDrillFocus();

const analysis = ref(null);
const aiPayload = ref(null);
const aiLoading = ref(false);

const structuredItems = computed(() => {
  const items = [];
  const segments = analysis.value?.segmentAnalysis || [];
  segments.forEach((seg) => {
    const level = String(seg.riskLevel || '').toLowerCase();
    if (level === 'high' || level === 'medium') {
      items.push({
        type: '航段',
        text: `航段 ${seg.segmentIndex ?? seg.index ?? '—'}：${seg.reason || '存在气象风险'}`,
        tone: level === 'high' ? 'danger' : 'warning',
      });
    }
  });
  (analysis.value?.measures || []).slice(0, 4).forEach((m) => {
    items.push({
      type: '建议',
      text: m.title || m.description || String(m),
      tone: 'info',
    });
  });
  return items;
});

const aiSummary = computed(
  () => aiPayload.value?.summary || aiPayload.value?.conclusion || '暂无 AI 解读，请依据结构化风险列表决策。'
);
const keyRisks = computed(() => aiPayload.value?.keyRisks || []);
const suggestedActions = computed(() => aiPayload.value?.suggestedActions || []);
const disclaimer = computed(() => aiPayload.value?.disclaimer || '');

async function loadAi() {
  if (!routeId.value || !appStore.regionId) return;
  aiLoading.value = true;
  try {
    aiPayload.value = await fetchAiConclusion({
      scene: 'route_avoidance',
      regionId: appStore.regionId,
      targetType: 'ROUTE',
      targetId: routeId.value,
      time: timelineTime.value,
    });
  } catch {
    aiPayload.value = null;
  } finally {
    aiLoading.value = false;
  }
}

async function load() {
  if (!routeId.value) {
    analysis.value = null;
    aiPayload.value = null;
    return;
  }
  analysis.value = await analyzeRouteRisk(routeId.value, {
    time: timelineTime.value,
  });
  await loadAi();
}

watch(routeId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);
</script>

<style scoped lang="scss">
.avoidance-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 100%;
  overflow-y: auto;
}

.avoidance-panel__section {
  padding: 10px;
  border-radius: 6px;
  background: rgba(15, 36, 51, 0.45);
}

.avoidance-panel__heading {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #93c5fd;
}

.avoidance-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.avoidance-panel__item {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.4;
  padding: 6px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.15);

  &--danger {
    border-left: 3px solid #ef4444;
  }

  &--warning {
    border-left: 3px solid #f59e0b;
  }

  &--info {
    border-left: 3px solid #3b82f6;
  }
}

.avoidance-panel__item-type {
  display: inline-block;
  min-width: 2.5em;
  margin-right: 6px;
  font-weight: 700;
  color: #94a3b8;
}

.avoidance-panel__summary {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}

.avoidance-panel__bullets,
.avoidance-panel__actions {
  margin: 0 0 8px;
  padding-left: 18px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.45;
}

.avoidance-panel__disclaimer {
  margin: 0;
  font-size: 10px;
  color: #64748b;
}

.avoidance-panel__skeleton-line {
  height: 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>
