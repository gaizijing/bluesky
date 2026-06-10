import { loadDemoConfig, toApiProduct } from './config.js';
import { apiGet, setApiTimeout } from './apiAdapter.js';
import { bucketFromIso } from '@/utils/timeBucket';
import {
  gridToFeatures,
  riskCellsToFeatures,
  subsamplePoints,
  fetchBoundaryRing,
} from './geo.js';
import {
  initLayer,
  setLayerAlpha,
  setLayerVisible,
  setIsoSurface,
  clearLayerCache,
  refreshFromCache,
  renderKrigingLayer,
  destroyLayer,
} from './layer.js';
import {
  buildKrigingColors,
  buildLegendGradient,
  formatLegendValue,
  getProductMeta,
  normalizeProduct,
} from './colormaps.js';
import { loadTerrain } from './terrain.js';
import {
  initRegionOverlays,
  applyRegionOverlays,
  setRegionLayerVisible,
  destroyRegionOverlays,
  getLandingLayer,
  getMapPopup,
  getRouteLayer,
  syncDrillMapHighlight,
} from './regionOverlays.js';
import { initWeatherPick } from './weatherPick.js';
import { flyToRegion } from './regionFly.js';
import { createLoadContext } from './regionContext.js';
import { getCachedBoundaryPack } from './boundaryCache.js';
import {
  initWindLayer,
  loadWindLayer,
  setWindVisible,
  setWindHeightM,
  destroyWindLayer,
  isWindLayerActive,
  installCesiumWindShim,
} from './windLayer.js';

function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function buildRegionStatus(parts, errors, layers) {
  const regionPart = parts.length ? parts.join(' · ') : 'Region 图层未加载';
  const meteo = [];
  if (layers.scalar) meteo.push('标量场 ON');
  if (layers.wind) meteo.push('风场 ON');
  const suffix = meteo.length ? ' · ' + meteo.join(' · ') : '';
  if (errors?.length && !parts.length) {
    return errors.join('；') + suffix;
  }
  return regionPart + suffix;
}


export class RegionMeteoEngine {
  constructor() {
    this.viewer = null;
    this.deps = null;
    this.demoConfig = null;
    this.currentRegion = null;
    this.currentRegionId = '';
    this.currentProduct = 'temperature';
    this.currentHeightM = 100;
    this.alpha = 0.72;
    this.showIsoSurface = true;
    this.gridLoadSeq = 0;
    this.reloadTimer = null;
    this.regionReloadTimer = null;
    this.abortController = null;
    this.boundaryPack = null;
    this.weatherPickCtrl = null;
    this.layers = {
      boundary: true,
      landing: true,
      nofly: true,
      whitemodel: true,
      routes: true,
      scalar: false,
      wind: false,
    };
    this.onStatusChange = null;
    this._destroyed = false;
    this.attachMode = 'standalone';
  }

  setStatus(text, type = 'ok') {
    this.onStatusChange?.(text, type);
    console.info('[region-meteo]', type, text);
  }

  resolveTime() {
    const raw = this.deps?.getTimelineTime?.();
    return bucketFromIso(raw || new Date());
  }

  getState() {
    return {
      attachMode: this.attachMode,
      layers: { ...this.layers },
      currentProduct: this.currentProduct,
      currentHeightM: this.currentHeightM,
      alpha: this.alpha,
      showIsoSurface: this.showIsoSurface,
      productOptions: this.demoConfig?.productOptions ?? [],
      heightLevelsM: this.demoConfig?.heightLevelsM ?? [],
      legend: this.buildLegendState(this.currentProduct),
      meteoControlsDisabled: !this.layers.scalar,
    };
  }

  buildLegendState(product) {
    const meta = getProductMeta(product);
    const { colormap } = buildKrigingColors(product);
    return {
      title: meta.label,
      unit: colormap.unit,
      gradient: buildLegendGradient(product),
      min: formatLegendValue(colormap.vmin, product),
      max: formatLegendValue(colormap.vmax, product),
    };
  }

