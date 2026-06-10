import request from '@/utils/request';
import { resolveRegionId } from '../regionContext';

export const fetchRoutes = async (regionId, page = 1, size = 20) => {
  const rid = await resolveRegionId(regionId);
  return request.get('/routes', { regionId: rid, page, size });
};

export const getRoutes = (regionId) => fetchRoutes(regionId);

export const getRouteDetail = async (routeId, routeVersionId) => {
  const params = routeVersionId ? { routeVersionId } : {};
  return request.get(`/routes/${routeId}`, params);
};

export const createRoute = async (routeData, regionId) => {
  const rid = await resolveRegionId(regionId || routeData?.regionId);
  return request.post('/routes', routeData, { params: { regionId: rid } });
};

export const importRoute = async (regionId, geoJson) => {
  const rid = await resolveRegionId(regionId);
  return request.post('/routes/import', geoJson, { params: { regionId: rid } });
};

export const analyzeRouteRisk = (routeId, params = {}) =>
  request.post(`/routes/${routeId}/analyze`, params);

export const clearRoutes = async (regionId) => {
  const rid = await resolveRegionId(regionId);
  await request.delete('/routes', { regionId: rid });
  return true;
};

export const deleteRoute = async (routeId) => {
  await request.delete(`/routes/${routeId}`);
  return true;
};
