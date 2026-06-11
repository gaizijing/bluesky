<template>
  <span class="warning-toast-host" aria-hidden="true" />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { ElNotification } from 'element-plus';
import { fetchWarnings } from '@/api/v2/warning';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const appStore = useAppDashboardStore();
const seenIds = new Set();
let timer = null;
let offRegion = null;
let initialized = false;

const LEVEL_TYPE = {
  danger: 'error',
  warning: 'warning',
  info: 'info',
};

function showToast(item) {
  ElNotification({
    title: item.title || '新预警',
    message: item.detail || item.title || '请查看预警详情',
    type: LEVEL_TYPE[item.level] || 'warning',
    duration: 8000,
    position: 'top-right',
    onClick: () => {
      appStore.openWarningDrawer(item.warningId);
      dashboardEventBus.emit(DASHBOARD_EVENTS.WARNING_TOAST_CLICKED, {
        warningId: item.warningId,
        refresh: true,
      });
    },
  });
}

function markSeen(list) {
  (list || []).forEach((item) => {
    if (item?.warningId) seenIds.add(item.warningId);
  });
}

async function seedSeenWarnings() {
  if (!appStore.regionId) return;
  try {
    const list = await fetchWarnings({
      regionId: appStore.regionId,
      statuses: 'NEW,ACKNOWLEDGED,HANDLED',
    });
    markSeen(list);
    initialized = true;
  } catch (err) {
    console.warn('[WarningToast] seed failed', err);
  }
}

async function pollNewWarnings() {
  if (!appStore.regionId || !initialized) return;
  try {
    const list = await fetchWarnings({
      regionId: appStore.regionId,
      statuses: 'NEW',
    });
    (list || []).forEach((item) => {
      if (!item?.warningId || seenIds.has(item.warningId)) return;
      seenIds.add(item.warningId);
      showToast(item);
    });
  } catch (err) {
    console.warn('[WarningToast] poll failed', err);
  }
}

async function onRegionChanged() {
  seenIds.clear();
  initialized = false;
  await seedSeenWarnings();
}

onMounted(async () => {
  await seedSeenWarnings();
  timer = setInterval(pollNewWarnings, 30000);
  offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, onRegionChanged);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  offRegion?.();
});
</script>

<style scoped>
.warning-toast-host {
  display: none;
}
</style>
