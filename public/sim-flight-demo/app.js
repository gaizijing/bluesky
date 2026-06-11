import { apiGet, hasAuthToken } from './api.js';
import { SimTrailController } from './flightVisual.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const ROUTE_COLOR = '#39FF14';
const SHOW_ROUTE_POLYLINE = false;
const PLANE_ID = 'sim_demo_plane';
const ROUTE_ID = 'sim_demo_route';
/** Mock 沿航路插值步进间隔（越大越慢） */
const MOCK_TICK_MS = 380;
const MOCK_HUD_SPEED_MPS = 45;
/** 与 feng-demo aircraft_model_heading_offset_deg 一致 */
const MODEL_HEADING_OFFSET_DEG = -90;

let viewer = null;
let routePath = [];
let mockTimer = null;
let mockIndex = 0;
let planeEntity = null;
let regions = [];
let trailController = null;
/** 当前飞机位姿 { lon, lat, alt, heading(rad), pitch?, roll? } */
let currentPose = null;

function $(id) {
  return document.getElementById(id);
}

function setHud(fields) {
  Object.entries(fields).forEach(([key, value]) => {
    const el = $(key);
    if (el) el.textContent = value;
  });
}

function logDebug(...args) {
  if (DEBUG) console.log('[sim-flight-demo]', ...args);
}

function resolveTiandituToken() {
  const fromUrl = params.get('tiandituToken') || params.get('tk');
  if (fromUrl?.trim()) return fromUrl.trim();
  const fromInject = window.__SIM_FLIGHT_DEMO_CONFIG__?.tiandituToken;
  if (fromInject?.trim()) return fromInject.trim();
  try {
    const fromStorage = localStorage.getItem('tiandituToken');
    if (fromStorage?.trim()) return fromStorage.trim();
  } catch { /* ignore */ }
  return null;
}

function useTiandituProxy() {
  return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function buildTiandituWmtsUrl(layerKey, tk) {
  const query =
    'service=wmts&request=GetTile&version=1.0.0'
    + '&LAYER=' + layerKey + '&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}'
    + '&style=default&format=tiles&tk=' + tk;
  if (useTiandituProxy()) {
    return '/tianditu-proxy/' + layerKey + '_w/wmts?' + query;
  }
  return 'https://{s}.tianditu.gov.cn/' + layerKey + '_w/wmts?' + query;
}

function computeGeodesicHeading(from, to) {
  const start = Cesium.Cartographic.fromDegrees(from.lon, from.lat);
  const end = Cesium.Cartographic.fromDegrees(to.lon, to.lat);
  return new Cesium.EllipsoidGeodesic(start, end).startHeading;
}

function planeOrientationFromHeading(position, headingRad, pitchDeg = 0, rollDeg = 0) {
  const headingDeg = Cesium.Math.toDegrees(headingRad);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(headingDeg + MODEL_HEADING_OFFSET_DEG),
    Cesium.Math.toRadians(pitchDeg),
    Cesium.Math.toRadians(rollDeg),
  );
  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function buildCatmullPath3D(control, samples = 120) {
  if (!control?.length) return [];
  if (control.length === 1) return [{ ...control[0] }];
  const out = [];
  const segments = control.length - 1;
  for (let s = 0; s < segments; s += 1) {
    const p0 = control[Math.max(0, s - 1)];
    const p1 = control[s];
    const p2 = control[s + 1];
    const p3 = control[Math.min(control.length - 1, s + 2)];
    const steps = Math.max(8, Math.round(samples / segments));
    for (let i = 0; i < steps; i += 1) {
      const t = i / steps;
      out.push({
        lon: catmullRom(p0.lon, p1.lon, p2.lon, p3.lon, t),
        lat: catmullRom(p0.lat, p1.lat, p2.lat, p3.lat, t),
        alt: catmullRom(p0.alt, p1.alt, p2.alt, p3.alt, t),
      });
    }
  }
  out.push({ ...control[control.length - 1] });
  return out;
}

function addArcgisBasemap(viewerInstance) {
  const layer = viewerInstance.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }),
  );
  layer.brightness = 1.05;
  logDebug('imagery: arcgis');
}

