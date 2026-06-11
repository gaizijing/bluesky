<template>
  <div class="map-toolbar" :style="toolbarStyle">
    <el-tooltip
      v-for="item in toolbarItems"
      :key="item.key"
      :content="item.label"
      placement="left"
    >
      <button
        class="map-toolbar__btn"
        :class="{ active: item.active, disabled: item.disabled }"
        type="button"
        :disabled="item.disabled"
        @click="item.onClick"
      >
        <el-icon><component :is="item.icon" /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  Hide,
  HomeFilled,
  Collection,
  Aim,
  Promotion,
  Delete,
  VideoCamera,
} from '@element-plus/icons-vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { getMapToolbarRightInset } from '@/utils/dashboardLayout';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const appStore = useAppDashboardStore();
const configuredItems = dashboardConfig.toolbar.items || [];
/** 仅联飞视图显示的工具（离开 simFlight 即隐藏） */
const SIM_FLIGHT_TOOL_KEYS = ['focusAircraft', 'clearTrail'];

const toolbarStyle = computed(() => {
  if (appStore.panelsHidden) {
    return { right: '16px' };
  }
  const inset = getMapToolbarRightInset(appStore.view, appStore.showHomeWarningSummary);
  return { right: inset ?? '16px' };
});

const actionMap = {
  hide: {
    label: '隐藏面板',
    icon: Hide,
    onClick: () => appStore.togglePanelsHidden(),
  },
  home: {
    label: '首页视图',
    icon: HomeFilled,
    onClick: () => appStore.goHome(),
  },
  legend: {
    label: '图例',
    icon: Collection,
    onClick: () => appStore.toggleLegend(),
  },
  pick: {
    label: '拾取',
    icon: Aim,
    onClick: () => appStore.togglePickMode(),
  },
  simFlight: {
    label: '联飞视图',
    icon: Promotion,
    onClick: () => appStore.enterSimFlight(appStore.routeIdForSim),
  },
  clearTrail: {
    label: '清除尾迹',
    icon: Delete,
    onClick: () => dashboardEventBus.emit(DASHBOARD_EVENTS.CLEAR_ISIM_TRAIL),
  },
  focusAircraft: {
    label: '聚焦飞机',
    icon: VideoCamera,
    onClick: () => dashboardEventBus.emit(DASHBOARD_EVENTS.FOCUS_ISIM_AIRCRAFT),
  },
};

const toolbarItems = computed(() => {
  const inSimFlight = appStore.view === 'simFlight';
  const keys = configuredItems.filter(
    (key) => inSimFlight || !SIM_FLIGHT_TOOL_KEYS.includes(key),
  );
  if (inSimFlight) {
    SIM_FLIGHT_TOOL_KEYS.forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
  }

  return keys
    .map((key) => {
      const base = actionMap[key];
      if (!base) return null;
      return {
        key,
        ...base,
        disabled: key === 'focusAircraft' ? !appStore.simConnected : false,
        label: key === 'hide'
          ? (appStore.panelsHidden ? '显示面板' : '隐藏面板')
          : base.label,
        active:
          key === 'hide' ? appStore.panelsHidden
          : key === 'home' ? appStore.view === 'home'
          : key === 'legend' ? appStore.legendOpen
          : key === 'pick' ? appStore.pickMode
          : key === 'simFlight' ? appStore.view === 'simFlight'
          : false,
      };
    })
    .filter(Boolean);
});
</script>

<style scoped lang="scss">
.map-toolbar {
  position: absolute;
  z-index: 16;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
  transition: right 0.2s ease;
  top: calc(var(--dash-header-height, 88px) + 12px);
}

.map-toolbar__btn {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(15, 23, 51, 0.85);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled),
  &.active {
    background: rgba(37, 99, 235, 0.55);
    border-color: rgba(96, 165, 250, 0.8);
  }

  &:disabled,
  &.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
</style>