  async mount(viewer, deps) {
    this.viewer = viewer;
    this.deps = deps;
    this._destroyed = false;
    this.attachMode = deps.attachMode === 'dashboard' ? 'dashboard' : 'standalone';

    installCesiumWindShim();
    this.demoConfig = await loadDemoConfig(deps.getConfig?.() ?? {});
    setApiTimeout(this.demoConfig.apiTimeoutMs);

    const defaults = this.demoConfig.defaultLayers || {};
    const configOverride = deps.getConfig?.()?.defaultLayers || {};
    Object.keys(this.layers).forEach((key) => {
      if (configOverride[key] !== undefined) this.layers[key] = configOverride[key];
      else if (defaults[key] !== undefined) this.layers[key] = defaults[key];
    });

    this.currentProduct = normalizeProduct(this.demoConfig.defaultProduct || 'temperature');
    this.currentHeightM = this.demoConfig.heightLevelsM[0] ?? 100;

    initLayer(viewer, this.demoConfig);
    setLayerAlpha(this.alpha);
    setIsoSurface(this.showIsoSurface);
    setLayerVisible(false);
    initWindLayer(viewer);
    initRegionOverlays(viewer);

    const popup = getMapPopup();
    const landing = getLandingLayer();
    this.weatherPickCtrl = initWeatherPick(
      viewer,
      popup,
      () => this.currentHeightM,
      () => this.deps?.getTimelineTime?.(),
    );
    landing?.setMapClickFallback((movement) => this.weatherPickCtrl.handleMapClick(movement));
    this.weatherPickCtrl.setEnabled(Boolean(deps.getPickMode?.()));

    if (this.attachMode === 'dashboard') {
      landing?.setDrillHandler?.(deps.onDrillLanding);
      getRouteLayer()?.setDrillHandler?.(deps.onDrillRoute);
      await this.reloadRegion({ fly: true });
      return;
    }

    this.setStatus('加载地形…', 'loading');
    const terrain = await loadTerrain(viewer);
    if (this._destroyed) return;
    viewer.scene?.requestRender?.();

    await this.reloadRegion({ fly: true, terrainLabel: terrain.label });
  }

  setPickMode(on) {
    this.weatherPickCtrl?.setEnabled(Boolean(on));
  }

  syncDrillHighlight() {
    if (this.attachMode !== 'dashboard' || this._destroyed) return;
    const focus = this.deps?.getDashboardFocus?.();
    if (!focus) return;
    syncDrillMapHighlight(focus);
  }

  resetOverviewCamera() {
    if (this.attachMode !== 'dashboard' || this._destroyed || !this.viewer) return;
    const region = this.deps?.getRegion?.();
    if (!region) return;
    getLandingLayer()?.hidePopup?.();
    syncDrillMapHighlight({ view: 'home', focusType: 'none' });
    flyToRegion(this.viewer, region);
  }

