import { fetchBoundaryPack } from './boundaryCache.js';

const BOUNDARY_FADE = {
  fullHeightM: 22000,
  fadeHeightM: 9000,
  hideHeightM: 3500,
  throttleMs: 120,
};

const FLY = { pitchDeg: -40 };

let viewer = null;
let boundaryDataSource = null;
let boundaryCameraListener = null;
let boundaryFadeTimer = null;
let visible = true;

function polygonHierarchyToPositions(hierarchy) {
  if (!hierarchy?.positions?.length) return null;
  const positions = hierarchy.positions.slice();
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (!Cesium.Cartesian3.equals(first, last)) positions.push(first);
  return positions;
}

function convertBoundaryPolygonsToGroundPolylines(dataSource) {
  const entities = dataSource.entities.values.slice();
  entities.forEach((entity) => {
    if (!entity.polygon) return;
    const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
    const positions = polygonHierarchyToPositions(hierarchy);
    const id = entity.id;
    dataSource.entities.remove(entity);
    if (!positions?.length) return;
    dataSource.entities.add({
      id,
      polyline: {
        positions,
        width: 2,
        material: Cesium.Color.fromCssColorString('#00d2ff'),
        clampToGround: true,
        arcType: Cesium.ArcType.GEODESIC,
      },
    });
  });
}

function updateBoundaryByCameraHeight() {
  if (!boundaryDataSource || !viewer) return;

  const height = viewer.camera.positionCartographic.height;
  let outlineAlpha = 1;
  let outlineWidth = 2;
  let show = visible;

  if (height <= BOUNDARY_FADE.hideHeightM) {
    show = false;
  } else if (height <= BOUNDARY_FADE.fadeHeightM) {
    const t = (height - BOUNDARY_FADE.hideHeightM)
      / (BOUNDARY_FADE.fadeHeightM - BOUNDARY_FADE.hideHeightM);
    outlineAlpha = t;
    outlineWidth = 1 + t;
  } else if (height <= BOUNDARY_FADE.fullHeightM) {
    const t = (height - BOUNDARY_FADE.fadeHeightM)
      / (BOUNDARY_FADE.fullHeightM - BOUNDARY_FADE.fadeHeightM);
    outlineAlpha = 0.35 + 0.65 * t;
  }

  boundaryDataSource.entities.values.forEach((entity) => {
    entity.show = show;
    if (!show || !entity.polyline) return;
    entity.polyline.material = Cesium.Color.fromCssColorString(
      'rgba(0, 210, 255, ' + outlineAlpha + ')',
    );
    entity.polyline.width = outlineWidth;
  });
}

function unbindBoundaryCameraFade() {
  if (boundaryCameraListener && viewer) {
    viewer.camera.changed.removeEventListener(boundaryCameraListener);
    boundaryCameraListener = null;
  }
  if (boundaryFadeTimer) {
    clearTimeout(boundaryFadeTimer);
    boundaryFadeTimer = null;
  }
}

function bindBoundaryCameraFade() {
  unbindBoundaryCameraFade();
  boundaryCameraListener = () => {
    if (boundaryFadeTimer) return;
    boundaryFadeTimer = setTimeout(() => {
      boundaryFadeTimer = null;
      updateBoundaryByCameraHeight();
    }, BOUNDARY_FADE.throttleMs);
  };
  viewer.camera.changed.addEventListener(boundaryCameraListener);
  updateBoundaryByCameraHeight();
}

export function initBoundaryLayer(viewerInstance) {
  viewer = viewerInstance;
}

export async function loadBoundary(boundaryUrl, ctx) {
  clearBoundary();
  if (!boundaryUrl) return { ok: false, pack: null };

  const pack = await fetchBoundaryPack(boundaryUrl);
  if (ctx?.isStale?.()) return { ok: false, pack: null };

  const dataSource = await Cesium.GeoJsonDataSource.load(pack.geoJson, {
    clampToGround: true,
    stroke: Cesium.Color.fromCssColorString('#00d2ff'),
    strokeWidth: 2,
    fill: Cesium.Color.TRANSPARENT,
  });
  if (ctx?.isStale?.()) return { ok: false, pack: null };

  viewer.dataSources.add(dataSource);
  convertBoundaryPolygonsToGroundPolylines(dataSource);
  boundaryDataSource = dataSource;
  bindBoundaryCameraFade();
  return { ok: true, pack };
}

export function collectBoundaryPositions() {
  const positions = [];
  if (!boundaryDataSource) return positions;
  boundaryDataSource.entities.values.forEach((entity) => {
    if (!entity.polyline) return;
    const pts = entity.polyline.positions?.getValue
      ? entity.polyline.positions.getValue(Cesium.JulianDate.now())
      : entity.polyline.positions;
    if (pts?.length) positions.push(...pts);
  });
  return positions;
}

export function getBoundaryDataSource() {
  return boundaryDataSource;
}

export function setBoundaryVisible(show) {
  visible = show;
  updateBoundaryByCameraHeight();
}

export function clearBoundary() {
  unbindBoundaryCameraFade();
  if (boundaryDataSource && viewer) {
    viewer.dataSources.remove(boundaryDataSource, true);
    boundaryDataSource = null;
  }
}

export { FLY, BOUNDARY_FADE };
