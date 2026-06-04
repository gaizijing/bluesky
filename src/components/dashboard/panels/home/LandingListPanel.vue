<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!filteredCards.length"
    empty-text="暂无起降点"
    :retry="reload"
  >
    <div class="landing-overview">
      <div class="landing-overview__toolbar">
        <div class="landing-overview__filter">
          <span class="landing-overview__filter-label">起降场类型</span>
          <div class="landing-type-filter" role="group" aria-label="起降场类型">
            <button
              v-for="opt in typeFilterOptions"
              :key="opt.value"
              type="button"
              class="landing-type-filter__btn"
              :class="{ 'landing-type-filter__btn--active': typeFilter === opt.value }"
              @click="typeFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="landing-overview__summary">
          <div
            v-for="item in summaryItems"
            :key="item.level"
            class="landing-overview__stat"
          >
            <span class="landing-overview__h" :style="hIconStyle(item.color)">H</span>
            <span class="landing-overview__stat-num">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <div class="landing-overview__list">
        <button
          v-for="card in filteredCards"
          :key="card.id"
          type="button"
          class="landing-card"
          @click="onCardClick(card)"
        >
          <div class="landing-card__head">
            <span class="landing-card__icon" :style="hIconStyle(colorOf(card.currentLevel))">H</span>
            <span class="landing-card__name">{{ card.name }}</span>
          </div>
          <div v-if="displaySlots(card).length" class="landing-card__matrix">
            <div
              v-for="slot in displaySlots(card)"
              :key="slot.bucketTime"
              class="landing-card__slot"
              :title="`${slot.time} ${landingOverviewLabel(slot.level)}`"
            >
              <span
                class="landing-card__bar"
                :class="`landing-card__bar--${slot.level.toLowerCase()}`"
                :style="{ background: colorOf(slot.level) }"
              />
              <span class="landing-card__time">{{ slot.time }}</span>
            </div>
          </div>
          <div v-else class="landing-card__empty">无预测数据</div>
        </button>
      </div>
    </div>
  </AsyncState>
</template>

<script setup>
import { computed, ref } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchLandingPoints } from '@/api/v2/landing';
import { fetchLandingMatrix } from '@/api/flyability';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import {
  flyabilityColor,
  landingOverviewLabel,
} from '@/utils/flyabilityLevel';
import {
  countLevels,
  parseLandingMatrixOverview,
} from '@/utils/flyabilityMatrix';

const MATRIX_HOURS = 2;
const MATRIX_SLOT_LIMIT = 6;

const appStore = useAppDashboardStore();
const cards = ref([]);
const typeFilter = ref('all');

const typeFilterOptions = [
  { label: '全选', value: 'all' },
  { label: '起降点', value: 'takeoff' },
  { label: '作业点', value: 'operation' },
];

const legendItems = [
  { level: 'GREEN', label: landingOverviewLabel('GREEN'), color: flyabilityColor('GREEN') },
  { level: 'YELLOW', label: landingOverviewLabel('YELLOW'), color: flyabilityColor('YELLOW') },
  { level: 'RED', label: landingOverviewLabel('RED'), color: flyabilityColor('RED') },
  { level: 'GRAY', label: landingOverviewLabel('GRAY'), color: flyabilityColor('GRAY') },
];

const filteredCards = computed(() => {
  if (typeFilter.value === 'all') return cards.value;
  return cards.value.filter((c) => c.type === typeFilter.value);
});

const summaryItems = computed(() => {
  const counts = countLevels(filteredCards.value);
  return legendItems.map((item) => ({
    ...item,
    count: counts[item.level] || 0,
  }));
});

function colorOf(level) {
  return flyabilityColor(level);
}

function hIconStyle(color) {
  return {
    borderColor: color,
    color,
    boxShadow: `0 0 10px ${color}66, inset 0 0 8px ${color}22`,
  };
}

function displaySlots(card) {
  return (card.slots || []).slice(0, MATRIX_SLOT_LIMIT);
}

async function load() {
  if (!appStore.regionId) {
    cards.value = [];
    return;
  }
  const [points, matrixRes] = await Promise.all([
    fetchLandingPoints(appStore.regionId),
    fetchLandingMatrix({
      regionId: appStore.regionId,
      time: appStore.timelineTime,
      hours: MATRIX_HOURS,
    }),
  ]);
  cards.value = parseLandingMatrixOverview(matrixRes, points);
}

function onCardClick(card) {
  appStore.drillLanding(card.id);
}

const { loading, error, reload } = usePanelRefresh(load);
</script>

<style scoped lang="scss">
.landing-overview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.landing-overview__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.landing-overview__filter {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.landing-overview__filter-label {
  flex-shrink: 0;
  font-size: 12px;
  color: #94a3b8;
}

.landing-type-filter {
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  background: rgba(8, 18, 40, 0.88);
  border: 1px solid rgba(59, 130, 246, 0.28);
  gap: 2px;
}

.landing-type-filter__btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  color: #94a3b8;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    color: #e2e8f0;
  }

  &--active {
    color: #f1f5f9;
    background: linear-gradient(180deg, rgba(37, 99, 235, 0.55), rgba(29, 78, 216, 0.45));
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.22);
  }
}

.landing-overview__summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.landing-overview__stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.landing-overview__h {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid;
  font-size: 11px;
  font-weight: 700;
  background: rgba(8, 18, 40, 0.9);
}

.landing-overview__stat-num {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.landing-overview__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
  padding-right: 2px;
}

.landing-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.28);
  background: linear-gradient(180deg, rgba(12, 28, 52, 0.96), rgba(7, 16, 34, 0.94));
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: rgba(96, 165, 250, 0.55);
    box-shadow: 0 0 16px rgba(37, 99, 235, 0.2);
  }
}

.landing-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.landing-card__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(8, 18, 40, 0.92);
}

.landing-card__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.landing-card__matrix {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}

.landing-card__slot {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}

.landing-card__bar {
  display: block;
  width: 100%;
  height: 14px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);

  &--green {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.1),
      0 0 10px rgba(49, 209, 88, 0.45);
  }

  &--yellow {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.1),
      0 0 10px rgba(249, 115, 22, 0.4);
  }

  &--red {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.1),
      0 0 10px rgba(226, 81, 81, 0.45);
  }
}

.landing-card__time {
  font-size: 10px;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.95);
  text-align: center;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.landing-card__empty {
  font-size: 11px;
  color: #64748b;
}
</style>
