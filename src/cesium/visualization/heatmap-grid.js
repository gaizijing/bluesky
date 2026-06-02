import * as Cesium from 'cesium'
import h337 from 'heatmap.js';
import { useHeatmapStore } from '@/store/modules/heatmap';
import { useLayerSettingsStore } from '@/store/modules/layerSettings';
import { watch } from 'vue';
import { loadMapHeatmapPayload } from '@/services/mapHeatmapService';
import warningIcon from '@/assets/icons/ic_warning.png';

const HEATMAP_COLOR_GRADIENT = {
  '0.0': 'rgba(29, 78, 216, 0)',
  '0.25': '#1d4ed8',
  '0.45': '#22c55e',
  '0.65': '#facc15',
  '0.82': '#fb923c',
  '0.96': '#ef4444'
};

// 风险区标注
const HIGH_RISK_THRESHOLD = 80;
const MAX_REASON_MARKERS = 20;
const MARKER_MIN_DISTANCE_DEG = 0.003;

// ============================================================
//  数据归一化
// ============================================================

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const toText = (v) => { if (typeof v !== 'string') return null; const t = v.trim(); return t ? t : null; };

const resolveLngLat = (point) => {
  if (Array.isArray(point?.lnglat) && point.lnglat.length >= 2) {
    const lng = toNumber(point.lnglat[0]), lat = toNumber(point.lnglat[1]);
    if (lng !== null && lat !== null) return [lng, lat];
  }
  const lng = toNumber(point?.lon ?? point?.lng ?? point?.x);
  const lat = toNumber(point?.lat ?? point?.y);
  return (lng !== null && lat !== null) ? [lng, lat] : null;
};

const normalizeHeatmapPoints = (rawApiData) => {
  const source = Array.isArray(rawApiData?.points) ? rawApiData.points
    : Array.isArray(rawApiData) ? rawApiData : [];
  return source.map(p => {
    const ll = resolveLngLat(p);
    const v = toNumber(p?.value ?? p?.riskLevel);
    const reason = toText(p?.reason);
    return ll && v !== null ? { x: ll[0], y: ll[1], value: v, reason } : null;
  }).filter(Boolean);
};

const normalizeApiPayload = (r) => {
  if (Array.isArray(r)) return { points: r };
  if (Array.isArray(r?.points)) return r;
  if (Array.isArray(r?.data?.points)) return r.data;
  if (Array.isArray(r?.data)) return { points: r.data };
  return { points: [] };
};

// ============================================================
//  原版 3D 引擎（h337 + 自定义着色器）
// ============================================================

export const create3DHeatmap = (viewer, options = {}) => {
  const heatmapState = {
    viewer,
    options,
    dataPoints: options.dataPoints || [],
    containerElement: undefined,
    instanceId: Number(`${new Date().getTime()}${Number(Math.random() * 1000).toFixed(0)}`),
    canvasWidth: options.canvasWidth || 200,
    boundingBox: undefined, boundingRect: {},
    xAxis: undefined, yAxis: undefined, xAxisLength: 0, yAxisLength: 0,
    baseElevation: options.baseElevation || 0,
    heatmapPrimitive: undefined,
    positionHierarchy: [],
    heatmapInstance: null,
    heightMultiplier: options.heightMultiplier || 1000
  };

  if (!heatmapState.dataPoints || heatmapState.dataPoints.length < 2) {
    createHeatmapContainer(heatmapState);
    heatmapState.heatmapInstance = h337.create({
      container: document.getElementById(`heatmap-${heatmapState.instanceId}`),
      radius: options.radius || 20, maxOpacity: 0.85, minOpacity: 0.5, blur: 0.75,
      gradient: options.colorGradient || HEATMAP_COLOR_GRADIENT,
    });
    return {
      destroy: () => { heatmapState.containerElement?.remove(); },
      updateData: (newPts) => create3DHeatmap(viewer, { ...options, dataPoints: newPts }),
      heatmapState,
    };
  }

  createHeatmapContainer(heatmapState);

  heatmapState.heatmapInstance = h337.create({
    container: document.getElementById(`heatmap-${heatmapState.instanceId}`),
    radius: options.radius || 20, maxOpacity: 0.85, minOpacity: 0.5, blur: 0.75,
    gradient: options.colorGradient || HEATMAP_COLOR_GRADIENT,
  });
  heatmapState.primitiveType = options.primitiveType || "TRIANGLES";

  initializeHeatmap(heatmapState);

  return {
    destroy: () => destroyHeatmap(heatmapState),
    heatmapState,
    updateData: (newPts) => updateHeatmapData(heatmapState, newPts),
  };
};

