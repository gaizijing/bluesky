import { apiGet, hasAuthToken } from './api.js';

const params = new URLSearchParams(location.search);
const ROUTE_COLOR = '#39FF14';
const PLANE_ID = 'sim_demo_plane';
const ROUTE_ID = 'sim_demo_route';

let viewer = null;
let routePath = [];
let mockTimer = null;
let mockIndex = 0;
let planeEntity = null;

function $(id) {
  return document.getElementById(id);
}

function setHud(fields) {
  Object.entries(fields).forEach(([key, value]) => {
    const el = $(key);
    if (el) el.textContent = value;
  });
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
  viewerInstance.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    minimumLevel: 1,
    maximumLevel: 18,
    enablePickFeatures: false,
  }));
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
    const heading = Math.atan2(next.lon - p.lon, next.lat - p.lat);
    plane.position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
    plane.orientation = Cesium.Transforms.headingPitchRollQuaternion(
      plane.position.getValue(Cesium.JulianDate.now()),
      new Cesium.HeadingPitchRoll(heading, 0, 0),
    );
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

async function loadRoutes(regionId) {
  const select = $('routeSelect');
  select.innerHTML = '<option value="">加载中…</option>';
  const page = await apiGet('/routes?regionId=' + encodeURIComponent(regionId) + '&page=1&size=50');
  const records = page?.records || page?.items || [];
  select.innerHTML = '';
  records.forEach((r) => {
    const id = r.routeId || r.id;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = (r.name || id) + ' (' + id + ')';
    select.appendChild(opt);
  });
  if (records.length) {
    select.value = records[0].routeId || records[0].id;
    await loadRouteDetail(select.value);
  }
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
  renderRoute(routePath);
  setHud({ hudStatus: '航路已加载' });
}

async function bootstrap() {
  if (!hasAuthToken()) {
    setHud({ hudStatus: '未登录，请先在主系统登录' });
    throw new Error('未检测到 Token');
  }

  viewer = createViewer('map');
  setHud({ hudStatus: '初始化', hudSpeed: '—', hudAlt: '—' });

  const regions = await apiGet('/regions');
  const list = Array.isArray(regions) ? regions : [];
  const regionId = params.get('regionId')
    || list.find((r) => r.isDefault)?.regionId
    || list[0]?.regionId;
  if (!regionId) throw new Error('无可用 Region');

  await loadRoutes(regionId);

  $('routeSelect')?.addEventListener('change', (e) => {
    loadRouteDetail(e.target.value).catch(console.error);
  });
  $('btnMockStart')?.addEventListener('click', startMockFlight);
  $('btnMockStop')?.addEventListener('click', stopMockFlight);
}

bootstrap().catch((err) => {
  console.error('[sim-flight-demo]', err);
  setHud({ hudStatus: err.message || '初始化失败' });
});

window.addEventListener('beforeunload', stopMockFlight);
