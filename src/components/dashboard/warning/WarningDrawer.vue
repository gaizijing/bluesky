<template>
  <el-drawer
    :model-value="appStore.warningDrawerOpen"
    title="预警中心"
    direction="rtl"
    size="420px"
    append-to-body
    class="warning-drawer"
    @close="appStore.closeWarningDrawer()"
  >
    <div class="warning-drawer__body">
      <div class="warning-drawer__filters">
        <el-select v-model="statusFilter" size="small" placeholder="状态" style="width: 130px">
          <el-option label="全部活跃" value="NEW,ACKNOWLEDGED" />
          <el-option label="未读" value="NEW" />
          <el-option label="已读" value="ACKNOWLEDGED" />
          <el-option label="已处理" value="HANDLED" />
        </el-select>
        <el-select v-model="levelFilter" size="small" placeholder="等级" style="width: 110px">
          <el-option label="全部等级" value="" />
          <el-option label="L1 一般" value="L1" />
          <el-option label="L2 严重" value="L2" />
        </el-select>
        <el-button size="small" @click="reload">刷新</el-button>
      </div>

      <AsyncState
        class="warning-drawer__state"
        :loading="loading && !items.length"
        :error="!!error"
        :empty="!filtered.length && !loading"
        empty-text="暂无预警"
      >
        <div class="warning-drawer__list">
          <button
            v-for="item in filtered"
            :key="item.warningId"
            type="button"
            class="warning-drawer__item"
            :class="{
              'warning-drawer__item--active': item.warningId === selectedId,
              [`warning-drawer__item--${item.level}`]: true,
            }"
            @click="selectItem(item)"
          >
            <span v-if="isWarningUnread(item.status)" class="warning-drawer__unread" aria-label="未读" />
            <span class="warning-drawer__item-dot" aria-hidden="true" />
            <span class="warning-drawer__item-main">
              <span class="warning-drawer__item-title">{{ item.title || '预警' }}</span>
              <span class="warning-drawer__item-meta">
                {{ itemMetaText(item) }}
              </span>
            </span>
            <span class="warning-drawer__item-time">{{ item.startTime }}</span>
          </button>
        </div>
      </AsyncState>

      <section v-if="selected" class="warning-drawer__detail">
        <div class="warning-drawer__detail-scroll">
          <h4 class="warning-drawer__detail-title">{{ selected.title || '预警详情' }}</h4>
          <p class="warning-drawer__detail-content">{{ selected.detail }}</p>
          <dl class="warning-drawer__detail-meta">
            <div><dt>等级</dt><dd>{{ levelText(selected) }}</dd></div>
            <div><dt>类型</dt><dd>{{ selected.raw?.warningType || '—' }}</dd></div>
            <div><dt>目标</dt><dd>{{ selected.raw?.targetType }} / {{ selected.raw?.targetId }}</dd></div>
            <div><dt>状态</dt><dd>{{ statusText(selected.status) }}</dd></div>
          </dl>
          <div v-if="selected.raw?.aiConclusion" class="warning-drawer__ai">
            <strong>AI 解读</strong>
            <p>{{ formatAi(selected.raw.aiConclusion) }}</p>
          </div>
        </div>

        <WarningHandleForm
          class="warning-drawer__handle"
          :warning="selected"
          @done="onHandled"
        />
      </section>

      <div v-else-if="!loading && filtered.length" class="warning-drawer__placeholder">
        选择一条预警查看详情并处理
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import WarningHandleForm from './WarningHandleForm.vue';
import { fetchWarnings, readWarning } from '@/api/v2/warning';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { warningStatusText, isWarningUnread } from '@/utils/warningStatus';

const appStore = useAppDashboardStore();
const items = ref([]);
const loading = ref(false);
const error = ref(null);
const statusFilter = ref('NEW,ACKNOWLEDGED');
const levelFilter = ref('');
const selectedId = ref(null);
const markingReadIds = ref(new Set());

const LEVEL_LABEL = { danger: '严重', warning: '警告', info: '一般' };
const TARGET_LABEL = { takeoff: '起降点', route: '航路', airspace: '空域' };

const selected = computed(() => items.value.find((i) => i.warningId === selectedId.value));

const filtered = computed(() => {
  let list = items.value;
  if (levelFilter.value) {
    list = list.filter((w) => String(w.raw?.warningType || '').startsWith(levelFilter.value));
  }
  return list;
});

function levelText(item) {
  return LEVEL_LABEL[item.level] || '预警';
}

function targetText(item) {
  return TARGET_LABEL[item.targetType] || '区域';
}

function itemMetaText(item) {
  const parts = [targetText(item)];
  if (item.status === 'HANDLED') parts.push('已处理');
  else if (item.status === 'CLOSED') parts.push('已关闭');
  return parts.join(' · ');
}