function buildTiandituProbeUrl(layerKey, tk) {
  let path = buildTiandituWmtsUrl(layerKey, tk)
    .replace('{TileMatrix}', '1')
    .replace('{TileRow}', '0')
    .replace('{TileCol}', '1');
  if (path.includes('{s}')) path = path.replace('{s}', 't0');
  if (path.startsWith('http')) return path;
  return location.origin + path;
}

async function probeTiandituAvailable(tk) {
  try {
    const res = await fetch(buildTiandituProbeUrl('img', tk), { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function addTiandituBasemapWithToken(viewerInstance, tk) {
  const maxLevel = useTiandituProxy() ? 16 : 18;
  const wmtsCommon = {
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    maximumLevel: maxLevel,
    enablePickFeatures: false,
  };
  const imgOpts = { url: buildTiandituWmtsUrl('img', tk), layer: 'img', ...wmtsCommon };
  const ciaOpts = { url: buildTiandituWmtsUrl('cia', tk), layer: 'cia', ...wmtsCommon };
  if (!useTiandituProxy()) {
    const subs = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
    imgOpts.subdomains = subs;
    ciaOpts.subdomains = subs;
  }

  const imgLayer = viewerInstance.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider(imgOpts),
  );
  imgLayer.brightness = 1.0;
  imgLayer.contrast = 1.1;
  imgLayer.saturation = 1.1;

  const ciaLayer = viewerInstance.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider(ciaOpts),
  );
  ciaLayer.alpha = 0.85;
  logDebug('imagery: tianditu maxLevel=', maxLevel);
}

async function addBasemap(viewerInstance) {
  viewerInstance.imageryLayers.removeAll();
  const base = params.get('base');
  if (base === 'arcgis') {
    addArcgisBasemap(viewerInstance);
    return 'arcgis';
  }

  const tk = resolveTiandituToken();
  if (tk && base !== 'arcgis') {
    const ok = await probeTiandituAvailable(tk);
    if (ok) {
      addTiandituBasemapWithToken(viewerInstance, tk);
      return 'tianditu';
    }
    console.warn('[sim-flight-demo] 天地图瓦片请求失败，已回退 ArcGIS 卫星底图');
  } else if (!tk) {
    console.warn('[sim-flight-demo] 未配置天地图 token，已回退 ArcGIS 卫星底图');
  }

  addArcgisBasemap(viewerInstance);
  return 'arcgis';
}

async function createViewer(containerId) {
  if (Cesium.Ion) Cesium.Ion.defaultAccessToken = undefined;
  const viewerInstance = new Cesium.Viewer(containerId, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    baseLayer: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });
  const basemapType = await addBasemap(viewerInstance);
  logDebug('basemap ready:', basemapType);
  viewerInstance.cesiumWidget.creditContainer.style.display = 'none';
  viewerInstance.scene.globe.depthTestAgainstTerrain = false;
  viewerInstance.scene.fog.enabled = false;
  // requestRenderMode 下瓦片到达后需持续触发渲染
  viewerInstance.scene.globe.tileLoadProgressEvent.addEventListener((remaining) => {
    viewerInstance.scene.requestRender();
    if (remaining === 0) logDebug('basemap tiles loaded');
  });
  viewerInstance.scene.requestRender();
  return viewerInstance;
}

function requestSceneRender() {
  if (viewer?.scene) viewer.scene.requestRender();
}

function headingDegFromPose(pose) {
  return Cesium.Math.toDegrees(Number(pose?.heading ?? 0));
}

function resolvePoseAtRouteIndex(index = 0) {
  if (routePath.length < 1) return null;
  const p = routePath[index];
  const next = routePath[Math.min(index + 1, routePath.length - 1)];
  const heading = routePath.length > 1 ? computeGeodesicHeading(p, next) : 0;
  return { lon: p.lon, lat: p.lat, alt: p.alt, heading };
}

function initFlightVisuals() {
  trailController = new SimTrailController(viewer);
}

function isMockFlying() {
  return mockTimer != null;
}

function applyFlightVisuals(positionCartesian, pose) {
  if (!trailController || !pose || !positionCartesian || !isMockFlying()) return;

  trailController.apply(
    { enabled: true, append: true, clear: false },
    positionCartesian,
    headingDegFromPose(pose),
    Number(pose.roll ?? 0),
  );
  requestSceneRender();
}

function resetFlightVisuals() {
  trailController?.reset();
}

function clearFlightTrail() {
  trailController?.markManuallyCleared();
  requestSceneRender();
}

function placePlaneAtRoutePoint(index = 0) {
  const pose = resolvePoseAtRouteIndex(index);
  if (!pose) return;
  currentPose = pose;
  const position = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, pose.alt);
  const plane = ensurePlane();
  plane.position = position;
  plane.orientation = planeOrientationFromHeading(position, pose.heading);
  requestSceneRender();
}

