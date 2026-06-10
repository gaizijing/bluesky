import {
  createRegionBoundaryMask,
  patchFieldRegionClip,
} from './boundaryMask.js';

const GFS_JSON_URL = '/region-meteo/lib/gfs_china.json';

const DEFAULT_WIND_OPTIONS = {
  colorScale: [
    'rgb(36,104, 180)', 'rgb(60,157, 194)', 'rgb(128,205,193 )', 'rgb(151,218,168 )',
    'rgb(198,231,181)', 'rgb(238,247,217)', 'rgb(255,238,159)', 'rgb(252,217,125)',
    'rgb(255,182,100)', 'rgb(252,150,75)', 'rgb(250,112,52)', 'rgb(245,64,32)',
    'rgb(237,45,28)', 'rgb(220,24,32)', 'rgb(180,0,35)',
  ],
  frameRate: 16,
  maxAge: 48,
  globalAlpha: 0.52,
  velocityScale: 1 / 100,
  paths: 1200,
};

let regionPathScale = 0.22;

let viewer = null;
let windLayer = null;
let regionMask = null;
let gfsDataPromise = null;
let renderHeightM = 100;
let cameraHandlers = [];
let obliqueSyncTimer = null;
let currentParams = null;
let cameraMoving = false;
let visible = false;
let loadSeq = 0;

function projectToWindowCoordinates(scene, position) {
  return Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position)
    || Cesium.SceneTransforms.worldToWindowCoordinates(scene, position);
}

function getCameraObliqueFactor(viewerInstance) {
  const tilt = viewerInstance.camera.pitch + Math.PI / 2;
  return Cesium.Math.clamp(tilt / (Math.PI / 3), 0, 1);
}

function computeRegionPathScale(mask, field) {
  if (!mask?.bbox || !field?.extent) return 0.22;
  const [fWest, fSouth, fEast, fNorth] = field.extent();
  const fieldArea = Math.max((fEast - fWest) * (fNorth - fSouth), 1e-6);
  const b = mask.bbox;
  const regionArea = Math.max((b.east - b.west) * (b.north - b.south), 1e-8);
  const ratio = regionArea / fieldArea;
  // 全国 GFS + 小 Region 裁剪时，按面积开方缩小粒子数
  return Cesium.Math.clamp(Math.sqrt(ratio) * 3.2, 0.05, 0.35);
}

function tuneParamsForRegion(params) {
  return {
    ...params,
    paths: Math.max(40, Math.round(params.paths * regionPathScale)),
    maxAge: Math.max(36, Math.round(params.maxAge * 0.62)),
  };
}

function windParamsForCameraHeight(heightM, obliqueFactor = 0) {
  let params;
  if (heightM > 2_000_000) params = { paths: 1600, velocityScale: 1 / 55, maxAge: 52 };
  else if (heightM > 800_000) params = { paths: 900, velocityScale: 1 / 75, maxAge: 50 };
  else if (heightM > 200_000) params = { paths: 520, velocityScale: 1 / 95, maxAge: 56 };
  else if (heightM > 60_000) params = { paths: 320, velocityScale: 1 / 130, maxAge: 62 };
  else if (heightM > 10_000) params = { paths: 200, velocityScale: 1 / 260, maxAge: 58 };
  else if (heightM > 3_000) params = { paths: 140, velocityScale: 1 / 420, maxAge: 64 };
  else params = { paths: 110, velocityScale: 1 / 650, maxAge: 68 };

  if (obliqueFactor <= 0.12) return tuneParamsForRegion(params);
  const boosted = {
    paths: Math.round(params.paths * (1 + obliqueFactor * 0.25)),
    velocityScale: params.velocityScale * (1 - obliqueFactor * 0.2),
    maxAge: Math.round(params.maxAge + obliqueFactor * 24),
  };
  return tuneParamsForRegion(boosted);
}

function windParamsForCamera(viewerInstance) {
  return windParamsForCameraHeight(
    viewerInstance.camera.positionCartographic.height,
    getCameraObliqueFactor(viewerInstance),
  );
}

function isInsideWindArea(field, lng, lat) {
  if (!field.contains(lng, lat)) return false;
  if (regionMask && !regionMask.contains(lng, lat)) return false;
  return true;
}

function sampleLngLatInWindArea(viewerInstance, field) {
  const w = viewerInstance.canvas.clientWidth;
  const h = viewerInstance.canvas.clientHeight;
  const oblique = getCameraObliqueFactor(viewerInstance);
  const attempts = oblique > 0.12 ? 16 : 8;

  for (let i = 0; i < attempts; i++) {
    const x = w * (0.08 + Math.random() * 0.84);
    const y = oblique > 0.12 ? h * (0.32 + Math.random() * 0.66) : h * Math.random();
    const cartesian = viewerInstance.camera.pickEllipsoid(new Cesium.Cartesian2(x, y));
    if (!cartesian) continue;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lng = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    if (isInsideWindArea(field, lng, lat)) return { lng, lat };
  }

  if (regionMask) {
    const [fWest, fSouth, fEast, fNorth] = field.extent();
    const west = Math.max(fWest, regionMask.bbox.west);
    const south = Math.max(fSouth, regionMask.bbox.south);
    const east = Math.min(fEast, regionMask.bbox.east);
    const north = Math.min(fNorth, regionMask.bbox.north);
    if (west < east && south < north) {
      return regionMask.sampleInBBox(west, south, east, north, 32);
    }
  }
  return null;
}

