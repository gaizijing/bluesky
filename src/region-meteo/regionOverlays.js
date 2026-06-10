import { applyTerrainSceneSettings } from './terrain.js';
import {
  initBoundaryLayer,
  loadBoundary,
  clearBoundary,
  setBoundaryVisible,
} from './boundary.js';
import {
  initWhiteModelLayer,
  loadWhiteModel,
  clearWhiteModel,
  setWhiteModelVisible,
} from './whiteModel.js';
import {
  initNoFlyLayer,
  loadNoFlyZones,
  clearNoFlyZones,
  setNoFlyVisible,
} from './noFlyLayer.js';
import { LandingPointLayer } from './landingLayer.js';
import { RouteLayer } from './routeLayer.js';
import { AnchorPopup } from './anchorPopup.js';
import { createLoadContext } from './regionContext.js';

let viewer = null;
let landingLayer = null;
let routeLayer = null;
let mapPopup = null;

export function initRegionOverlays(viewerInstance) {
  viewer = viewerInstance;
  initBoundaryLayer(viewer);
  initWhiteModelLayer(viewer);
  initNoFlyLayer(viewer);
  if (!mapPopup) {
    mapPopup = new AnchorPopup(viewer);
  }
  if (!landingLayer) {
    landingLayer = new LandingPointLayer(viewer, mapPopup);
  }
  if (!routeLayer) {
    routeLayer = new RouteLayer(viewer);
  }
}

export function getMapPopup() {
  return mapPopup;
}

export function getLandingLayer() {
  return landingLayer;
}

export function getRouteLayer() {
  return routeLayer;
}

/** Dashboard 下钻：高亮当前起降点/航路，其余弱化 */
export function syncDrillMapHighlight({ view, focusType, focusId } = {}) {
  landingLayer?.clearHighlight();
  routeLayer?.clearHighlight();

  if (view === 'drillLanding' && focusType === 'landingPoint' && focusId) {
    routeLayer?.setDimmed(true);
    landingLayer?.setHighlight(focusId, { fly: true });
    return;
  }

  if (view === 'drillRoute' && focusType === 'route' && focusId) {
    landingLayer?.setDimmed(true);
    routeLayer?.setHighlight(focusId, { fly: true });
  }
}

function ensureRegionOverlaysReady() {
  if (!viewer) {
    throw new Error('Region 图层未初始化');
  }
  if (!mapPopup) {
    mapPopup = new AnchorPopup(viewer);
  }
  if (!landingLayer) {
    landingLayer = new LandingPointLayer(viewer, mapPopup);
  }
  if (!routeLayer) {
    routeLayer = new RouteLayer(viewer);
  }
}

export async function applyRegionOverlays(region, ctx = createLoadContext()) {
  ensureRegionOverlaysReady();
  clearRegionOverlays();

  if (region.mapLift?.terrainExaggeration != null) {
    applyTerrainSceneSettings(viewer, region.mapLift.terrainExaggeration);
  }

  const geoUrl = region.boundaryUrl;
  const errors = [];
  const parts = [];

  const [boundaryResult, landingResult, routeResult, modelResult, noFlyResult] = await Promise.allSettled([
    geoUrl ? loadBoundary(geoUrl, ctx) : Promise.resolve({ ok: false, pack: null }),
    landingLayer.load(region.regionId, ctx),
    routeLayer.load(region.regionId, ctx),
    loadWhiteModel(region, ctx),
    loadNoFlyZones(region.regionId, ctx),
  ]);

  if (ctx.isStale()) return { parts: [], errors: ['加载已取消'], boundaryPack: null };

  if (!geoUrl) {
    errors.push('接口未返回 boundaryUrl');
  } else if (boundaryResult.status === 'fulfilled' && boundaryResult.value?.ok) {
    parts.push('边界');
  } else if (boundaryResult.status === 'rejected') {
    errors.push('边界：' + boundaryResult.reason?.message);
  } else {
    errors.push('边界加载失败');
  }

  if (landingResult.status === 'fulfilled') {
    const count = landingResult.value.length;
    if (count > 0) parts.push(count + ' 个起降点');
  } else {
    errors.push('起降点：' + landingResult.reason?.message);
  }

  if (routeResult.status === 'fulfilled') {
    const count = routeResult.value;
    if (count > 0) parts.push(count + ' 条航路');
  } else if (routeResult.status === 'rejected') {
    errors.push('航路：' + routeResult.reason?.message);
  }

  if (modelResult.status === 'fulfilled' && modelResult.value?.ok) {
    parts.push('白膜');
  } else if (region.modelUrl && modelResult.status === 'rejected') {
    errors.push('白膜：' + modelResult.reason?.message);
  }

  if (noFlyResult.status === 'fulfilled') {
    const count = noFlyResult.value;
    if (count > 0) parts.push(count + ' 个禁飞区');
  } else {
    errors.push('禁飞区：' + noFlyResult.reason?.message);
  }

  const boundaryPack = boundaryResult.status === 'fulfilled'
    ? boundaryResult.value?.pack ?? null
    : null;

  viewer.scene.requestRender();
  return { parts, errors, boundaryPack };
}

export function clearRegionOverlays() {
  clearBoundary();
  if (landingLayer) landingLayer.clear();
  if (routeLayer) routeLayer.clear();
  clearNoFlyZones();
  clearWhiteModel();
}

export function setRegionLayerVisible(layer, show) {
  switch (layer) {
    case 'boundary':
      setBoundaryVisible(show);
      break;
    case 'landing':
      landingLayer?.setVisible(show);
      break;
    case 'routes':
      routeLayer?.setVisible(show);
      break;
    case 'nofly':
      setNoFlyVisible(show);
      break;
    case 'whitemodel':
      setWhiteModelVisible(show);
      break;
    default:
      break;
  }
  viewer?.scene?.requestRender();
}

export function destroyRegionOverlays() {
  clearRegionOverlays();
  landingLayer?.destroy();
  routeLayer?.destroy();
  mapPopup?.destroy();
  landingLayer = null;
  routeLayer = null;
  mapPopup = null;
}

export function getLandingCount() {
  return landingLayer?.items?.length ?? 0;
}
