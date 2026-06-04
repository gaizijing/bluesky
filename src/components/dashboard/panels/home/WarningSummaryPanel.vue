<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!items.length"
    empty-text="暂无预警"
    :retry="reload"
  >
    <ul class="warning-summary">
      <li
        v-for="item in items"
        :key="item.warningId"
        class="warning-row"
        :class="`warning-row--${item.level}`"
        role="button"
        tabindex="0"
        :title="item.title || item.detail"
        @click="openWarning(item)"
        @keyup.enter="openWarning(item)"
      >
        <span v-if="isWarningUnread(item.status)" class="warning-row__unread" aria-label="未读" />
        <span class="warning-row__dot" aria-hidden="true" />
        <span class="warning-row__level">{{ levelLabel(item) }}</span>
        <span class="warning-row__title">{{ item.title || item.detail }}</span>
        <time class="warning-row__time">{{ item.startTime }}</time>
      </li>
    </ul>

    <button v-if="items.length" type="button" class="warning-summary__more" @click="openAll">
      查看全部预警
    </button>
  </AsyncState>
</template>

<script setup>
import { ref } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { fetchWarnings } from '@/api/v2/warning';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { usePanelRefresh } from '@/composables/usePanelRefresh';
import { isWarningUnread } from '@/utils/warningStatus';

const appStore = useAppDashboardStore();
const items = ref([]);

const SUMMARY_LIMIT = 5;
const LEVEL_LABEL = { danger: '严重', warning: '警告', info: '一般' };

async function load() {
  if (!appStore.regionId) {
    items.value = [];
    return;
  }
  const list = await fetchWarnings({
    regionId: appStore.regionId,
    statuses: 'NEW,ACKNOWLEDGED',
    limit: SUMMARY_LIMIT,
  });
  items.value = Array.isArray(list) ? list : [];
}

function levelLabel(item) {
  return LEVEL_LABEL[item.level] || '预警';
}

function openWarning(item) {
  appStore.openWarningDrawer(item.warningId);
}

function openAll() {
  appStore.openWarningDrawer();
}

const { loading, error, reload } = usePanelRefresh(load, { refreshOnWarning: true });
</script>

<style scoped lang="scss">
.warning-summary {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(100% - 32px);
  overflow-y: auto;
}

.warning-row {
  position: relative;
  display: grid;
  grid-template-columns: 6px auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(8, 18, 40, 0.72);
  cursor: pointer;
  min-width: 0;
  transition: background 0.12s ease, border-color 0.12s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.14);
    border-color: rgba(96, 165, 250, 0.35);
  }

  &--danger {
    border-left: 2px solid #ef4444;

    .warning-row__dot {
      background: #ef4444;
    }

    .warning-row__level {
      color: #fca5a5;
    }
  }

  &--warning {
    border-left: 2px solid #f59e0b;

    .warning-row__dot {
      background: #f59e0b;
    }

    .warning-row__level {
      color: #fcd34d;
    }
  }

  &--info {
    border-left: 2px solid #3b82f6;

    .warning-row__dot {
      background: #3b82f6;
    }

    .warning-row__level {
      color: #93c5fd;
    }
  }
}

.warning-row__unread {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.75);
  pointer-events: none;
}

.warning-row__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  justify-self: center;
}

.warning-row__level {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.warning-row__title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.warning-row__time {
  font-size: 10px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.warning-summary__more {
  margin-top: 6px;
  width: 100%;
  padding: 6px;
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;

  &:hover {
    color: #bfdbfe;
    border-color: rgba(96, 165, 250, 0.4);
  }
}
</style>