function watchPlaneModelReady() {
  if (!planeEntity?.model) return;
  let frames = 0;
  const maxFrames = 3600;
  const tick = () => {
    if (!planeEntity || frames >= maxFrames) return;
    frames += 1;
    const ready = planeEntity.model?.ready;
    if (ready === true) {
      setHud({ hudStatus: '飞机模型已就绪' });
      requestSceneRender();
      return;
    }
    if (ready === false) {
      setHud({ hudStatus: '飞机模型加载失败，请检查 plane.glb' });
      console.error('[sim-flight-demo] plane.glb load failed');
      return;
    }
    requestSceneRender();
    requestAnimationFrame(tick);
  };
  tick();
}

function clearRoute() {
  const ent = viewer.entities.getById(ROUTE_ID);
  if (ent) viewer.entities.remove(ent);
}

function renderRoute(path3d) {
  clearRoute();
  if (path3d.length < 2) return;
  const positions = path3d.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  if (SHOW_ROUTE_POLYLINE) {
    viewer.entities.add({
      id: ROUTE_ID,
      polyline: {
        positions,
        width: 3,
        material: Cesium.Color.fromCssColorString(ROUTE_COLOR),
        arcType: Cesium.ArcType.GEODESIC,
      },
    });
  }
  const bs = Cesium.BoundingSphere.fromPoints(positions);
  viewer.camera.flyToBoundingSphere(bs, {
    duration: 1.2,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), Math.max(bs.radius * 2.4, 1800)),
    complete: () => placePlaneAtRoutePoint(0),
  });
}

function ensurePlane() {
  if (planeEntity) return planeEntity;
  planeEntity = viewer.entities.add({
    id: PLANE_ID,
    position: Cesium.Cartesian3.fromDegrees(0, 0, 300),
    model: {
      uri: '/cesium/model/plane/plane.glb',
      scale: 18,
      minimumPixelSize: 36,
      maximumScale: 2000,
      runAnimations: true,
    },
  });
  setHud({ hudStatus: '飞机模型加载中（约 448MB，首次较慢）…' });
  watchPlaneModelReady();
  return planeEntity;
}

function stopMockFlight() {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
  setHud({ hudStatus: '已停止', hudSpeed: '—', hudAlt: '—' });
}

function startMockFlight() {
  stopMockFlight();
  if (routePath.length < 2) return;
  mockIndex = 0;
  resetFlightVisuals();
  const plane = ensurePlane();
  setHud({ hudStatus: 'Mock 联飞中', hudSpeed: '0 m/s', hudAlt: '—' });

  mockTimer = setInterval(() => {
    const p = routePath[mockIndex];
    if (!p) {
      stopMockFlight();
      setHud({ hudStatus: 'Mock 完成' });
      return;
    }
    const next = routePath[Math.min(mockIndex + 1, routePath.length - 1)];
    const heading = computeGeodesicHeading(p, next);
    currentPose = { lon: p.lon, lat: p.lat, alt: p.alt, heading };
    const position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
    plane.position = position;
    plane.orientation = planeOrientationFromHeading(position, heading);
    applyFlightVisuals(position, currentPose);
    setHud({
      hudSpeed: MOCK_HUD_SPEED_MPS + ' m/s',
      hudAlt: Math.round(p.alt) + ' m',
    });
    mockIndex += 1;
    viewer.scene.requestRender();
  }, MOCK_TICK_MS);
}

