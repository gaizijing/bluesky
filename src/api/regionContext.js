import request from '@/utils/request';
import { getStorage, setStorage, removeStorage } from '@/utils/storageUtils';

const REGION_ID_KEY = 'currentRegionId';
const SELECTED_LANDING_POINT_KEY = 'selectedLandingPointId';
const LEGACY_REGION_ID_KEY = 'v2_regionId';
const LEGACY_SELECTED_KEY = 'v2_selectedLandingPointId';

export function readRegionIdFromStorage() {
  const current = getStorage(REGION_ID_KEY);
  if (current && String(current).trim()) return String(current).trim();
  const legacy = getStorage(LEGACY_REGION_ID_KEY);
  if (legacy && String(legacy).trim()) {
    setStorage(REGION_ID_KEY, String(legacy).trim());
    return String(legacy).trim();
  }
  return null;
}

export async function resolveRegionId(regionId) {
  const normalized = typeof regionId === 'string' ? regionId.trim() : regionId;
  if (normalized) return normalized;
  const stored = readRegionIdFromStorage();
  if (stored) return stored;
  const def = await request.get('/regions/default');
  const id = def?.regionId || def?.id;
  if (!id) {
    throw new Error('未找到默认区域，请先配置 Region');
  }
  setStorage(REGION_ID_KEY, id);
  return id;
}

export function readSelectedLandingPointId() {
  const current = getStorage(SELECTED_LANDING_POINT_KEY);
  if (current && String(current).trim()) return String(current).trim();
  const legacy = getStorage(LEGACY_SELECTED_KEY);
  if (legacy && String(legacy).trim()) {
    setStorage(SELECTED_LANDING_POINT_KEY, String(legacy).trim());
    return String(legacy).trim();
  }
  return null;
}

export function setCurrentRegionId(regionId) {
  setStorage(REGION_ID_KEY, regionId);
  removeStorage(SELECTED_LANDING_POINT_KEY);
  removeStorage(LEGACY_SELECTED_KEY);
  return regionId;
}
