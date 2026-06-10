export function normalizeRegion(raw) {
  if (!raw) return null;
  const regionId = raw.regionId || raw.id;
  return {
    ...raw,
    regionId,
    id: regionId,
    boundaryUrl: raw.boundaryUrl || null,
    centerLng: Number(raw.centerLng),
    centerLat: Number(raw.centerLat),
  };
}

export function extractLargestRing(geoJson) {
  let best = null;
  let bestLen = 0;
  const pick = (ring) => {
    if (Array.isArray(ring) && ring.length > bestLen) {
      best = ring;
      bestLen = ring.length;
    }
  };
  const walk = (g) => {
    if (!g) return;
    if (g.type === 'Polygon') pick(g.coordinates?.[0]);
    if (g.type === 'MultiPolygon') g.coordinates?.forEach((p) => pick(p?.[0]));
  };
  if (geoJson.type === 'FeatureCollection') geoJson.features?.forEach((f) => walk(f.geometry));
  else if (geoJson.type === 'Feature') walk(geoJson.geometry);
  else walk(geoJson);
  return best;
}

export function gridToFeatures(grid) {
  return grid
    .map((c) => {
      const lng = Number(c.lng ?? c.longitude ?? c.lon);
      const lat = Number(c.lat ?? c.latitude);
      const value = Number(c.value ?? c.temperature ?? c.windSpeed ?? c.wind);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(value)) return null;
      return { lng, lat, value };
    })
    .filter(Boolean);
}

export function subsamplePoints(points, maxCount) {
  if (!points?.length || points.length <= maxCount) return points || [];
  const step = Math.ceil(points.length / maxCount);
  return points.filter((_, i) => i % step === 0).slice(0, maxCount);
}

const boundaryRingCache = new Map();

export async function fetchBoundaryRing(boundaryUrl) {
  if (!boundaryUrl) return null;
  if (boundaryRingCache.has(boundaryUrl)) {
    return boundaryRingCache.get(boundaryUrl);
  }
  const res = await fetch(boundaryUrl);
  if (!res.ok) throw new Error('边界 GeoJSON 加载失败');
  const geo = await res.json();
  const ring = extractLargestRing(geo);
  if (!ring) throw new Error('无法解析边界多边形');
  boundaryRingCache.set(boundaryUrl, ring);
  return ring;
}

export function flyToRegion(viewer, region) {
  const lng = Number.isFinite(region?.centerLng) ? region.centerLng : 120.38;
  const lat = Number.isFinite(region?.centerLat) ? region.centerLat : 36.07;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 180000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
  });
  viewer.resize();
}
