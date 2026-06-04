<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!items.length"
    empty-text="该航路暂无预警"
    :retry="reload"
  >
    <ul class="route-warnings">
      <li
        v-for="item in items"
        :key="item.warningId"
        class="route-warnings__item"
        :class="`route-warnings__item--${item.level}`"
        role="button"
        tabindex="0"
        @click="openWarning(item)"
      >
        <span v-if="isWarningUnread(item.status)" class="route-warnings__unread" aria-label="未读" />
        <div class="route-warnings__head">
          <span>{{ item.title || '航路预警' }}</span>
          <span class="route-warnings__time">{{ item.startTime }}</span>
        </div>
        <p class="route-warnings__detail">{{ item.detail }}</p>
        <span v-if="item.status === 'HANDLED'" class="route-warnings__status">已处理</span>
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
import { isWarningUnread } from '@/utils/warningStatus';

const appStore = useAppDashboardStore();
const { routeId } = useDrillFocus();
const items = ref([]);

async function load() {
  if (!routeId.value) {
    items.value = [];
    return;
  }
  const list = await fetchWarnings({
    statuses: 'NEW,ACKNOWLEDGED,HANDLED',
  });
  items.value = (Array.isArray(list) ? list : []).filter((w) => {
    const raw = w.raw || {};
    return raw.targetType === 'ROUTE' && String(raw.targetId) === String(routeId.value);
  });
}

function openWarning(item) {
  appStore.openWarningDrawer(item.warningId);
}

watch(routeId, () => reload());

const { loading, error, reload } = usePanelRefresh(load, { refreshOnWarning: true });
</script>

<style scoped lang="scss">
.route-warnings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 100%;
  overflow-y: auto;
}

.route-warnings__item {
  position: relative;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(15, 36, 51, 0.55);
  border-left: 3px solid #64748b;
  cursor: pointer;

  &--danger {
    border-left-color: #ef4444;
  }

  &--warning {
    border-left-color: #f59e0b;
  }
}

.route-warnings__unread {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.75);
  pointer-events: none;
}

.route-warnings__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.route-warnings__time {
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
}

.route-warnings__detail {
  margin: 6px 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}

.route-warnings__status {
  font-size: 11px;
  color: #60a5fa;
}
</style>
