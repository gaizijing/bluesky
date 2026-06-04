import { WindLayer } from '@/cesium/vendors/cesium-wind-layer/index.mjs';
import { watch } from 'vue';
import { useWindStore } from '@/store/modules/wind';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

/** JSON 数组 → Float32Array，供 cesium-wind-layer 使用 */
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

function normalizeWindData(raw) {
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

/** 从 API 响应解析单层风场数据 */
function resolveWindLayerPayload(data) {
  if (!data) return null;
  const fromLayers = data.layers?.[0];
  let windData = data.windData ?? fromLayers?.windData;
  let height = data.heightM ?? data.height ?? fromLayers?.height;

  const normalized = normalizeWindData(windData);
  if (!normalized) {
    if (data.layers?.length || data.windData) {
      console.warn('[Wind] 风场数据结构无效，缺少 u/v array', data);
    }
    return null;
  }
  return {
    height: Number(height) || 100,
    windData: normalized,
  };
}

function isViewerReady(viewer) {
  return Boolean(viewer && !viewer.isDestroyed?.() && viewer.scene);
}

/** API 高度为数据层；渲染高度需抬高以免被地形深度测试裁掉 */
function resolveParticleRenderHeight(dataHeightM, viewer) {
  const base = Math.max(Number(dataHeightM) || 100, 100);
  const camH = viewer?.camera?.positionCartographic?.height;
  if (!Number.isFinite(camH)) return Math.max(base, 1200);
  if (camH > 80_000) return Math.max(base, 12_000);
  if (camH > 20_000) return Math.max(base, 4_000);
  if (camH > 8_000) return Math.max(base, 1_500);
  return Math.max(base, 400);
}

/** 高空概览时 cesium-wind-layer 无法收缩 pixelSize，线段会超出屏幕 */
function capOverviewPixelSize(layer) {
  const camH = layer.viewer?.camera?.positionCartographic?.height;
  if (!Number.isFinite(camH) || camH <= 8_000) return;
  const desired = Math.min(42, Math.max(10, 260_000 / camH));
  if (layer.viewerParameters.pixelSize > desired) {
    layer.viewerParameters.pixelSize = desired;
    layer.particleSystem?.applyViewerParameters?.(layer.viewerParameters);
  }
}

/** 按实况风速设置 domain，避免固定 0–30 把弱风粒子压成看不见 */
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

/**
 * 初始化风场图层（单层，高度由 MetViz 工具栏 / API heightM 决定）
 */
export const initWind = async (viewer, layerSettingsStore) => {
  const windStore = useWindStore();
  const windLayerRefs = [];
  let stopWindOptionsWatch = null;
  let stopWindDataWatch = null;
  let offWindVisibilitySync = null;
  let pendingPayload = null;

  const destroyAllLayers = () => {
    windLayerRefs.forEach((layer) => layer?.destroy?.());
    windLayerRefs.length = 0;
    windStore.setWindLayer(null);
  };

  const upsertSingleLayer = (payload) => {
    if (!payload?.windData) {
      pendingPayload = null;
      destroyAllLayers();
      return;
    }

    if (!isViewerReady(viewer)) {
      pendingPayload = payload;
      console.warn('[Wind] Viewer 未就绪，延后创建风场图层');
      return;
    }

    pendingPayload = null;
    const { height, windData } = payload;
    const particleHeight = resolveParticleRenderHeight(height, viewer);
    const layerOptions = mergeWindOptionsWithData(
      {
        ...layerSettingsStore.windOptions,
        particleHeight,
      },
      windData
    );

    const isCreate = !windLayerRefs[0];
    if (windLayerRefs[0]) {
      try {
        windLayerRefs[0].updateOptions(layerOptions);
        windLayerRefs[0].updateWindData(windData);
        patchWindLayerForOverview(windLayerRefs[0]);
      } catch (error) {
        console.error('[Wind] 更新风场失败，重建图层', error);
        destroyAllLayers();
        const layer = new WindLayer(viewer, windData, layerOptions);
        patchWindLayerForOverview(layer);
        windLayerRefs.push(layer);
      }
    } else {
      const layer = new WindLayer(viewer, windData, layerOptions);
      patchWindLayerForOverview(layer);
      windLayerRefs.push(layer);
    }

    windStore.setWindLayer([...windLayerRefs]);
    viewer.scene?.requestRender?.();
    const active = windLayerRefs[0];
    console.log(isCreate ? '[Wind] 风场图层已创建' : '[Wind] 风场图层已更新', {
      dataHeightM: height,
      particleHeight: active?.options?.particleHeight,
      pixelSize: active?.viewerParameters?.pixelSize,
      show: active?.show,
      grid: `${windData.width}x${windData.height}`,
    });
  };

  const applyWindData = (newData) => {
    const payload = resolveWindLayerPayload(newData);
    if (!payload) {
      pendingPayload = null;
      destroyAllLayers();
      return;
    }
    upsertSingleLayer(payload);
  };

  stopWindOptionsWatch?.();
  stopWindDataWatch?.();
  offWindVisibilitySync?.();

  offWindVisibilitySync = dashboardEventBus.on(DASHBOARD_EVENTS.WIND_VISIBILITY_SYNC, () => {
    applyWindData(windStore.windData);
  });

  stopWindOptionsWatch = watch(
    () => layerSettingsStore.windOptions,
    (newOptions) => {
      const payload = resolveWindLayerPayload(windStore.windData);
      if (!windLayerRefs[0] || !payload) return;
      windLayerRefs[0].updateOptions(
        mergeWindOptionsWithData(
          {
            ...newOptions,
            particleHeight: resolveParticleRenderHeight(payload.height, viewer),
          },
          payload.windData
        )
      );
      patchWindLayerForOverview(windLayerRefs[0]);
    },
    { deep: true }
  );

  let windDataApplyTimer = null;
  stopWindDataWatch = watch(
    () => windStore.windData,
    (newData) => {
      if (windDataApplyTimer) clearTimeout(windDataApplyTimer);
      windDataApplyTimer = setTimeout(() => {
        windDataApplyTimer = null;
        applyWindData(newData);
      }, 80);
    }
  );

  applyWindData(windStore.windData);
  if (pendingPayload) {
    upsertSingleLayer(pendingPayload);
  }

  windLayerRefs.destroy = () => {
    if (windDataApplyTimer) {
      clearTimeout(windDataApplyTimer);
      windDataApplyTimer = null;
    }
    stopWindOptionsWatch?.();
    stopWindDataWatch?.();
    offWindVisibilitySync?.();
    stopWindOptionsWatch = null;
    stopWindDataWatch = null;
    offWindVisibilitySync = null;
    pendingPayload = null;
    destroyAllLayers();
  };

  return windLayerRefs;
};