function emitWarningChanged() {
  dashboardEventBus.emit(DASHBOARD_EVENTS.WARNING_CHANGED);
  dashboardEventBus.emit(DASHBOARD_EVENTS.WARNING_TOAST_CLICKED, { refresh: true });
}

function statusText(status) {
  return warningStatusText(status);
}

function formatAi(payload) {
  if (typeof payload === 'string') return payload;
  return payload?.summary || payload?.conclusion || JSON.stringify(payload);
}

function syncSelection() {
  const focusId = appStore.warningDrawerFocusId;
  if (focusId && filtered.value.some((w) => w.warningId === focusId)) {
    selectedId.value = focusId;
    return;
  }
  if (selectedId.value && filtered.value.some((w) => w.warningId === selectedId.value)) {
    return;
  }
  selectedId.value = filtered.value[0]?.warningId || null;
}

async function reload() {
  if (!appStore.regionId) {
    items.value = [];
    selectedId.value = null;
    return;
  }
  const silent = items.value.length > 0;
  if (!silent) {
    loading.value = true;
    error.value = null;
  }
  try {
    items.value = await fetchWarnings({ statuses: statusFilter.value });
    syncSelection();
    if (silent) error.value = null;
  } catch (err) {
    if (!silent) error.value = err;
  } finally {
    loading.value = false;
  }
}

function locateWarning(item) {
  const raw = item?.raw || {};
  if (!raw.targetId) return;
  dashboardEventBus.emit(DASHBOARD_EVENTS.WARNING_LOCATE, {
    targetType: raw.targetType,
    targetId: raw.targetId,
    warningId: item.warningId,
  });
}

function selectItem(item) {
  selectedId.value = item.warningId;
  locateWarning(item);
}

async function markAsReadIfNeeded(item) {
  if (!item?.warningId || item.status !== 'NEW') return;
  if (markingReadIds.value.has(item.warningId)) return;

  markingReadIds.value.add(item.warningId);
  try {
    await readWarning(item.warningId, '查看详情');
    item.status = 'ACKNOWLEDGED';
    if (item.raw) item.raw.status = 'ACKNOWLEDGED';
    emitWarningChanged();
  } catch (err) {
    console.warn('[WarningDrawer] mark read failed', err);
  } finally {
    markingReadIds.value.delete(item.warningId);
  }
}

function onHandled() {
  reload();
  emitWarningChanged();
}

watch(
  () => appStore.warningDrawerOpen,
  (open) => {
    if (open) {
      selectedId.value = appStore.warningDrawerFocusId;
      reload();
    }
  }
);

watch(statusFilter, reload);
watch(filtered, syncSelection);
watch(selected, (item) => {
  if (item) markAsReadIfNeeded(item);
});
</script>

<style scoped lang="scss">
.warning-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.warning-drawer__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.warning-drawer__state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.async-state),
  :deep(.async-state__content) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.warning-drawer__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 2px;
}

.warning-drawer__item {
  position: relative;
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.04);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease, background 0.12s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.08);
  }

  &--active {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.12);
  }

  &--danger .warning-drawer__item-dot {
    background: #ef4444;
  }

  &--warning .warning-drawer__item-dot {
    background: #f59e0b;
  }

  &--info .warning-drawer__item-dot {
    background: #3b82f6;
  }
}

.warning-drawer__unread {
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

.warning-drawer__item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  align-self: center;
}

.warning-drawer__item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.warning-drawer__item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.warning-drawer__item-meta {
  font-size: 11px;
  color: #64748b;
}

.warning-drawer__item-time {
  font-size: 11px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.warning-drawer__detail {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: 48%;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  min-height: 0;
}

.warning-drawer__detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  margin-bottom: 10px;
}

.warning-drawer__detail-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
}

.warning-drawer__detail-content {
  margin: 0 0 10px;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.warning-drawer__detail-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin: 0 0 10px;
  font-size: 11px;

  div {
    display: flex;
    gap: 6px;
    min-width: 0;
  }

  dt {
    flex-shrink: 0;
    margin: 0;
    color: #94a3b8;
  }

  dd {
    margin: 0;
    color: #334155;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.warning-drawer__ai {
  margin-bottom: 4px;
  padding: 8px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.08);
  font-size: 12px;
  line-height: 1.45;

  p {
    margin: 4px 0 0;
    color: #475569;
  }
}

.warning-drawer__handle {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.warning-drawer__placeholder {
  flex-shrink: 0;
  margin-top: 10px;
  padding: 12px;
  border-radius: 6px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
</style>

<style lang="scss">
.warning-drawer.el-drawer {
  .el-drawer__body {
    height: calc(100% - 54px);
    padding: 12px 16px 16px;
    overflow: hidden;
  }
}
</style>
