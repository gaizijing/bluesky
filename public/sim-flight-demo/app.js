import { apiGet, hasAuthToken } from './api.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const ROUTE_COLOR = '#39FF14';
const PLANE_ID = 'sim_demo_plane';
const ROUTE_ID = 'sim_demo_route';
const MODEL_YAW_OFFSET_RAD = Cesium.Math.toRadians(-90);

let viewer = null;
let routePath = [];
let mockTimer = null;
let mockIndex = 0;
let planeEntity = null;
let regions = [];

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

function planeOrientationFromHeading(position, headingRad) {
  const base = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    new Cesium.HeadingPitchRoll(headingRad, 0, 0),
  );
  const modelFix = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, MODEL_YAW_OFFSET_RAD);
  return Cesium.Quaternion.multiply(base, modelFix, new Cesium.Quaternion());
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

function createViewer(containerId) {
  if (Cesium.Ion) Cesium.Ion.defaultAccessToken = undefined;
  const viewerInstance = new Cesium.Viewer(containerId, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
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
  viewerInstance.imageryLayers.removeAll();
  const tk = resolveTiandituToken();
  if (tk) {
    viewerInstance.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: buildTiandituWmtsUrl('img', tk),
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }));
    viewerInstance.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: buildTiandituWmtsUrl('cia', tk),
      subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }));
    logDebug('imagery: tianditu');
  } else {
    viewerInstance.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 1,
      maximumLevel: 18,
      enablePickFeatures: false,
    }));
    logDebug('imagery: arcgis (no tianditu token)');
  }
  viewerInstance.cesiumWidget.creditContainer.style.display = 'none';
  return viewerInstance;
}

function clearRoute() {
  const ent = viewer.entities.getById(ROUTE_ID);
  if (ent) viewer.entities.remove(ent);
}

function renderRoute(path3d) {
  clearRoute();
  if (path3d.length < 2) return;
  const positions = path3d.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  viewer.entities.add({
    id: ROUTE_ID,
    polyline: {
      positions,
      width: 3,
      material: Cesium.Color.fromCssColorString(ROUTE_COLOR),
      arcType: Cesium.ArcType.GEODESIC,
    },
  });
  const bs = Cesium.BoundingSphere.fromPoints(positions);
  viewer.camera.flyToBoundingSphere(bs, {
    duration: 1.2,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), Math.max(bs.radius * 2.4, 1800)),
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
    },
  });
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
    const position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
    plane.position = position;
    plane.orientation = planeOrientationFromHeading(position, heading);
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt + 420),
      orientation: {
        heading,
        pitch: Cesium.Math.toRadians(-28),
        roll: 0,
      },
    });
    setHud({
      hudSpeed: '120 m/s',
      hudAlt: Math.round(p.alt) + ' m',
    });
    mockIndex += 1;
    viewer.scene.requestRender();
  }, 120);
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
  setHud({ hudStatus: '航路已加载 (' + routePath.length + ' 点)' });
}

async function bootstrap() {
  if (!hasAuthToken()) {
    setHud({ hudStatus: '未登录，请先在主系统登录' });
    throw new Error('未检测到 Token');
  }

  viewer = createViewer('map');
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
}

bootstrap().catch((err) => {
  console.error('[sim-flight-demo]', err);
  setHud({ hudStatus: err.message || '初始化失败' });
});

window.addEventListener('beforeunload', stopMockFlight);
