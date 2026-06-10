<template>
  <el-badge
    :value="appStore.unreadWarningCount"
    :hidden="appStore.unreadWarningCount === 0"
    :max="99"
    class="warning-bell"
  >
    <el-button circle class="warning-bell__btn" @click="openDrawer">
      <el-icon class="warning-bell__icon"><Bell /></el-icon>
    </el-button>
  </el-badge>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { Bell } from '@element-plus/icons-vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const appStore = useAppDashboardStore();
let timer = null;
let offRegion = null;
let offWarning = null;

function refreshCounts() {
  appStore.refreshWarningCounts();
}

function openDrawer() {
  appStore.openWarningDrawer();
}

onMounted(() => {
  refreshCounts();
  timer = setInterval(refreshCounts, 30000);
  offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, refreshCounts);
  offWarning = dashboardEventBus.on(DASHBOARD_EVENTS.WARNING_CHANGED, refreshCounts);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  offRegion?.();
  offWarning?.();
});
</script>

<style scoped lang="scss">
.warning-bell {
  :deep(.el-badge__content) {
    font-size: 11px;
    height: 18px;
    padding: 0 6px;
    border: none;
  }
}

.warning-bell__btn {
  width: 35px;
  height: 35px;
  padding: 0;
  background: rgba(59, 130, 246, 0.25);
  border: 1px solid rgba(96, 165, 250, 0.35);
  color: #fff;

  &:hover {
    background: rgba(59, 130, 246, 0.45);
    border-color: rgba(147, 197, 253, 0.55);
    color: #fff;
  }
}

.warning-bell__icon {
  font-size: 18px;
}
</style>
