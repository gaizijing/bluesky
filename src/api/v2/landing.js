import request from '@/utils/request';
import { getStorage, setStorage, removeStorage } from '@/utils/storageUtils';
import { resolveRegionId, readSelectedLandingPointId } from '../regionContext';
import { mapLandingPointToLegacyArea } from '../lib/mappers';

const SELECTED_LANDING_POINT_KEY = 'selectedLandingPointId';
const LEGACY_SELECTED_KEY = 'v2_selectedLandingPointId';

export const fetchAreaList = async (regionId) => {
  const rid = await resolveRegionId(regionId);
  const data = await request.get('/landing-points', { regionId: rid });
  return (Array.isArray(data) ? data : []).map(mapLandingPointToLegacyArea);
};

export const fetchLandingPoints = (regionId) => fetchAreaList(regionId);

export const fetchCurrentSelectedArea = async () => {
  const selectedId = readSelectedLandingPointId();
  if (selectedId) {
    try {
      const point = await request.get(`/landing-points/${selectedId}`);
      return mapLandingPointToLegacyArea(point);
    } catch {
      removeStorage(SELECTED_LANDING_POINT_KEY);
      removeStorage(LEGACY_SELECTED_KEY);
    }
  }
  const list = await fetchAreaList();
  if (list.length) {
    setStorage(SELECTED_LANDING_POINT_KEY, list[0].id);
    return list[0];
  }
  return null;
};

export const updateSelectedArea = async (area) => {
  const id = area?.id || area?.landingPointId;
  if (id) setStorage(SELECTED_LANDING_POINT_KEY, id);
  return { pointId: id };
};

const buildLandingPayload = async (areaData) => {
  const regionId = await resolveRegionId(areaData.regionId);
  return {
    regionId,
    name: areaData.name,
    code: areaData.code,
    type: areaData.type,
    address: areaData.location || areaData.address,
    longitude: areaData.longitude,
    latitude: areaData.latitude,
    altitude: areaData.altitude,
    bboxMinLng: areaData.bboxMinLng ?? areaData.bbox?.west,
    bboxMinLat: areaData.bboxMinLat ?? areaData.bbox?.south,
    bboxMaxLng: areaData.bboxMaxLng ?? areaData.bbox?.east,
    bboxMaxLat: areaData.bboxMaxLat ?? areaData.bbox?.north,
    enabled: areaData.enabled !== false && areaData.status !== 'unavailable',
  };
};

export const addNewArea = async (areaData) => {
  const data = await request.post('/landing-points', await buildLandingPayload(areaData));
  return mapLandingPointToLegacyArea(data);
};

export const createLandingPoint = (areaData) => addNewArea(areaData);

export const updateMonitoringPoint = async (id, areaData) => {
  const data = await request.put(`/landing-points/${id}`, await buildLandingPayload(areaData));
  return mapLandingPointToLegacyArea(data);
};

export const updateLandingPoint = (id, areaData) => updateMonitoringPoint(id, areaData);

export const deleteLandingPoint = async (id) => {
  await request.delete(`/landing-points/${id}`);
  const selectedId = getStorage(SELECTED_LANDING_POINT_KEY);
  if (selectedId === id) removeStorage(SELECTED_LANDING_POINT_KEY);
  return true;
};

export const deleteMonitoringPoint = deleteLandingPoint;