// ============================================================
//  内部函数
// ============================================================

function initializeHeatmap(heatmapState) {
  if (!heatmapState.viewer || !heatmapState.viewer.scene) return;
  for (const dp of heatmapState.dataPoints) {
    heatmapState.positionHierarchy.push(
      Cesium.Cartesian3.fromDegrees(dp.lnglat[0], dp.lnglat[1], 0)
    );
  }
  computeBoundingBox(heatmapState.positionHierarchy, heatmapState);

  const pts = heatmapState.positionHierarchy.map((pos, i) => {
    const nc = computeNormalizedCoordinates(pos, heatmapState);
    return { x: nc.x, y: nc.y, value: Math.pow(heatmapState.dataPoints[i].value / 100, 2) * 100 };
  });

  heatmapState.heatmapInstance.setData({ max: 100, min: 0, data: pts });

  const geomInst = new Cesium.GeometryInstance({ geometry: createHeatmapGeometry(heatmapState) });

  heatmapState.heatmapPrimitive = heatmapState.viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: geomInst,
      appearance: new Cesium.MaterialAppearance({
        material: new Cesium.Material({
          fabric: { type: "Image", uniforms: { image: heatmapState.heatmapInstance.getDataURL() } },
        }),
        vertexShaderSource: `
        in vec3 position3DHigh; in vec3 position3DLow; in vec2 st; in float batchId;
        uniform sampler2D image_0; out vec3 v_positionEC; in vec3 normal; out vec3 v_normalEC; out vec2 v_st;
        void main(){
            vec4 p = czm_computePosition();
            v_normalEC = czm_normal * normal;
            v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
            vec4 positionWC = czm_inverseModelView * vec4(v_positionEC, 1.0);
            v_st = st;
            vec4 color = texture(image_0, v_st);
            vec3 upDir = normalize(positionWC.xyz);
            p += vec4(color.r * upDir * 0., 0.0);
            gl_Position = czm_modelViewProjectionRelativeToEye * p;
        }`,
        translucent: true, flat: true,
      }),
      asynchronous: false, show: true,
    })
  );
  heatmapState.heatmapPrimitive.id = "heatmap3d";
}

function destroyHeatmap(heatmapState) {
  heatmapState.containerElement?.remove();
  if (heatmapState.heatmapPrimitive && heatmapState.viewer) {
    heatmapState.viewer.scene.primitives.remove(heatmapState.heatmapPrimitive);
    heatmapState.heatmapPrimitive = undefined;
  }
}

function computeNormalizedCoordinates(position, h) {
  if (!position) return { x: 0, y: 0 };
  const c = Cesium.Cartographic.fromCartesian(position.clone());
  c.height = 0;
  position = Cesium.Cartographic.toCartesian(c);
  const o = Cesium.Cartesian3.subtract(position, h.boundingBox.leftTop, new Cesium.Cartesian3());
  return {
    x: Number((Cesium.Cartesian3.dot(o, h.xAxis) / h.xAxisLength) * h.canvasWidth).toFixed(0),
    y: Number((Cesium.Cartesian3.dot(o, h.yAxis) / h.yAxisLength) * h.canvasWidth).toFixed(0),
  };
}

function cartesianToLnglat(cart) {
  if (!cart) return [];
  const c = Cesium.Cartographic.fromCartesian(cart);
  return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude), c.height];
}

