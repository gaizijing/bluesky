<template>
  <el-badge :value="count" :hidden="count === 0" :max="99" class="warning-bell">
    <el-button circle class="warning-bell__btn" @click="openDrawer">
      <el-icon class="warning-bell__icon"><Bell /></el-icon>
    </el-button>
  </el-badge>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Bell } from '@element-plus/icons-vue';
import { fetchWarnings } from '@/api/v2/warning';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const appStore = useAppDashboardStore();
const count = ref(0);
let timer = null;
let offRegion = null;
let offWarning = null;

async function refreshCount() {
  if (!appStore.regionId) {
    count.value = 0;
    return;
  }
  try {
    const list = await fetchWarnings({ statuses: 'NEW' });
    count.value = Array.isArray(list) ? list.length : 0;
  } catch {
    count.value = 0;
  }
}

function openDrawer() {
  appStore.openWarningDrawer();
}

onMounted(() => {
  refreshCount();
  timer = setInterval(refreshCount, 30000);
  offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, refreshCount);
  offWarning = dashboardEventBus.on(DASHBOARD_EVENTS.WARNING_CHANGED, refreshCount);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  offRegion?.();
  offWarning?.();
});

watch(() => appStore.regionId, refreshCount);
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
  width: 36px;
  height: 36px;
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
