<template>
  <div class="region-meteo-controls-root">
    <div class="region-meteo-dock" aria-label="区域气象控制">
      <div class="region-meteo-dock__tab" aria-hidden="true" />
      <aside class="controls panel-bg">
        <div class="controls-header">
          <h1 class="controls-title">区域气象可视化</h1>
        </div>


        <div class="controls-body">
          <section class="tree-section" :class="{ 'is-open': layersOpen }">
            <button
              type="button"
              class="tree-section__head"
              :aria-expanded="layersOpen"
              @click="layersOpen = !layersOpen"
            >
              <span class="tree-section__chevron">▶</span>
              <span>图层</span>
            </button>
            <div class="tree-section__body">
              <div class="layer-toggles">
                <label v-for="item in layerItems" :key="item.key" class="layer-toggle">
                  <input
                    type="checkbox"
                    :checked="state?.layers?.[item.key]"
                    @change="onLayerToggle(item.key, $event.target.checked)"
                  />
                  {{ item.label }}
                </label>
              </div>
            </div>
          </section>

          <section class="tree-section" :class="{ 'is-open': meteoOpen }">
            <button
              type="button"
              class="tree-section__head"
              :aria-expanded="meteoOpen"
              @click="meteoOpen = !meteoOpen"
            >
              <span class="tree-section__chevron">▶</span>
              <span>气象</span>
            </button>
            <div class="tree-section__body">
              <div class="controls-main">
                <div class="controls-col">
                  <span class="ctrl-label">气象要素</span>
                  <div class="product-list">
                    <button
                      v-for="p in state?.productOptions || []"
                      :key="p.id"
                      type="button"
                      class="product-pill"
                      :class="{ 'is-active': state?.currentProduct === p.id }"
                      @click="regionMeteo.setProduct(p.id)"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>
                <div class="controls-col">
                  <span class="ctrl-label">高度层</span>
                  <div class="height-block">
                    <div class="height-ticks">
                      <span
                        v-for="h in state?.heightLevelsM || []"
                        :key="h"
                        class="height-tick"
                        :class="{ 'is-active': state?.currentHeightM === h }"
                      >
                        {{ h }}
                      </span>
                    </div>
                    <input
                      type="range"
                      :min="0"
                      :max="Math.max(0, (state?.heightLevelsM?.length || 1) - 1)"
                      step="1"
                      :value="heightSliderIndex"
                      aria-label="选择高度层"
                      @input="onHeightInput"
                    />
                  </div>
                </div>
              </div>
              <div class="meteo-extra">
                <span class="ctrl-label">透明度</span>
                <div class="ctrl-row">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    :value="state?.alpha ?? 0.72"
                    :disabled="state?.meteoControlsDisabled"
                    aria-label="图层透明度"
                    @input="regionMeteo.setAlpha(Number($event.target.value))"
                  />
                </div>
                <label class="ctrl-switch">
                  <span class="ctrl-switch__label">等值面</span>
                  <input
                    type="checkbox"
                    :checked="state?.showIsoSurface"
                    :disabled="state?.meteoControlsDisabled"
                    aria-label="等值面填色"
                    @change="regionMeteo.setIsoSurface($event.target.checked)"
                  />
                  <span class="ctrl-switch__track" />
                </label>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <aside v-if="state?.legend" class="legend" aria-label="色标图例">
      <div>
        <div class="legend__title">{{ state.legend.title }}</div>
        <div class="legend__unit">{{ state.legend.unit }}</div>
      </div>
      <div class="legend__body">
        <div class="legend__labels">
          <span>{{ state.legend.max }}</span>
          <span>{{ state.legend.min }}</span>
        </div>
        <div class="legend__bar" :style="{ background: state.legend.gradient }" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import './region-meteo-controls.css';

const regionMeteo = inject('regionMeteo');
const status = computed(() => regionMeteo?.status?.value ?? { text: '', type: 'ok' });
const state = computed(() => regionMeteo?.engineState?.value);

const layersOpen = ref(true);
const meteoOpen = ref(true);

const layerItems = [
  { key: 'boundary', label: '边界' },
  { key: 'landing', label: '起降点' },
  { key: 'routes', label: '航路' },
  { key: 'nofly', label: '禁飞区' },
  { key: 'whitemodel', label: '白模' },
  { key: 'scalar', label: '标量场' },
  { key: 'wind', label: '风场' },
];

const heightSliderIndex = computed(() => {
  const levels = state.value?.heightLevelsM || [];
  const idx = levels.indexOf(state.value?.currentHeightM);
  return idx >= 0 ? idx : 0;
});

function onLayerToggle(key, enabled) {
  regionMeteo?.setLayerToggle(key, enabled)?.catch((err) => {
    console.error('[RegionMeteoControls]', err);
  });
}

function onHeightInput(event) {
  const idx = Number(event.target.value);
  const levels = state.value?.heightLevelsM || [];
  const heightM = levels[idx] ?? levels[0];
  if (heightM != null) regionMeteo?.setHeightM(heightM);
}
</script>