function patchViewportParticleSpawn(viewerInstance, layer) {
  const field = layer.getData();
  if (!field || !field.randomize) return;

  const nativeRandomize = field.randomize.bind(field);
  const VIEWPORT_SPAWN_MAX_HEIGHT = 200_000;

  field.randomize = function (o, width, height, unproject) {
    const heightM = viewerInstance.camera.positionCartographic.height;
    const oblique = getCameraObliqueFactor(viewerInstance);

    if (heightM <= VIEWPORT_SPAWN_MAX_HEIGHT || oblique > 0.12) {
      const ground = sampleLngLatInWindArea(viewerInstance, field);
      if (ground) {
        o.x = ground.lng;
        o.y = ground.lat;
        return o;
      }
    }

    if (heightM > VIEWPORT_SPAWN_MAX_HEIGHT && oblique <= 0.12) {
      return nativeRandomize(o, width, height, unproject);
    }

    const rect = viewerInstance.camera.computeViewRectangle(viewerInstance.scene.globe.ellipsoid);
    if (!rect) return nativeRandomize(o, width, height, unproject);

    const [fWest, fSouth, fEast, fNorth] = field.extent();
    const west = Math.max(Cesium.Math.toDegrees(rect.west), fWest);
    const south = Math.max(Cesium.Math.toDegrees(rect.south), fSouth);
    const east = Math.min(Cesium.Math.toDegrees(rect.east), fEast);
    const north = Math.min(Cesium.Math.toDegrees(rect.north), fNorth);

    if (west >= east || south >= north) {
      return nativeRandomize(o, width, height, unproject);
    }

    o.x = west + Math.random() * (east - west);
    o.y = south + Math.random() * (north - south);
    if (isInsideWindArea(field, o.x, o.y)) return o;

    if (regionMask) {
      const sampled = regionMask.sampleInBBox(
        Math.max(west, regionMask.bbox.west),
        Math.max(south, regionMask.bbox.south),
        Math.min(east, regionMask.bbox.east),
        Math.min(north, regionMask.bbox.north),
        24,
      );
      if (sampled) {
        o.x = sampled.lng;
        o.y = sampled.lat;
        return o;
      }
    }

    return nativeRandomize(o, width, height, unproject);
  };
}

function patchObliqueWindBehavior(viewerInstance, layer) {
  const field = layer.getData();
  const base = layer.wind;
  if (!base || !field) return;

  layer.project = function (coordinate) {
    const position = Cesium.Cartesian3.fromDegrees(
      coordinate[0],
      coordinate[1],
      renderHeightM,
    );
    const sceneCoor = projectToWindowCoordinates(viewerInstance.scene, position);
    if (!sceneCoor || !Number.isFinite(sceneCoor.x) || !Number.isFinite(sceneCoor.y)) {
      return null;
    }
    return [sceneCoor.x, sceneCoor.y];
  };
  base.project = layer.project.bind(layer);

  base.intersectsCoordinate = function (coordinate) {
    if (!isInsideWindArea(field, coordinate[0], coordinate[1])) return false;
    const projected = this.project(coordinate);
    if (!projected) return false;
    const cw = this.ctx.canvas.width;
    const ch = this.ctx.canvas.height;
    return projected[0] >= -cw * 0.25 && projected[0] <= cw * 1.25
      && projected[1] >= -ch * 0.25 && projected[1] <= ch * 1.25;
  };
}

function hookWindRenderLoop(viewerInstance, layer) {
  const base = layer.wind;
  if (!base || base.__regionMeteoRenderHook || typeof base.render !== 'function') return;
  base.__regionMeteoRenderHook = true;
  const origRender = base.render.bind(base);
  base.render = function (...args) {
    origRender(...args);
    viewerInstance.scene.requestRender();
  };
}

function unbindCameraHandlers() {
  cameraHandlers.forEach(({ event, fn }) => {
    try {
      event.removeEventListener(fn);
    } catch { /* ignore */ }
  });
  cameraHandlers = [];
  if (obliqueSyncTimer) {
    clearTimeout(obliqueSyncTimer);
    obliqueSyncTimer = null;
  }
}

