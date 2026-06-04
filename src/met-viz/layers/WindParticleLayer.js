import { getWindData } from '@/api/weather';
import { useWindStore } from '@/store/modules/wind';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

/**
 * 风粒子层：按工具栏高度拉取单层 /wind-field，由 cesium/visualization/wind.js 渲染
 */
export class WindParticleLayer {
  constructor() {
    this.visible = true;
    this._req = 0;
    this._heightM = 100;
  }

  async update({ regionId, time, heightM = 100 } = {}) {
    const req = ++this._req;
    this._heightM = heightM;

    try {
      const data = await getWindData({ regionId, time, heightM });
      if (req !== this._req) return;

      const windStore = useWindStore();
      if (!data?.windData && !data?.layers?.length) {
        console.warn('[WindParticleLayer] /wind-field 响应无风场数据', data);
        return;
      }

      windStore.setWindData(data);
      console.log('[WindParticleLayer] 风场数据已写入 store', {
        regionId,
        heightM,
        hasWindData: !!data.windData,
        layers: data.layers?.length ?? 0,
      });

      await new Promise((resolve) => queueMicrotask(resolve));
      this._applyVisibility();
      dashboardEventBus.emit(DASHBOARD_EVENTS.WIND_VISIBILITY_SYNC);
    } catch (err) {
      console.error('[WindParticleLayer] /wind-field 请求失败', err?.message || err);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this._applyVisibility();
  }

  _clearWindLayers(windStore) {
    const layers = windStore.windLayer;
    if (!layers) return;
    const list = Array.isArray(layers) ? layers : [layers];
    list.forEach((layer) => layer?.destroy?.());
    windStore.setWindLayer(null);
  }

  _applyVisibility() {
    const windStore = useWindStore();
    const layers = windStore.windLayer;
    if (!layers) return;
    const list = Array.isArray(layers) ? layers : [layers];
    list.forEach((layer) => {
      if (layer) layer.show = this.visible;
    });
  }

  destroy() {
    this._req++;
    const windStore = useWindStore();
    this._clearWindLayers(windStore);
    windStore.setWindData(null);
  }
}