function computeBoundingBox(positions, h) {
  if (!positions || positions.length < 2) return;

  const sphere = Cesium.BoundingSphere.fromPoints(positions);
  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(sphere.center);
  const yAxis = new Cesium.Cartesian3(0, 1, 0);
  const verts = [];

  for (let angle = 45; angle <= 360; angle += 90) {
    const rot = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(angle));
    let dir = Cesium.Matrix3.multiplyByVector(rot, yAxis, new Cesium.Cartesian3());
    dir = Cesium.Cartesian3.normalize(dir, dir);
    const s = Cesium.Cartesian3.multiplyByScalar(dir, sphere.radius, new Cesium.Cartesian3());
    verts.push(Cesium.Matrix4.multiplyByPoint(modelMatrix, s, new Cesium.Cartesian3()));
  }

  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const v of verts) {
    const ll = cartesianToLnglat(v);
    if (ll.length < 2) continue;
    minLon = Math.min(minLon, ll[0]); maxLon = Math.max(maxLon, ll[0]);
    minLat = Math.min(minLat, ll[1]); maxLat = Math.max(maxLat, ll[1]);
  }

  const latR = maxLat - minLat, lonR = maxLon - minLon;
  const pad = 4;
  h.boundingRect = {
    minLatitude: minLat - latR / pad, maxLatitude: maxLat + latR / pad,
    minLongitude: minLon - lonR / pad, maxLongitude: maxLon + lonR / pad,
  };

  h.boundingBox = {
    leftTop: Cesium.Cartesian3.fromDegrees(h.boundingRect.minLongitude, h.boundingRect.maxLatitude),
    leftBottom: Cesium.Cartesian3.fromDegrees(h.boundingRect.minLongitude, h.boundingRect.minLatitude),
    rightTop: Cesium.Cartesian3.fromDegrees(h.boundingRect.maxLongitude, h.boundingRect.maxLatitude),
    rightBottom: Cesium.Cartesian3.fromDegrees(h.boundingRect.maxLongitude, h.boundingRect.minLatitude),
  };
  h.xAxis = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(h.boundingBox.rightTop, h.boundingBox.leftTop, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  h.yAxis = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(h.boundingBox.leftBottom, h.boundingBox.leftTop, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  h.xAxisLength = Cesium.Cartesian3.distance(h.boundingBox.rightTop, h.boundingBox.leftTop);
  h.yAxisLength = Cesium.Cartesian3.distance(h.boundingBox.leftBottom, h.boundingBox.leftTop);
}

function createHeatmapGeometry(heatmapState) {
  const mesh = generateMeshData(heatmapState);
  return new Cesium.Geometry({
    attributes: new Cesium.GeometryAttributes({
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE, componentsPerAttribute: 3,
        values: mesh.positions,
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT, componentsPerAttribute: 2,
        values: new Float32Array(mesh.textureCoords),
      }),
    }),
    indices: new Uint16Array(mesh.indices),
    primitiveType: Cesium.PrimitiveType[heatmapState.primitiveType] || Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(mesh.positions),
  });
}

function generateMeshData(heatmapState) {
  const grid = heatmapState.canvasWidth || 200;
  const { minLongitude, maxLongitude, minLatitude, maxLatitude } = heatmapState.boundingRect || {};
  if (minLongitude === undefined) return { positions: [], textureCoords: [], indices: [] };

  const lonStep = (maxLongitude - minLongitude) / grid;
  const latStep = (maxLatitude - minLatitude) / grid;
  const positions = [], textureCoords = [], indices = [];

  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const hv = heatmapState.heatmapInstance?.getValueAt({ x: i, y: j }) || 0;
      const c = Cesium.Cartesian3.fromDegrees(
        minLongitude + lonStep * i, minLatitude + latStep * j,
        heatmapState.baseElevation + hv
      );
      positions.push(c.x, c.y, c.z);
      textureCoords.push(i / grid, j / grid);
      if (j < grid - 1 && i < grid - 1) {
        const idx = i * grid + j;
        indices.push(idx, idx + 1, idx + grid);
        indices.push(idx + 1, idx + grid + 1, idx + grid);
      }
    }
  }
  return { positions, textureCoords, indices };
}

function createHeatmapContainer(heatmapState) {
  const el = document.createElement("div");
  el.id = `heatmap-${heatmapState.instanceId}`;
  el.style.cssText = `position:absolute;top:-9999px;left:-9999px;width:${heatmapState.canvasWidth}px;height:${heatmapState.canvasWidth}px;`;
  document.body.appendChild(el);
  heatmapState.containerElement = el;
}

