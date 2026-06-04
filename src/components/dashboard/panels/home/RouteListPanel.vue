<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!overview.routeRows.length"
    empty-text="暂无航路，请先在控制台导入航路"
    :retry="reload"
  >
    <div class="route-overview">
      <div class="route-overview__list">
        <div
          v-for="route in overview.routeRows"
          :key="route.id"
          class="route-row"
        >
          <button
            type="button"
            class="route-row__name"
            :title="route.name"
            @click="onRouteClick(route)"
          >
            {{ route.name }}
          </button>
          <div
            v-if="displaySlots(route).length"
            class="route-row__matrix"
            :style="{ '--slot-count': displaySlots(route).length }"
          >
            <button
              v-for="slot in displaySlots(route)"
              :key="slot.bucketTime"
              type="button"
              class="route-row__cell"
              :class="`route-row__cell--${slot.level.toLowerCase()}`"
              :style="{ background: colorOf(slot.level) }"
              :title="`${route.name} ${slot.label} ${routeOverviewLabel(slot.level)}`"
              @click="onRouteClick(route)"
            >
              {{ slot.label }}
            </button>
          </div>
          <div v-else class="route-row__empty">无数据</div>
        </div>
      </div>
    </div>
  </AsyncState>
</template>

<script setup>
import { ref } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchRoutes } from '@/api/v2/route';
import { fetchRouteMatrix } from '@/api/flyability';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import {
  flyabilityColor,
  routeOverviewLabel,
} from '@/utils/flyabilityLevel';
import { parseRouteMatrixOverview } from '@/utils/flyabilityMatrix';

const MATRIX_HOURS = 2;
const MATRIX_SLOT_LIMIT = 6;

const appStore = useAppDashboardStore();
const overview = ref({ routes: [], routeRows: [], timeRows: [], grid: [], bucketTime: null });

function colorOf(level) {
  return flyabilityColor(level);
}

function displaySlots(route) {
  return (route.slots || []).slice(0, MATRIX_SLOT_LIMIT);
}

async function load() {
  if (!appStore.regionId) {
    overview.value = { routes: [], routeRows: [], timeRows: [], grid: [], bucketTime: null };
    return;
  }
  const page = await fetchRoutes(appStore.regionId, 1, 50);
  const records = page?.records || [];
  if (!records.length) {
    overview.value = { routes: [], routeRows: [], timeRows: [], grid: [], bucketTime: null };
    return;
  }

  const matrixList = await Promise.all(
    records.map((r) =>
      fetchRouteMatrix({
        regionId: appStore.regionId,
        routeId: r.routeId || r.id,
        routeVersionId: r.routeVersionId || r.currentVersionId,
        time: appStore.timelineTime,
        hours: MATRIX_HOURS,
      }).catch(() => ({ matrix: [] }))
    )
  );

  overview.value = parseRouteMatrixOverview(records, matrixList);
}

function onRouteClick(route) {
  if (!route?.id) return;
  appStore.drillRoute(route.id);
}

const { loading, error, reload } = usePanelRefresh(load);
</script>

<style scoped lang="scss">
.route-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.route-overview__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 2px;
}

.route-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 4px;
  align-items: stretch;
  min-height: 24px;
}

.route-row__name {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  background: rgba(22, 24, 32, 0.92);
  color: rgba(226, 232, 240, 0.92);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.12s ease, color 0.12s ease;

  &:hover {
    border-color: rgba(148, 163, 184, 0.35);
    color: #f8fafc;
  }
}

.route-row__matrix {
  display: grid;
  grid-template-columns: repeat(var(--slot-count, 6), minmax(0, 1fr));
  gap: 3px;
  min-width: 0;
}

.route-row__cell {
  min-width: 0;
  height: 24px;
  padding: 0 1px;
  border: none;
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 9px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
  transition: filter 0.12s ease, transform 0.12s ease;

  &--green {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 0 8px rgba(49, 209, 88, 0.25);
  }

  &--yellow {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 0 8px rgba(249, 115, 22, 0.28);
  }

  &--red {
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 0 8px rgba(226, 81, 81, 0.28);
  }

  &:hover {
    filter: brightness(1.08);
    transform: scale(1.02);
  }
}

.route-row__empty {
  display: flex;
  align-items: center;
  padding-left: 4px;
  font-size: 11px;
  color: #64748b;
}
</style>
