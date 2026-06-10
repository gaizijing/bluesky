import { GridFieldSliceLayer } from './layers/GridFieldSliceLayer';
import { McRiskLayer } from './layers/McRiskLayer';
import { WindParticleLayer } from './layers/WindParticleLayer';

function logPerf(label, startMs) {
  console.log(`[MetViz][Perf] ${label} — ${(performance.now() - startMs).toFixed(1)}ms`);
}

/**
 * MetViz 引擎：协调格点填色 / 风粒子 / R_met 图层，响应 Timeline 与 Region 变更
 */
export class MetVizEngine {
  constructor(viewer) {
    const totalStart = performance.now();

    this.viewer = viewer;

    let stepStart = performance.now();
    this.gridLayer = new GridFieldSliceLayer(viewer);
    logPerf('constructor GridFieldSliceLayer', stepStart);

    stepStart = performance.now();
    this.riskLayer = new McRiskLayer(viewer);
    logPerf('constructor McRiskLayer', stepStart);

    stepStart = performance.now();
    this.windLayer = new WindParticleLayer();
    logPerf('constructor WindParticleLayer', stepStart);

    logPerf('constructor 总计', totalStart);
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
    const refreshStart = performance.now();
    const ctx = { ...this.state, ...override };
    if (ctx.heights != null && ctx.heightM == null) {
      const h = Array.isArray(ctx.heights) ? ctx.heights[0] : ctx.heights;
      ctx.heightM = Number(h) || 100;
    }
    this.state = ctx;

    if (this._refreshPromise) {
      await this._refreshPromise;
    }

    this._refreshPromise = this._doRefresh(ctx, refreshStart);
    try {
      await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _doRefresh(ctx, refreshStart = performance.now()) {
    const { regionId, time, product, heightM, enabled } = ctx;
    if (!regionId) {
      this.gridLayer.clear();
      this.riskLayer.clear(false);
      this.windLayer.setVisible(false);
      logPerf('refresh (skip, no regionId)', refreshStart);
      return;
    }

    const tasks = [];

    if (enabled.metProduct) {
      tasks.push(
        (async () => {
          const stepStart = performance.now();
          await this.gridLayer.update({ regionId, time, product, heightM });
          this.gridLayer.setVisible(true);
          logPerf(`refresh gridLayer (${product}@${heightM}m)`, stepStart);
        })()
      );
    } else {
      const stepStart = performance.now();
      this.gridLayer.clear();
      this.gridLayer.setVisible(false);
      logPerf('refresh gridLayer (disabled, clear)', stepStart);
    }

    if (enabled.rMet) {
      tasks.push(
        (async () => {
          const stepStart = performance.now();
          await this.riskLayer.update({ regionId, time, heightM });
          this.riskLayer.setVisible(true);
          logPerf(`refresh riskLayer (R_met@${heightM}m)`, stepStart);
        })()
      );
    } else {
      const stepStart = performance.now();
      this.riskLayer.clear(false);
      this.riskLayer.setVisible(false);
      logPerf('refresh riskLayer (disabled, clear)', stepStart);
    }

    if (enabled.wind) {
      tasks.push(
        (async () => {
          const stepStart = performance.now();
          await this.windLayer.update({ regionId, time, heightM });
          this.windLayer.setVisible(true);
          logPerf(`refresh windLayer (@${heightM}m)`, stepStart);
        })()
      );
    } else {
      const stepStart = performance.now();
      this.windLayer.setVisible(false);
      logPerf('refresh windLayer (disabled)', stepStart);
    }

    await Promise.all(tasks);
    logPerf(`refresh 总计 (region=${regionId})`, refreshStart);
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