export function updateHeatmapData(heatmapState, newDataPoints) {
  if (!heatmapState || !newDataPoints || newDataPoints.length < 2) return;

  heatmapState.dataPoints = newDataPoints;
  heatmapState.positionHierarchy = [];
  for (const dp of newDataPoints) {
    heatmapState.positionHierarchy.push(Cesium.Cartesian3.fromDegrees(dp.lnglat[0], dp.lnglat[1], 0));
  }
  computeBoundingBox(heatmapState.positionHierarchy, heatmapState);

  const pts = heatmapState.positionHierarchy.map((pos, i) => {
    const nc = computeNormalizedCoordinates(pos, heatmapState);
    return { x: nc.x, y: nc.y, value: Math.pow(newDataPoints[i].value / 100, 2) * 100 };
  });
  heatmapState.heatmapInstance?.setData({ max: 100, min: 0, data: pts });

  if (heatmapState.heatmapPrimitive && heatmapState.viewer) {
    heatmapState.viewer.scene.primitives.remove(heatmapState.heatmapPrimitive);
  }

  const geomInst = new Cesium.GeometryInstance({ geometry: createHeatmapGeometry(heatmapState) });
  heatmapState.heatmapPrimitive = heatmapState.viewer?.scene?.primitives?.add(
    new Cesium.Primitive({
      geometryInstances: geomInst,
      appearance: new Cesium.MaterialAppearance({
        material: new Cesium.Material({
          fabric: { type: "Image", uniforms: { image: heatmapState.heatmapInstance?.getDataURL() } },
        }),
        vertexShaderSource: `
        in vec3 position3DHigh; in vec3 position3DLow; in vec2 st; in float batchId;
        uniform sampler2D image_0; out vec3 v_positionEC; in vec3 normal; out vec3 v_normalEC; out vec2 v_st;
        void main(){
            vec4 p = czm_computePosition();
            v_normalEC = czm_normal * normal;
            v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
            vec4 positionWC = czm_inverseModelView * vec4(v_positionEC, 1.0);
            v_st = st;
            vec4 color = texture(image_0, v_st);
            vec3 upDir = normalize(positionWC.xyz);
            p += vec4(color.r * upDir * 0., 0.0);
            gl_Position = czm_modelViewProjectionRelativeToEye * p;
        }`,
        translucent: true, flat: true,
      }),
      asynchronous: false, show: true,
    })
  );
  if (heatmapState.heatmapPrimitive) heatmapState.heatmapPrimitive.id = "heatmap3d";
}

// ============================================================
//  风险区标注
// ============================================================

function createReasonMarkers(points, viewer, isVisible) {
  if (!Array.isArray(points) || !points.length || !viewer) return [];

  const candidates = points
    .filter(p => p && p.reason && typeof p.value === 'number' && p.value >= HIGH_RISK_THRESHOLD)
    .sort((a, b) => b.value - a.value);

  if (!candidates.length) return [];

  const picked = [];
  const minD2 = MARKER_MIN_DISTANCE_DEG * MARKER_MIN_DISTANCE_DEG;

  for (const point of candidates) {
    if (picked.length >= MAX_REASON_MARKERS) break;
    let tooClose = false;
    for (const other of picked) {
      const dx = point.x - other.x;
      const dy = point.y - other.y;
      if (dx * dx + dy * dy < minD2) { tooClose = true; break; }
    }
    if (!tooClose) picked.push(point);
  }

  return picked.map(point => {
    const position = Cesium.Cartesian3.fromDegrees(point.x, point.y, 0);
    return viewer.entities.add({
      show: isVisible,
      position,
      billboard: {
        image: warningIcon,
        width: 22, height: 22,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000)
      },
      label: {
        text: point.reason,
        font: '14px Microsoft YaHei',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.55),
        pixelOffset: new Cesium.Cartesian2(0, -28),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000)
      }
    });
  });
}

// ============================================================
//  上层管理器（含风险标注）
// ============================================================

export const initHeatVolume = (viewer) => {
  let heatmapInstance = null;
  let isVisible = true;
  let reasonEntities = [];

  const clear = () => {
    if (reasonEntities.length) {
      reasonEntities.forEach(e => viewer.entities.remove(e));
      reasonEntities = [];
    }
    if (heatmapInstance && typeof heatmapInstance.destroy === 'function') heatmapInstance.destroy();
    heatmapInstance = null;
  };

  const rebuild = (points) => {
    clear();
    if (!points.length) return;

    heatmapInstance = create3DHeatmap(viewer, {
      dataPoints: points.map(p => ({ lnglat: [p.x, p.y], value: p.value })),
      radius: 2, baseElevation: 100, primitiveType: "TRIANGLES",
      colorGradient: HEATMAP_COLOR_GRADIENT,
      canvasWidth: Math.max(64, Math.min(300, Math.round(Math.sqrt(points.length) * 10))),
    });

    reasonEntities = createReasonMarkers(points, viewer, isVisible);
  };

  return {
    setData(raw) {
      const pts = normalizeHeatmapPoints(raw);
      if (!pts.length) { clear(); return 0; }
      rebuild(pts);
      return pts.length;
    },
    setVisible(v) {
      isVisible = Boolean(v);
      const s = heatmapInstance?.heatmapState;
      if (s?.heatmapPrimitive) s.heatmapPrimitive.show = isVisible;
      if (reasonEntities.length) {
        reasonEntities.forEach(e => { e.show = isVisible; });
      }
    },
    destroy() { clear(); },
    getInstance() { return heatmapInstance; },
  };
};

