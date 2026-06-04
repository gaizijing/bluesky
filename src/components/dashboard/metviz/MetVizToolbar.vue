<template>
  <div v-show="metStore.toolbarOpen" class="met-viz-toolbar">
    <div class="met-viz-toolbar__row">
      <span class="met-viz-toolbar__label">要素</span>
      <el-select
        v-model="metStore.product"
        size="small"
        style="width: 120px"
        @change="emitRefresh"
      >
        <el-option
          v-for="p in productOptions"
          :key="p.id"
          :label="p.label"
          :value="p.id"
        />
      </el-select>
    </div>

    <div class="met-viz-toolbar__row">
      <span class="met-viz-toolbar__label">高度</span>
      <el-select
        v-model="metStore.heightM"
        size="small"
        style="width: 120px"
        @change="emitRefresh"
      >
        <el-option v-for="h in metStore.heightOptions" :key="h" :label="`${h}m`" :value="h" />
      </el-select>
    </div>

    <div class="met-viz-toolbar__toggles">
      <label class="met-viz-toggle">
        <el-switch v-model="metStore.enabled.metProduct" size="small" @change="emitRefresh" />
        <span>气象填色</span>
      </label>
      <label class="met-viz-toggle">
        <el-switch v-model="metStore.enabled.wind" size="small" @change="onWindToggle" />
        <span>风粒子</span>
      </label>
      <label class="met-viz-toggle">
        <el-switch v-model="metStore.enabled.rMet" size="small" @change="emitRefresh" />
        <span>R_met</span>
      </label>
    </div>

    <button type="button" class="met-viz-toolbar__collapse" @click="metStore.toggleToolbar()">
      收起
    </button>
  </div>
  <button
    v-show="!metStore.toolbarOpen"
    type="button"
    class="met-viz-toolbar-fab"
    @click="metStore.toggleToolbar()"
  >
    MetViz
  </button>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { IMAGERY_PRODUCTS, MET_PRODUCTS, MET_VIZ_WIND_OPTIONS } from '@/met-viz/constants';
import { useMetVizStore } from '@/store/modules/metViz';
import { useLayerSettingsStore } from '@/store/modules/layerSettings';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const metStore = useMetVizStore();
const layerSettings = useLayerSettingsStore();

const productOptions = computed(() =>
  MET_PRODUCTS.filter(
    (p) => metStore.productOptions.includes(p.id) && IMAGERY_PRODUCTS.includes(p.id)
  )
);

function emitRefresh() {
  dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
    product: metStore.product,
    heightM: metStore.heightM,
    enabled: { ...metStore.enabled },
  });
}

function onWindToggle() {
  layerSettings.setLayerVisibility('wind', metStore.enabled.wind);
  if (metStore.enabled.wind) {
    layerSettings.updateWindOptions(MET_VIZ_WIND_OPTIONS);
  }
  emitRefresh();
  queueMicrotask(() => {
    dashboardEventBus.emit(DASHBOARD_EVENTS.WIND_VISIBILITY_SYNC);
  });
}

onMounted(() => {
  if (!IMAGERY_PRODUCTS.includes(metStore.product)) {
    metStore.setProduct('temperature');
  }
  if (layerSettings.layers.wind?.visible !== false) {
    metStore.setLayerEnabled('wind', true);
    layerSettings.updateWindOptions(MET_VIZ_WIND_OPTIONS);
  }
  emitRefresh();
});
</script>

<style scoped lang="scss">
.met-viz-toolbar {
  position: absolute;
  bottom: calc(var(--dash-timeline-height, 48px) + 16px);
  left: 16px;
  top: auto;
  z-index: 15;
  width: 220px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 51, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.met-viz-toolbar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.met-viz-toolbar__label {
  flex-shrink: 0;
  width: 36px;
  font-size: 12px;
  color: #94a3b8;
}

.met-viz-toolbar__toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.met-viz-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}

.met-viz-toolbar__collapse {
  align-self: flex-end;
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;

  &:hover {
    color: #93c5fd;
  }
}

.met-viz-toolbar-fab {
  position: absolute;
  bottom: calc(var(--dash-timeline-height, 48px) + 16px);
  left: 16px;
  top: auto;
  z-index: 15;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 51, 0.88);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
}
</style>
