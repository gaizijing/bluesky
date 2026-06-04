import { GridFieldSliceLayer } from './layers/GridFieldSliceLayer';
import { McRiskLayer } from './layers/McRiskLayer';
import { WindParticleLayer } from './layers/WindParticleLayer';

/**
 * MetViz 引擎：协调格点填色 / 风粒子 / R_met 图层，响应 Timeline 与 Region 变更
 */
export class MetVizEngine {
  constructor(viewer) {
    this.viewer = viewer;
    this.gridLayer = new GridFieldSliceLayer(viewer);
    this.riskLayer = new McRiskLayer(viewer);
    this.windLayer = new WindParticleLayer();
    this.state = {
      regionId: null,
      time: null,
      product: 'temperature',
      heightM: 100,
      enabled: {
        metProduct: true,
        wind: false,
        rMet: false,
      },
    };
    this._refreshPromise = null;
  }

  configure(partial) {
    const next = { ...this.state, ...partial };
    if (partial.enabled) {
      next.enabled = { ...this.state.enabled, ...partial.enabled };
    }
    if (partial.heights != null && partial.heightM == null) {
      const h = Array.isArray(partial.heights) ? partial.heights[0] : partial.heights;
      next.heightM = Number(h) || this.state.heightM;
    }
    this.state = next;
  }

  async refresh(override = {}) {
    const ctx = { ...this.state, ...override };
    if (ctx.heights != null && ctx.heightM == null) {
      const h = Array.isArray(ctx.heights) ? ctx.heights[0] : ctx.heights;
      ctx.heightM = Number(h) || 100;
    }
    this.state = ctx;

    if (this._refreshPromise) {
      await this._refreshPromise;
    }

    this._refreshPromise = this._doRefresh(ctx);
    try {
      await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _doRefresh(ctx) {
    const { regionId, time, product, heightM, enabled } = ctx;
    if (!regionId) {
      this.gridLayer.clear();
      this.riskLayer.clear(false);
      this.windLayer.setVisible(false);
      return;
    }

    const tasks = [];

    if (enabled.metProduct) {
      tasks.push(
        this.gridLayer.update({ regionId, time, product, heightM }).then(() => {
          this.gridLayer.setVisible(true);
        })
      );
    } else {
      this.gridLayer.clear();
      this.gridLayer.setVisible(false);
    }

    if (enabled.rMet) {
      tasks.push(
        this.riskLayer.update({ regionId, time, heightM }).then(() => {
          this.riskLayer.setVisible(true);
        })
      );
    } else {
      this.riskLayer.clear(false);
      this.riskLayer.setVisible(false);
    }

    if (enabled.wind) {
      tasks.push(
        this.windLayer.update({ regionId, time, heightM }).then(() => {
          this.windLayer.setVisible(true);
        })
      );
    } else {
      this.windLayer.setVisible(false);
    }

    await Promise.all(tasks);
  }

  setLayerEnabled(key, on) {
    this.state.enabled[key] = Boolean(on);
    return this.refresh();
  }

  destroy() {
    this.gridLayer.destroy();
    this.riskLayer.destroy();
    this.windLayer.destroy();
    this.viewer = null;
  }
}

export { GridFieldSliceLayer, McRiskLayer, WindParticleLayer };