// ============================================================
//  桥接层
// ============================================================

const fetchByMode = async ({ mode, pointId, time, layerType }) => {
  const raw = await loadMapHeatmapPayload({
    mode,
    layerType: layerType || 'temperature',
    pointId,
    time,
  });
  return { ...normalizeApiPayload(raw), isStale: raw.isStale, source: raw.source };
};

export const createReactiveHeatmapBridge = ({ heatmapManager, heatmapStore, layerSettingsStore, areaStore, getCurrentTime }) => {
  if (!heatmapManager) throw new Error('[Bridge] heatmapManager required');

  const unwatchers = [];
  let reqToken = 0;
  let applying = false;

  const applyVis = () => {
    const layers = layerSettingsStore.layers || {};
    const visible = layers.temperature?.visible !== false || layers.riskField?.visible === true;
    heatmapManager.setVisible(visible);
  };

  const refresh = async (ti) => {
    const tok = ++reqToken;
    const mode = heatmapStore.heatmapMode === 'citywide' ? 'citywide' : 'area';
    const pid = areaStore?.selectedArea?.id;
    const t = ti || (typeof getCurrentTime === 'function' ? getCurrentTime() : new Date());
    const layerType = heatmapStore.mapLayerType === 'risk' ? 'risk' : 'temperature';
    const rawPayload = await loadMapHeatmapPayload({ mode, layerType, pointId: pid, time: t });
    if (tok !== reqToken) return null;
    const payload = { ...normalizeApiPayload(rawPayload), isStale: rawPayload.isStale, source: rawPayload.source };
    if (mode === 'area' && pid) heatmapStore.setCurrentPointId(pid);
    applying = true;
    heatmapStore.setHeatmapData(payload);
    applying = false;
    heatmapManager.setData(payload);
    applyVis();
    return payload;
  };

  unwatchers.push(watch(() => layerSettingsStore.layers.temperature?.visible, () => applyVis()));
  unwatchers.push(watch(() => layerSettingsStore.layers.riskField?.visible, () => applyVis()));
  unwatchers.push(watch(
    () => [
      layerSettingsStore.layers.temperature?.visible,
      layerSettingsStore.layers.riskField?.visible,
    ],
    ([tempOn, riskOn]) => {
      if (riskOn) heatmapStore.setMapLayerType('risk');
      else if (tempOn) heatmapStore.setMapLayerType('temperature');
      refresh().catch(() => {});
    }
  ));
  unwatchers.push(watch(() => heatmapStore.heatmapMode, async () => { try { await refresh(); } catch {} }));
  unwatchers.push(watch(
    () => areaStore?.selectedArea?.id,
    async (id) => {
      if (!id || heatmapStore.heatmapMode !== 'area') return;
      try { await refresh(); } catch {}
    },
    { immediate: true }
  ));
  unwatchers.push(watch(
    () => heatmapStore.heatmapData,
    (d) => {
      if (applying) return;
      heatmapManager.setData(normalizeApiPayload(d));
      applyVis();
    },
    { deep: true }
  ));

  applyVis();
  setTimeout(() => refresh().catch(() => {}), 0);

  return {
    refresh,
    setMode: async (mode, ti) => {
      if (typeof heatmapStore.setHeatmapMode === 'function') heatmapStore.setHeatmapMode(mode);
      else heatmapStore.heatmapMode = mode;
      return refresh(ti);
    },
    setAreaPointId: async (pid, ti) => {
      if (!pid) return null;
      if (typeof heatmapStore.setCurrentPointId === 'function') heatmapStore.setCurrentPointId(pid);
      else heatmapStore.currentPointId = pid;
      if (heatmapStore.heatmapMode !== 'area') return null;
      return refresh(ti);
    },
    setVisible: (v) => heatmapManager.setVisible(v),
    setLayerType: async (type) => {
      heatmapStore.setMapLayerType(type);
      return refresh();
    },
    destroy() { unwatchers.forEach(u => u()); unwatchers.length = 0; },
  };
};
