/** 将 P1 /no-fly-zones GeoJSON 转为 Cesium 圆柱实体参数（地图层专用） */
function ringCentroid(ring) {
  if (!Array.isArray(ring) || !ring.length) return [0, 0];
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
  return n ? [sumLng / n, sumLat / n] : [0, 0];
}

function approxRadiusM(ring, centerLng, centerLat) {
  let maxDeg = 0;
  ring.forEach((p) => {
    if (!Array.isArray(p)) return;
    const dLng = p[0] - centerLng;
    const dLat = p[1] - centerLat;
    maxDeg = Math.max(maxDeg, Math.sqrt(dLng * dLng + dLat * dLat));
  });
  return Math.max(150, maxDeg * 111000);
}

export function noFlyZonesToCesium(zones) {
  return (Array.isArray(zones) ? zones : [])
    .filter((z) => z.enabled !== false)
    .map((z) => {
      const geom = z.geometry;
      if (!geom?.coordinates) return null;
      let ring = geom.coordinates;
      if (geom.type === 'Polygon' && Array.isArray(ring[0])) {
        ring = ring[0];
      } else if (geom.type === 'MultiPolygon' && Array.isArray(ring[0]?.[0])) {
        ring = ring[0][0];
      }
      const [centerLng, centerLat] = ringCentroid(ring);
      if (!Number.isFinite(centerLng) || !Number.isFinite(centerLat)) return null;
      return {
        id: z.zoneId,
        centerLng,
        centerLat,
        radiusM: approxRadiusM(ring, centerLng, centerLat),
        heightM: 400,
        zoneType: 'NO_FLY',
        label: z.name || '禁飞区',
      };
    })
    .filter(Boolean);
}
