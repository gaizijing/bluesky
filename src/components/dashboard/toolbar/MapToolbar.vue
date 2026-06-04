<template>
  <div
    class="map-toolbar"
    :class="{ 'map-toolbar--panels-hidden': appStore.panelsHidden }"
  >
    <el-tooltip
      v-for="item in toolbarItems"
      :key="item.key"
      :content="item.label"
      placement="left"
    >
      <button
        class="map-toolbar__btn"
        :class="{ active: item.active }"
        type="button"
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
} from '@element-plus/icons-vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const appStore = useAppDashboardStore();
const configuredItems = dashboardConfig.toolbar.items || [];

const actionMap = {
  hide: {
    label: '隐藏面板',
    icon: Hide,
    onClick: () => appStore.togglePanelsHidden(),
  },
  home: {
    label: '首页视图',
    icon: HomeFilled,
    onClick: () => appStore.setView('home'),
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
};

const toolbarItems = computed(() =>
  configuredItems
    .map((key) => {
      const base = actionMap[key];
      if (!base) return null;
      return {
        key,
        ...base,
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
    .filter(Boolean)
);
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

  /* 有面板：贴在右侧面板左缘外侧、靠上 */
  top: calc(var(--dash-header-height, 88px) + 12px);
  right: calc(25% + 35px + 12px);
  transform: none;

  /* 隐藏面板：仅右移到屏幕边缘，垂直位置不变 */
  &--panels-hidden {
    right: 16px;
  }
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

  &:hover,
  &.active {
    background: rgba(37, 99, 235, 0.55);
    border-color: rgba(96, 165, 250, 0.8);
  }
}
</style>
