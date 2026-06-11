<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId || !items.length"
    :empty-text="landingPointId ? '暂无关联预警' : '请选择起降点'"
    :retry="reload"
  >
    <ul class="target-warnings">
      <li
        v-for="item in items"
        :key="item.warningId"
        class="target-warnings__row"
        :class="`target-warnings__row--${item.level}`"
        role="button"
        tabindex="0"
        @click="openWarning(item)"
        @keyup.enter="openWarning(item)"
      >
        <span v-if="isWarningUnread(item.status)" class="target-warnings__unread" aria-label="未读" />
        <span class="target-warnings__dot" aria-hidden="true" />
        <span class="target-warnings__title">{{ item.title || item.detail }}</span>
        <time class="target-warnings__time">{{ item.startTime }}</time>
      </li>
    </ul>
  </AsyncState>
</template>

<script setup>
import { ref, watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchWarnings } from '@/api/v2/warning';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { filterWarningsByTarget } from '@/utils/warningFilter';
import { isWarningUnread } from '@/utils/warningStatus';

const appStore = useAppDashboardStore();
const { landingPointId } = useDrillFocus();
const items = ref([]);

async function load() {
  if (!appStore.regionId || !landingPointId.value) {
    items.value = [];
    return;
  }
  const list = await fetchWarnings({
    regionId: appStore.regionId,
    statuses: 'NEW,ACKNOWLEDGED',
  });
  items.value = filterWarningsByTarget(list, {
    targetType: 'LANDING_POINT',
    targetId: landingPointId.value,
  });
}

function openWarning(item) {
  appStore.openWarningDrawer(item.warningId);
}

const { loading, error, reload } = usePanelRefresh(load, { refreshOnWarning: true });

watch(landingPointId, reload);
</script>

<style scoped lang="scss">
.target-warnings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 100%;
  overflow-y: auto;
}

.target-warnings__row {
  position: relative;
  display: grid;
  grid-template-columns: 6px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(8, 18, 40, 0.72);
  cursor: pointer;
  min-width: 0;

  &:hover {
    background: rgba(37, 99, 235, 0.14);
  }

  &--danger {
    border-left: 2px solid #ef4444;
    .target-warnings__dot { background: #ef4444; }
  }

  &--warning {
    border-left: 2px solid #f59e0b;
    .target-warnings__dot { background: #f59e0b; }
  }

  &--info {
    border-left: 2px solid #3b82f6;
    .target-warnings__dot { background: #3b82f6; }
  }
}

.target-warnings__unread {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
}

.target-warnings__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.target-warnings__title {
  font-size: 12px;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.target-warnings__time {
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}
</style>