function bindWindCameraControls(viewerInstance, layer) {
  unbindCameraHandlers();
  currentParams = windParamsForCamera(viewerInstance);

  const rebuildParticles = () => {
    const base = layer.wind;
    if (!base) return;
    base.prerender();
    if (visible) base.start();
  };

  const applyWindParams = (next, { rebuild = false } = {}) => {
    const base = layer.wind;
    if (!base) return;
    const pathsChanged = next.paths !== currentParams.paths;
    currentParams = { ...next };
    if (pathsChanged) base.setOptions(next);
    else {
      Object.assign(base.options, next);
      if (rebuild) rebuildParticles();
    }
  };

  const onMoveStart = () => {
    cameraMoving = true;
    layer.wind?.clearCanvas();
    viewerInstance.scene.requestRender();
  };
  viewerInstance.camera.moveStart.addEventListener(onMoveStart);
  cameraHandlers.push({ event: viewerInstance.camera.moveStart, fn: onMoveStart });

  const onMoveEnd = () => {
    applyWindParams(windParamsForCamera(viewerInstance), { rebuild: true });
    cameraMoving = false;
    viewerInstance.scene.requestRender();
  };
  viewerInstance.camera.moveEnd.addEventListener(onMoveEnd);
  cameraHandlers.push({ event: viewerInstance.camera.moveEnd, fn: onMoveEnd });

  const onChanged = () => {
    if (cameraMoving) return;
    if (obliqueSyncTimer) return;
    obliqueSyncTimer = window.setTimeout(() => {
      obliqueSyncTimer = null;
      const next = windParamsForCamera(viewerInstance);
      if (next.paths !== currentParams.paths) applyWindParams(next);
      else if (
        next.maxAge !== currentParams.maxAge
        || next.velocityScale !== currentParams.velocityScale
      ) applyWindParams(next);
      viewerInstance.scene.requestRender();
    }, 250);
  };
  viewerInstance.camera.changed.addEventListener(onChanged);
  cameraHandlers.push({ event: viewerInstance.camera.changed, fn: onChanged });

  applyWindParams(currentParams);
}

function fetchGfsData() {
  if (!gfsDataPromise) {
    gfsDataPromise = fetch(GFS_JSON_URL).then((res) => {
      if (!res.ok) throw new Error('无法加载风场 JSON: ' + res.status);
      return res.json();
    });
  }
  return gfsDataPromise;
}

function destroyWindLayerInternal() {
  unbindCameraHandlers();
  if (windLayer?.wind) {
    try {
      windLayer.wind.stop();
      windLayer.wind.clearCanvas();
    } catch { /* ignore */ }
  }
  if (windLayer && viewer) {
    try {
      windLayer.remove();
    } catch { /* ignore */ }
  }
  windLayer = null;
  regionMask = null;
}

export function initWindLayer(viewerInstance) {
  viewer = viewerInstance;
}

export async function loadWindLayer(boundaryGeoJson, heightM = 100) {
  const req = ++loadSeq;
  renderHeightM = heightM;

  if (!window.CesiumWind?.WindLayer) {
    throw new Error('cesium-wind 未加载，请确认 lib/cesium-wind.js 已引入');
  }
  if (!boundaryGeoJson) {
    throw new Error('Region 无 boundary GeoJSON，无法裁剪风场');
  }

  destroyWindLayerInternal();
  regionMask = createRegionBoundaryMask(boundaryGeoJson);

  const data = await fetchGfsData();
  if (req !== loadSeq) return;

  windLayer = new window.CesiumWind.WindLayer(data, { windOptions: { ...DEFAULT_WIND_OPTIONS } });
  const field = windLayer.getData();
  if (!field) {
    throw new Error('风场 JSON 解析失败，请确认 lib/gfs_china.json 格式正确');
  }
  regionPathScale = computeRegionPathScale(regionMask, field);
  patchFieldRegionClip(field, regionMask);
  windLayer.addTo(viewer);
  patchViewportParticleSpawn(viewer, windLayer);
  patchObliqueWindBehavior(viewer, windLayer);
  bindWindCameraControls(viewer, windLayer);
  hookWindRenderLoop(viewer, windLayer);

  if (visible) {
    windLayer.wind?.start();
  } else {
    windLayer.wind?.stop();
    windLayer.wind?.clearCanvas();
  }
  viewer.scene.requestRender();
}

export function setWindHeightM(heightM) {
  renderHeightM = heightM;
  if (!windLayer?.wind || !visible) return;
  const base = windLayer.wind;
  base.clearCanvas();
  base.prerender();
  base.start();
  viewer?.scene?.requestRender();
}

export function setWindVisible(show) {
  visible = show;
  if (!windLayer?.wind) return;
  if (show) {
    windLayer.wind.start();
  } else {
    windLayer.wind.stop();
    windLayer.wind.clearCanvas();
  }
  viewer?.scene?.requestRender();
}

export function destroyWindLayer(resetVisible = true) {
  loadSeq += 1;
  if (resetVisible) visible = false;
  destroyWindLayerInternal();
  viewer?.scene?.requestRender();
}

export function isWindLayerActive() {
  return Boolean(windLayer);
}

export function installCesiumWindShim() {
  if (!Cesium.SceneTransforms.wgs84ToWindowCoordinates) {
    Cesium.SceneTransforms.wgs84ToWindowCoordinates =
      Cesium.SceneTransforms.worldToWindowCoordinates;
  }
}
