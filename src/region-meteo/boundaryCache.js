import { extractLargestRing } from './geo.js';

const MAX_ENTRIES = 16;
/** @type {Map<string, { geoJson: object, ring: number[][], boundaryUrl: string }>} */
const cache = new Map();

function touchEntry(boundaryUrl, pack) {
  cache.delete(boundaryUrl);
  cache.set(boundaryUrl, pack);
}

function evictOldestIfNeeded() {
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export async function fetchBoundaryPack(boundaryUrl) {
  if (!boundaryUrl) return null;
  const cached = cache.get(boundaryUrl);
  if (cached) {
    touchEntry(boundaryUrl, cached);
    return cached;
  }

  const res = await fetch(boundaryUrl);
  if (!res.ok) throw new Error('边界 GeoJSON 加载失败: ' + boundaryUrl);
  const geoJson = await res.json();
  const ring = extractLargestRing(geoJson);
  if (!ring) throw new Error('无法解析边界多边形');

  const pack = { geoJson, ring, boundaryUrl };
  touchEntry(boundaryUrl, pack);
  evictOldestIfNeeded();
  return pack;
}

export function getCachedBoundaryPack(boundaryUrl) {
  if (!boundaryUrl) return null;
  const pack = cache.get(boundaryUrl) ?? null;
  if (pack) touchEntry(boundaryUrl, pack);
  return pack;
}

/** 按 URL 淘汰；不传参则清空全部 */
export function invalidateBoundaryCache(boundaryUrl) {
  if (boundaryUrl) {
    cache.delete(boundaryUrl);
    return;
  }
  cache.clear();
}

export async function fetchBoundaryRing(boundaryUrl) {
  const pack = await fetchBoundaryPack(boundaryUrl);
  return pack?.ring ?? null;
}
