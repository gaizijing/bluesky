import { WindLayer } from '@/cesium/vendors/cesium-wind-layer/index.mjs';

/** 解析 GET /wind-field 响应，供 cesium-wind-layer 使用 */

function normalizeWindComponent(comp) {
  if (!comp?.array) return null;
  const arr = comp.array;
  const array = arr instanceof Float32Array ? arr : Float32Array.from(arr);
  return {
    min: Number(comp.min) || 0,
    max: Number(comp.max) || 0,
    array,
  };
}

export function normalizeWindData(raw) {
  if (!raw?.u?.array || !raw?.v?.array) return null;
  const u = normalizeWindComponent(raw.u);
  const v = normalizeWindComponent(raw.v);
  if (!u || !v || u.array.length !== v.array.length) return null;
  const bounds = raw.bounds || {};
  return {
    u,
    v,
    speed: raw.speed ? normalizeWindComponent(raw.speed) : undefined,
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    bounds: {
      west: Number(bounds.west),
      south: Number(bounds.south),
      east: Number(bounds.east),
      north: Number(bounds.north),
    },
  };
}

export function resolveWindFieldPayload(data) {
  if (!data) return null;
  const fromLayers = data.layers?.[0];
  const windData = data.windData ?? fromLayers?.windData;
  const height = data.heightM ?? data.height ?? fromLayers?.height;

  const normalized = normalizeWindData(windData);
  if (!normalized) return null;

  return {
    height: Number(height) || 100,
    windData: normalized,
    meta: {
      time: data.time ?? data.bucketTime ?? '—',
      bounds: data.bounds ?? normalized.bounds,
      source: data.source,
      dataType: data.dataType,
      isStale: data.isStale,
    },
  };
}

function resolveParticleRenderHeight(dataHeightM, viewer) {
  const base = Math.max(Number(dataHeightM) || 100, 100);
  const camH = viewer?.camera?.positionCartographic?.height;
  if (!Number.isFinite(camH)) return Math.max(base, 1200);
  if (camH > 80_000) return Math.max(base, 12_000);
  if (camH > 20_000) return Math.max(base, 4_000);
  if (camH > 8_000) return Math.max(base, 1_500);
  return Math.max(base, 400);
}

function capOverviewPixelSize(layer) {
  const camH = layer.viewer?.camera?.positionCartographic?.height;
  if (!Number.isFinite(camH) || camH <= 8_000) return;
  const desired = Math.min(42, Math.max(10, 260_000 / camH));
  if (layer.viewerParameters.pixelSize > desired) {
    layer.viewerParameters.pixelSize = desired;
    layer.particleSystem?.applyViewerParameters?.(layer.viewerParameters);
  }
}

function patchWindLayerForOverview(layer) {
  if (layer.__overviewViewerPatch) return;
  layer.__overviewViewerPatch = true;
  const orig = layer.updateViewerParameters.bind(layer);
  layer.updateViewerParameters = () => {
    orig();
    capOverviewPixelSize(layer);
    layer.viewer?.scene?.requestRender?.();
  };
  layer.updateViewerParameters();
}

function mergeWindOptionsWithData(baseOptions, windData) {
  const speed = windData?.speed;
  let min = 0;
  let max = 12;
  if (speed?.array?.length) {
    const sMin = Number(speed.min);
    const sMax = Number(speed.max);
    if (Number.isFinite(sMin) && sMin !== Number.MAX_VALUE) min = Math.max(0, sMin);
    if (Number.isFinite(sMax) && sMax > min) max = sMax;
    else if (Number.isFinite(sMax) && sMax === 0) max = 8;
  }
  const domainMax = Math.max(max * 1.15, min + 1, 3);
  return {
    ...baseOptions,
    domain: { min, max: domainMax },
    displayRange: { min, max: domainMax },
  };
}

export class WindFieldLayerController {
  constructor(viewer, baseOptions) {
    this.viewer = viewer;
    this.baseOptions = baseOptions;
    this.layer = null;
  }

  upsert(payload) {
    if (!payload?.windData) {
      this.destroy();
      return null;
    }

    const { height, windData } = payload;
    const particleHeight = resolveParticleRenderHeight(height, this.viewer);
    const layerOptions = mergeWindOptionsWithData(
      { ...this.baseOptions, particleHeight },
      windData,
    );

    if (this.layer) {
      try {
        this.layer.updateOptions(layerOptions);
        this.layer.updateWindData(windData);
        patchWindLayerForOverview(this.layer);
      } catch (err) {
        console.warn('[WindFieldDemo] 更新失败，重建图层', err);
        this.destroy();
        this.layer = new WindLayer(this.viewer, windData, layerOptions);
        patchWindLayerForOverview(this.layer);
      }
    } else {
      this.layer = new WindLayer(this.viewer, windData, layerOptions);
      patchWindLayerForOverview(this.layer);
    }

    this.viewer.scene?.requestRender?.();
    return this.layer;
  }

  setVisible(visible) {
    if (this.layer) this.layer.show = visible;
  }

  destroy() {
    this.layer?.destroy?.();
    this.layer = null;
  }
}