  scheduleTimeReload() {
    if (!this.layers.scalar) return;
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.loadGridLayer().catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('[region-meteo]', err);
        this.setStatus(err.message || '标量场加载失败', 'error');
      });
    }, this.demoConfig?.reloadDebounceMs ?? 400);
  }

  scheduleRegionReload() {
    clearTimeout(this.regionReloadTimer);
    this.regionReloadTimer = setTimeout(() => {
      this.reloadRegion({ fly: true }).catch((err) => {
        console.error('[region-meteo]', err);
        this.setStatus(err.message || '切换 Region 失败', 'error');
      });
    }, this.demoConfig?.reloadDebounceMs ?? 400);
  }

  async reloadRegion({ fly = false, terrainLabel = null } = {}) {
    const region = this.deps?.getRegion?.();
    if (!region?.regionId) {
      this.setStatus('Region 未就绪', 'error');
      return;
    }

    this.currentRegion = region;
    this.currentRegionId = region.regionId;
    this.boundaryPack = getCachedBoundaryPack(region.boundaryUrl);

    this.setStatus('加载 Region 图层…', 'loading');
    initRegionOverlays(this.viewer);

    if (this.layers.scalar) {
      clearLayerCache();
      destroyLayer();
      initLayer(this.viewer, this.demoConfig);
      setLayerAlpha(this.alpha);
      setIsoSurface(this.showIsoSurface);
    }
    if (this.layers.wind) {
      destroyWindLayer(false);
    }

    const ctx = createLoadContext();
    if (this.attachMode === 'dashboard') {
      ctx.skipRouteAnalyze = true;
    }
    const result = await applyRegionOverlays(region, ctx);
    if (this._destroyed || ctx.isStale()) return;

    this.boundaryPack = result.boundaryPack;

    Object.entries({
      boundary: this.layers.boundary,
      landing: this.layers.landing,
      nofly: this.layers.nofly,
      whitemodel: this.layers.whitemodel,
      routes: this.layers.routes,
    }).forEach(([key, show]) => setRegionLayerVisible(key, show));

    let statusText = buildRegionStatus(result.parts, result.errors, this.layers);
    if (terrainLabel) statusText += ' · 地形 ' + terrainLabel;
    this.setStatus(statusText, result.parts.length ? 'ok' : 'error');

    if (this.layers.scalar) {
      await this.loadGridLayer().catch((err) => {
        this.setStatus(err.message || '标量场加载失败', 'error');
      });
    }
    if (this.layers.wind) {
      await this.loadWindIfEnabled().catch((err) => {
        this.setStatus(err.message || '风场加载失败', 'error');
      });
    }

    if (fly) {
      flyToRegion(this.viewer, region);
    }

    this.syncDrillHighlight();
    this.viewer?.scene?.requestRender?.();
  }

  async loadGridLayer(opts = {}) {
    if (!this.layers.scalar) return;

    const product = normalizeProduct(opts.product ?? this.currentProduct);
    const heightM = opts.heightM ?? this.currentHeightM;
    const req = ++this.gridLoadSeq;
    const time = this.resolveTime();

    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.currentProduct = product;
    this.currentHeightM = heightM;

    const meta = getProductMeta(product);
    this.setStatus(heightM + 'm · ' + meta.label + ' 加载中…', 'loading');

    const region = this.currentRegion;
    if (!region?.boundaryUrl) throw new Error('Region 无 boundaryUrl');

    let points;
    if (product === 'rmet') {
      const riskPath =
        '/risk/heatmap?regionId=' + encodeURIComponent(this.currentRegionId)
        + '&heightM=' + heightM
        + '&time=now';
      const [riskData, boundaryRing] = await Promise.all([
        apiGet(riskPath, { signal, time }),
        fetchBoundaryRing(region.boundaryUrl),
      ]);
      if (req !== this.gridLoadSeq || !this.layers.scalar) return;

      const cells = Array.isArray(riskData?.cells) ? riskData.cells : [];
      if (!cells.length) {
        throw new Error(
          'R_met 风险格点为空，请确认后端风险热力已计算（POST /api/scheduler/recompute?regionId='
          + this.currentRegionId + '）',
        );
      }
      points = subsamplePoints(riskCellsToFeatures(cells), this.demoConfig.maxKrigingSamples);
      if (points.length < 4) throw new Error('R_met 有效格点不足: ' + points.length);

      this.setStatus(heightM + 'm · 计算 R_met 插值…', 'loading');
      await yieldToMain();
      if (req !== this.gridLoadSeq || !this.layers.scalar) return;

      const t0 = performance.now();
      renderKrigingLayer(points, boundaryRing, heightM, product);
      setLayerVisible(true);
      this.viewer?.scene?.requestRender();
      const ms = (performance.now() - t0).toFixed(0);
      const vals = points.map((p) => p.value);
      this.setStatus(
        heightM + 'm · R_met · '
        + formatLegendValue(Math.min(...vals), product) + ' ~ '
        + formatLegendValue(Math.max(...vals), product)
        + ' · ' + ms + 'ms',
        'ok',
      );
      return;
    }

    const apiProduct = toApiProduct(product);
    const gridPath =
      '/weather/grid-field?regionId=' + encodeURIComponent(this.currentRegionId)
      + '&product=' + encodeURIComponent(apiProduct)
      + '&heightM=' + heightM
      + '&time=now';

    const [gridData, boundaryRing] = await Promise.all([
      apiGet(gridPath, { signal, time }),
      fetchBoundaryRing(region.boundaryUrl),
    ]);
    if (req !== this.gridLoadSeq || !this.layers.scalar) return;

    if (gridData?.cacheMiss || !gridData?.grid?.length) {
      throw new Error(
        meta.label + ' 格点缓存未命中，请重启后端触发 Flyway V21 或 POST /api/scheduler/recompute?regionId='
        + this.currentRegionId,
      );
    }

    points = subsamplePoints(
      gridToFeatures(gridData.grid),
      this.demoConfig.maxKrigingSamples,
    );
    if (points.length < 4) throw new Error('有效格点不足: ' + points.length);

    this.setStatus(heightM + 'm · 计算插值…', 'loading');
    await yieldToMain();
    if (req !== this.gridLoadSeq || !this.layers.scalar) return;

    const t0 = performance.now();
    renderKrigingLayer(points, boundaryRing, heightM, product);
    setLayerVisible(true);
    this.viewer?.scene?.requestRender();
    const ms = (performance.now() - t0).toFixed(0);

    const vals = points.map((p) => p.value);
    this.setStatus(
      heightM + 'm · ' + meta.label + ' · '
      + formatLegendValue(Math.min(...vals), product) + ' ~ '
      + formatLegendValue(Math.max(...vals), product)
      + ' · ' + ms + 'ms',
      'ok',
    );
  }

  async loadWindIfEnabled() {
    if (!this.layers.wind) return;

    const pack = this.boundaryPack
      ?? getCachedBoundaryPack(this.currentRegion?.boundaryUrl);
    if (!pack?.geoJson) {
      throw new Error('Region boundary 未就绪，无法加载风场');
    }

    this.setStatus('风场加载中…', 'loading');
    await loadWindLayer(pack.geoJson, this.currentHeightM);
    setWindVisible(true);
    this.setStatus('风场已加载（GFS 静态 · Region 裁剪）', 'ok');
  }

  async setLayerToggle(key, enabled) {
    this.layers[key] = enabled;

    switch (key) {
      case 'boundary':
      case 'landing':
      case 'nofly':
      case 'whitemodel':
      case 'routes':
        setRegionLayerVisible(key === 'whitemodel' ? 'whitemodel' : key, enabled);
        break;
      case 'scalar':
        if (enabled) {
          initLayer(this.viewer, this.demoConfig);
          setLayerAlpha(this.alpha);
          setIsoSurface(this.showIsoSurface);
          await this.loadGridLayer().catch((err) => {
            this.setStatus(err.message || '标量场加载失败', 'error');
          });
        } else {
          if (this.abortController) this.abortController.abort();
          clearLayerCache();
          destroyLayer();
          initLayer(this.viewer, this.demoConfig);
          this.setStatus('标量场已关闭', 'ok');
        }
        break;
      case 'wind':
        if (enabled) {
          await this.loadWindIfEnabled().catch((err) => {
            this.layers.wind = false;
            this.setStatus(err.message || '风场加载失败', 'error');
            throw err;
          });
        } else {
          destroyWindLayer();
        }
        break;
      default:
        break;
    }
  }

  async setProduct(productId) {
    const product = normalizeProduct(productId);
    if (this.currentProduct === product && this.layers.scalar) return;
    this.currentProduct = product;
    if (!this.layers.scalar) {
      await this.setLayerToggle('scalar', true);
      return;
    }
    this.scheduleTimeReload();
  }

  setHeightM(heightM) {
    this.currentHeightM = heightM;
    if (this.layers.scalar) this.scheduleTimeReload();
    if (this.layers.wind && isWindLayerActive()) setWindHeightM(heightM);
  }

  setAlpha(value) {
    this.alpha = value;
    if (this.layers.scalar) setLayerAlpha(this.alpha);
  }

  setIsoSurface(show) {
    this.showIsoSurface = show;
    setIsoSurface(show);
    if (this.layers.scalar) refreshFromCache();
  }

  destroy() {
    this._destroyed = true;
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    if (this.regionReloadTimer) clearTimeout(this.regionReloadTimer);
    if (this.abortController) this.abortController.abort();
    destroyWindLayer();
    destroyLayer();
    destroyRegionOverlays();
    this.weatherPickCtrl = null;
    this.viewer = null;
    this.deps = null;
  }
}
