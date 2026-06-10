import { extractLargestRing } from './geo.js';

const cache = new Map();

export async function fetchBoundaryPack(boundaryUrl) {
  if (!boundaryUrl) return null;
  if (cache.has(boundaryUrl)) return cache.get(boundaryUrl);

  const res = await fetch(boundaryUrl);
  if (!res.ok) throw new Error('边界 GeoJSON 加载失败: ' + boundaryUrl);
  const geoJson = await res.json();
  const ring = extractLargestRing(geoJson);
  if (!ring) throw new Error('无法解析边界多边形');

  const pack = { geoJson, ring, boundaryUrl };
  cache.set(boundaryUrl, pack);
  return pack;
}

export function getCachedBoundaryPack(boundaryUrl) {
  return boundaryUrl ? cache.get(boundaryUrl) ?? null : null;
}

export function invalidateBoundaryCache() {
  cache.clear();
}

export async function fetchBoundaryRing(boundaryUrl) {
  const pack = await fetchBoundaryPack(boundaryUrl);
  return pack?.ring ?? null;
}
