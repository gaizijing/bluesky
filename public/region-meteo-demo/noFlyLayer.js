import { apiGet } from './api.js';

const NO_FLY = {
  extrudeM: 800,
  fill: 'rgba(239, 68, 68, 0.38)',
  outline: '#ef4444',
};

let viewer = null;
let entities = [];
let visible = true;

function extractPolygonRings(geometry) {
  if (!geometry?.coordinates) return [];
  const { type, coordinates } = geometry;
  if (type === 'Polygon' && Array.isArray(coordinates?.[0])) {
    return [coordinates[0]];
  }
  if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    return coordinates
      .map((poly) => (Array.isArray(poly?.[0]) ? poly[0] : null))
      .filter(Boolean);
  }
  return [];
}

function ringCentroid(ring) {
  if (!Array.isArray(ring) || !ring.length) return null;
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  ring.forEach((p) => {
    if (Array.isArray(p) && p.length >= 2) {
      sumLng += Number(p[0]);
      sumLat += Number(p[1]);
      n += 1;
    }
  });
  return n ? [sumLng / n, sumLat / n] : null;
}

export function initNoFlyLayer(viewerInstance) {
  viewer = viewerInstance;
}

export async function loadNoFlyZones(regionId, ctx) {
  clearNoFlyZones();
  if (!regionId) return 0;

  const list = await apiGet('/no-fly-zones?regionId=' + encodeURIComponent(regionId));
  const zones = (Array.isArray(list) ? list : []).filter((z) => z.enabled !== false);
  if (!zones.length || ctx?.isStale?.()) return zones.length;

  const fill = Cesium.Color.fromCssColorString(NO_FLY.fill);
  const outline = Cesium.Color.fromCssColorString(NO_FLY.outline);

  zones.forEach((zone, idx) => {
    const baseId = zone.zoneId || ('nfz-' + idx);
    const labelText = zone.name || '禁飞区';
    const rings = extractPolygonRings(zone.geometry);
    if (!rings.length) return;

    rings.forEach((ring, ringIdx) => {
      const positions = ring
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map((p) => Cesium.Cartesian3.fromDegrees(Number(p[0]), Number(p[1])));
      if (positions.length < 3) return;

      const entity = viewer.entities.add({
        id: 'nfz-poly-' + baseId + '-' + ringIdx,
        show: visible,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: fill,
          outline: true,
          outlineColor: outline,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: NO_FLY.extrudeM,
          extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          classificationType: Cesium.ClassificationType.BOTH,
          closeTop: true,
          closeBottom: true,
        },
      });
      entities.push(entity);
    });

    const centroid = ringCentroid(rings[0]);
    if (centroid) {
      const lbl = viewer.entities.add({
        id: 'nfz-lbl-' + baseId,
        show: visible,
        position: Cesium.Cartesian3.fromDegrees(
          centroid[0],
          centroid[1],
          NO_FLY.extrudeM * 0.6,
        ),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        label: {
          text: labelText,
          font: '13px "PingFang SC", sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#0b1a2a'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      entities.push(lbl);
    }
  });

  return zones.length;
}

export function setNoFlyVisible(show) {
  visible = show;
  entities.forEach((entity) => {
    entity.show = show;
  });
}

export function clearNoFlyZones() {
  entities.forEach((entity) => {
    try {
      viewer.entities.remove(entity);
    } catch (err) {
      console.warn('[region-meteo-demo] 移除禁飞区实体失败', err);
    }
  });
  entities = [];
}
