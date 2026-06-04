import { defineStore } from 'pinia';
import dashboardConfig from '@/config/dashboard.config.json';
import { isMetVizEnabledOnDashboard } from '@/config/metVizRuntime';

const cfg = dashboardConfig.metViz || {};
const dashboardMetVizOn = isMetVizEnabledOnDashboard();

export const useMetVizStore = defineStore('metViz', {
  state: () => ({
    toolbarOpen: dashboardMetVizOn,
    product: cfg.defaultProduct || 'temperature',
    /** 当前可视化高度（米），风场与气象填色共用 */
    heightM: cfg.heightLevelsM?.[0] ?? 100,
    enabled: {
      metProduct: false,
      wind: false,
      rMet: false,
    },
    lastRefreshAt: null,
    isStale: false,
  }),

  getters: {
    heightOptions: () => cfg.heightLevelsM || [100, 300, 500, 1000, 2000],
    productOptions: () => cfg.products || ['temperature', 'wind'],
  },

  actions: {
    toggleToolbar() {
      this.toolbarOpen = !this.toolbarOpen;
    },
    setProduct(product) {
      this.product = product;
    },
    setHeightM(heightM) {
      const h = Number(heightM);
      if (Number.isFinite(h) && h > 0) {
        this.heightM = h;
      }
    },
    /** @deprecated 使用 setHeightM */
    setHeights(heights) {
      const h = Array.isArray(heights) ? heights[0] : heights;
      this.setHeightM(h);
    },
    toggleLayer(key) {
      if (this.enabled[key] !== undefined) {
        this.enabled[key] = !this.enabled[key];
      }
    },
    setLayerEnabled(key, on) {
      if (this.enabled[key] !== undefined) {
        this.enabled[key] = Boolean(on);
      }
    },
    markRefreshed(meta = {}) {
      this.lastRefreshAt = Date.now();
      this.isStale = Boolean(meta.isStale);
    },
  },
});
