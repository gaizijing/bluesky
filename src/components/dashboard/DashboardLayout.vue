<template>
  <div class="dashboard-layout" :style="layoutStyle">
    <template v-for="mod in visibleModules" :key="mod.id">
      <div
        v-if="hasVisiblePanels(mod)"
        class="dashboard-module"
        :class="regionClass(mod)"
        :style="moduleStyle(mod)"
      >
        <div
          v-for="panel in sortedPanels(mod.panels)"
          :key="panel.id"
          class="main-panel"
          :class="[
            bgClass(mod.region),
            { 'main-panel--chromeless': !showPanelTitle(panel, mod) },
          ]"
          :style="panelStyle(panel, mod)"
        >
          <div v-if="showPanelTitle(panel, mod)" class="panel-header">
            <span class="panel-title">{{ panel.title }}</span>
          </div>
          <div
            class="panel-content"
            :class="{ 'panel-content--chromeless': !showPanelTitle(panel, mod) }"
          >
            <component
              :is="resolvePanel(panel.component)"
              :panel-id="panel.id"
              :title="panel.title"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useSimLiveGate } from '@/composables/useSimLiveGate';

const panelModules = import.meta.glob('@/components/dashboard/panels/**/*.vue');
const headerHeight = dashboardConfig.header?.height ?? 88;
const timelineHeight = dashboardConfig.main?.timeline?.height ?? 48;

const appStore = useAppDashboardStore();
const { hasLiveFlight } = useSimLiveGate();

const visibleModules = computed(() => {
  const view = dashboardConfig.main.views[appStore.view];
  const modules = view?.modules ?? [];
  if (appStore.view === 'simFlight') {
    return modules.filter((mod) => {
      if (mod.id === 'sim-mini') return hasLiveFlight.value;
      return true;
    });
  }
  if (appStore.view !== 'home') return modules;
  return modules.filter((mod) => {
    if (mod.id === 'home-right' || mod.module === 'warningSummary') {
      return appStore.showHomeWarningSummary;
    }
    return true;
  });
});

const bottomPanelHeight = computed(() => {
  const view = dashboardConfig.main.views[appStore.view];
  const mod = (view?.modules ?? []).find((m) => m.region === 'bottom-full');
  if (!mod?.height) return 0;
  const px = parseInt(String(mod.height), 10);
  return Number.isFinite(px) ? px : 0;
});

const layoutStyle = computed(() => ({
  '--dash-bottom-panel-height': bottomPanelHeight.value
    ? `${bottomPanelHeight.value + 16}px`
    : '0px',
}));

function hasVisiblePanels(mod) {
  return (mod.panels || []).some((p) => p.visible !== false);
}

function sortedPanels(panels = []) {
  return [...panels]
    .filter((p) => p.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function showPanelTitle(panel, mod) {
  if (mod.hideTitleBar || panel.hideTitleBar) return false;
  if (panel.showTitleBar === false) return false;
  return Boolean(panel.title);
}

function resolvePanel(componentPath) {
  const fileName = componentPath.split('/').pop();
  const key = Object.keys(panelModules).find((k) => k.endsWith(`/${fileName}`));
  if (!key) {
    console.warn('[DashboardLayout] panel not found:', componentPath);
    return defineAsyncComponent(() => import('./panels/_placeholders/PlaceholderPanel.vue'));
  }
  return defineAsyncComponent(panelModules[key]);
}

function regionClass(mod) {
  const region = mod.region;
  if (region === 'left') return 'left-panel dashboard-module--left';
  if (region === 'right') return 'right-panel dashboard-module--right';
  if (region === 'bottom') return 'bottom-panel';
  if (region === 'bottom-full') return 'bottom-full-panel';
  if (region === 'float-top-right') return 'float-top-right-panel';
  if (region === 'float-bottom-right') return 'float-bottom-right-panel';
  return 'float-panel';
}

function bgClass(region) {
  if (region === 'right' || String(region).includes('right')) return 'right_bg';
  if (region === 'bottom-full') return 'left_bg';
  return 'left_bg';
}

function moduleStyle(mod) {
  const style = {
    '--dash-header-height': `${headerHeight}px`,
    '--dash-timeline-height': `${timelineHeight}px`,
  };
  if (mod.width) style.width = mod.width;
  if (mod.height) style.height = mod.height;
  if (mod.width && mod.region === 'bottom-full') {
    style.left = '50%';
    style.right = 'auto';
    style.transform = 'translateX(-50%)';
  }
  return style;
}

function panelStyle(panel, mod) {
  const style = { minHeight: 0 };
  if (panel.height && panel.height !== '100%') {
    style.flex = `0 0 ${panel.height}`;
    style.height = panel.height;
    style.maxHeight = panel.height;
  } else {
    style.flex = '1 1 auto';
  }
  if (mod.region === 'bottom-full' || mod.hideTitleBar) {
    style.marginBottom = showPanelTitle(panel, mod) ? undefined : '0';
  }
  return style;
}
</script>

<style scoped lang="scss">
.dashboard-layout {
  pointer-events: none;
}

.dashboard-module {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-module--left,
.dashboard-module--right {
  top: calc(var(--dash-header-height, 88px) + 12px);
  height: calc(
    100vh - var(--dash-header-height, 88px) - var(--dash-timeline-height, 48px)
      - var(--dash-bottom-panel-height, 0px) - 24px
  );
  max-height: calc(
    100vh - var(--dash-header-height, 88px) - var(--dash-timeline-height, 48px)
      - var(--dash-bottom-panel-height, 0px) - 24px
  );
  min-height: 0;
}

.dashboard-module .main-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
}

.dashboard-module .panel-content {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
  overflow-y: auto;
}

.main-panel--chromeless {
  margin-bottom: 0;
}

.panel-content--chromeless {
  padding: 8px;
  height: 100%;
}

.bottom-panel {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--dash-timeline-height, 48px) + 12px);
  z-index: 12;
  width: 50%;
}

.bottom-full-panel {
  position: absolute;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  bottom: calc(var(--dash-timeline-height, 48px) + 8px);

  width: auto;
  max-width: calc(100vw - 48px);
  pointer-events: auto;
}

.float-top-right-panel {
  position: absolute;
  top: calc(var(--dash-header-height, 88px) + 12px);
  right: 24px;
  z-index: 14;
  pointer-events: auto;
  min-height: 0;

  .main-panel {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    margin-bottom: 0 !important;
  }

  .panel-content--chromeless {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

.float-bottom-right-panel {
  position: absolute;
  bottom: calc(var(--dash-timeline-height, 48px) + 72px);
  right: 24px;
  z-index: 12;
  pointer-events: auto;
}

.float-panel {
  position: absolute;
  z-index: 12;
  pointer-events: auto;
}
</style>
