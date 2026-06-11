<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!routeId"
    empty-text="请选择航路"
    :retry="reload"
  >
    <div class="route-avoidance">
      <section v-if="riskItems.length" class="route-avoidance__section">
        <h4 class="route-avoidance__heading">结构化风险</h4>
        <ul class="route-avoidance__list">
          <li
            v-for="(item, idx) in riskItems"
            :key="idx"
            class="route-avoidance__item"
            :class="`route-avoidance__item--${item.level}`"
            role="button"
            tabindex="0"
            @click="locateRoute"
            @keyup.enter="locateRoute"
          >
            <span class="route-avoidance__item-title">{{ item.title }}</span>
            <span class="route-avoidance__item-desc">{{ item.desc }}</span>
          </li>
        </ul>
      </section>

      <section class="route-avoidance__section">
        <h4 class="route-avoidance__heading">AI 综合解读</h4>
        <div v-if="aiLoading" class="route-avoidance__skeleton">AI 解读生成中…</div>
        <template v-else-if="aiConclusion">
          <p v-if="aiSummary" class="route-avoidance__summary">{{ aiSummary }}</p>
          <ul v-if="keyRisks.length" class="route-avoidance__bullets">
            <li v-for="(risk, idx) in keyRisks" :key="idx">{{ risk }}</li>
          </ul>
          <ul v-if="suggestedActions.length" class="route-avoidance__actions">
            <li v-for="(action, idx) in suggestedActions" :key="idx">{{ action }}</li>
          </ul>
          <p v-if="disclaimer" class="route-avoidance__disclaimer">{{ disclaimer }}</p>
        </template>
        <p v-else class="route-avoidance__muted">AI 解读暂不可用，请参考上方结构化风险列表。</p>
      </section>
    </div>
  </AsyncState>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchAiConclusion } from '@/api/v2/ai';
import { fetchRouteRiskAnalysis } from '@/services/routeRiskService';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const appStore = useAppDashboardStore();
const { routeId, timelineTime } = useDrillFocus();

const analysis = ref(null);
const aiConclusion = ref(null);
const aiLoading = ref(false);

const riskItems = computed(() => {
  const items = [];
  const data = analysis.value;
  if (!data) return items;

  const assessment = data.overallAssessment || {};
  if (assessment.summary || assessment.level) {
    items.push({
      level: mapRiskLevel(assessment.level || assessment.riskLevel),
      title: '综合评估',
      desc: assessment.summary || assessment.description || '—',
    });
  }

  const segments = Array.isArray(data.segmentAnalysis) ? data.segmentAnalysis : [];
  segments
    .filter((seg) => seg.riskLevel === 'high' || seg.riskLevel === 'medium' || (seg.risk ?? 0) >= 0.3)
    .slice(0, 5)
    .forEach((seg, idx) => {
      items.push({
        level: mapRiskLevel(seg.riskLevel),
        title: `航段 ${seg.segmentIndex ?? idx + 1}`,
        desc: seg.reason || seg.recommendation || `风险值 ${formatRisk(seg.risk)}`,
      });
    });

  const measures = Array.isArray(data.measures) ? data.measures : [];
  measures.slice(0, 3).forEach((m) => {
    items.push({
      level: mapRiskLevel(m.level || m.severity),
      title: m.title || m.type || '避险措施',
      desc: m.description || m.action || m.content || '—',
    });
  });

  return items;
});

const aiSummary = computed(() => {
  const c = aiConclusion.value;
  if (!c) return '';
  return c.summary || c.conclusion || c.text || '';
});

const keyRisks = computed(() => {
  const list = aiConclusion.value?.keyRisks;
  return Array.isArray(list) ? list : [];
});

const suggestedActions = computed(() => {
  const list = aiConclusion.value?.suggestedActions;
  return Array.isArray(list) ? list : [];
});

const disclaimer = computed(() => aiConclusion.value?.disclaimer || '');

function mapRiskLevel(level) {
  const key = String(level || '').toLowerCase();
  if (key.includes('high') || key.includes('danger') || key.includes('l2')) return 'danger';
  if (key.includes('medium') || key.includes('warn') || key.includes('l1')) return 'warning';
  return 'info';
}

function formatRisk(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return (num * 100).toFixed(0) + '%';
}

function locateRoute() {
  if (!routeId.value) return;
  dashboardEventBus.emit(DASHBOARD_EVENTS.WARNING_LOCATE, {
    targetType: 'ROUTE',
    targetId: routeId.value,
  });
}

async function loadAnalysis() {
  if (!routeId.value) {
    analysis.value = null;
    return;
  }
  analysis.value = await fetchRouteRiskAnalysis(routeId.value, {
    currentTime: timelineTime.value,
  });
}

async function loadAi() {
  if (!routeId.value || !appStore.regionId) {
    aiConclusion.value = null;
    return;
  }
  aiLoading.value = true;
  try {
    aiConclusion.value = await fetchAiConclusion({
      scene: 'route_avoidance',
      regionId: appStore.regionId,
      targetType: 'ROUTE',
      targetId: routeId.value,
      time: timelineTime.value,
    });
  } catch (err) {
    console.warn('[RouteAvoidancePanel] AI conclusion failed', err);
    aiConclusion.value = null;
  } finally {
    aiLoading.value = false;
  }
}

async function load() {
  await loadAnalysis();
  await loadAi();
}

const { loading, error, reload } = usePanelRefresh(load);

watch(routeId, reload);
watch(timelineTime, reload);
</script>

<style scoped lang="scss">
.route-avoidance {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
  overflow-y: auto;
}

.route-avoidance__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-avoidance__heading {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.route-avoidance__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-avoidance__item {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(8, 18, 40, 0.72);
  cursor: pointer;

  &--danger { border-left: 2px solid #ef4444; }
  &--warning { border-left: 2px solid #f59e0b; }
  &--info { border-left: 2px solid #3b82f6; }
}

.route-avoidance__item-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
}

.route-avoidance__item-desc {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}

.route-avoidance__summary {
  margin: 0;
  font-size: 12px;
  color: #e2e8f0;
  line-height: 1.5;
}

.route-avoidance__bullets,
.route-avoidance__actions {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: #cbd5e1;
  line-height: 1.45;
}

.route-avoidance__disclaimer {
  margin: 0;
  font-size: 10px;
  color: #64748b;
}

.route-avoidance__skeleton,
.route-avoidance__muted {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}
</style>