function fillRegionSelect(regionId) {
  const select = $('regionSelect');
  if (!select) return;
  select.innerHTML = '';
  regions.forEach((r) => {
    const id = r.regionId || r.id;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = (r.name || id) + ' (' + id + ')';
    select.appendChild(opt);
  });
  if (regionId) select.value = regionId;
}

async function loadRoutes(regionId) {
  const select = $('routeSelect');
  select.innerHTML = '<option value="">加载中…</option>';
  const page = await apiGet('/routes?regionId=' + encodeURIComponent(regionId) + '&page=1&size=50');
  const records = page?.records || page?.items || [];
  logDebug('routes loaded', regionId, records.length);
  select.innerHTML = '';
  if (!records.length) {
    select.innerHTML = '<option value="">当前 Region 无航路</option>';
    routePath = [];
    clearRoute();
    setHud({ hudStatus: '当前 Region 无航路' });
    return;
  }
  records.forEach((r) => {
    const id = r.routeId || r.id;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = (r.name || id) + ' (' + id + ')';
    select.appendChild(opt);
  });
  select.value = records[0].routeId || records[0].id;
  await loadRouteDetail(select.value);
}

async function loadRouteDetail(routeId) {
  if (!routeId) return;
  stopMockFlight();
  resetFlightVisuals();
  const detail = await apiGet('/routes/' + encodeURIComponent(routeId));
  const waypoints = detail?.waypoints || [];
  const flightHeight = detail?.flightHeight ?? 300;
  const control = waypoints.map((wp) => ({
    lon: Number(wp.longitude ?? wp.lon),
    lat: Number(wp.latitude ?? wp.lat),
    alt: Number(wp.height ?? wp.altitude ?? flightHeight),
  }));
  routePath = buildCatmullPath3D(control, 120);
  logDebug('route detail', routeId, control.length, 'pts ->', routePath.length);
  renderRoute(routePath);
  setHud({
    hudStatus: '航路已加载 (' + routePath.length + ' 点)，点击 Mock 起飞 沿航路飞行',
  });
}

async function bootstrap() {
  if (!hasAuthToken()) {
    setHud({ hudStatus: '未登录，请先在主系统登录' });
    throw new Error('未检测到 Token');
  }

  viewer = await createViewer('map');
  initFlightVisuals();
  setHud({ hudStatus: '初始化', hudSpeed: '—', hudAlt: '—' });

  regions = await apiGet('/regions');
  const list = Array.isArray(regions) ? regions : [];
  const regionId = params.get('regionId')
    || list.find((r) => r.isDefault)?.regionId
    || list[0]?.regionId;
  if (!regionId) throw new Error('无可用 Region');

  fillRegionSelect(regionId);
  await loadRoutes(regionId);

  $('regionSelect')?.addEventListener('change', (e) => {
    loadRoutes(e.target.value).catch((err) => {
      console.error('[sim-flight-demo]', err);
      setHud({ hudStatus: err.message || '加载航路失败' });
    });
  });
  $('routeSelect')?.addEventListener('change', (e) => {
    loadRouteDetail(e.target.value).catch((err) => {
      console.error('[sim-flight-demo]', err);
      setHud({ hudStatus: err.message || '加载航路失败' });
    });
  });
  $('btnMockStart')?.addEventListener('click', startMockFlight);
  $('btnMockStop')?.addEventListener('click', stopMockFlight);
  $('btnClearTrail')?.addEventListener('click', clearFlightTrail);
}

bootstrap().catch((err) => {
  console.error('[sim-flight-demo]', err);
  setHud({ hudStatus: err.message || '初始化失败' });
});

window.addEventListener('beforeunload', () => {
  stopMockFlight();
  trailController?.destroy();
});
