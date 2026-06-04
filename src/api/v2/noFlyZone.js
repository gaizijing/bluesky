import request from '@/utils/request';
import { resolveRegionId } from '../regionContext';

export const fetchNoFlyZones = async (regionId) => {
  const rid = await resolveRegionId(regionId);
  const data = await request.get('/no-fly-zones', { regionId: rid });
  return Array.isArray(data) ? data : [];
};

export const createNoFlyZone = (body) => request.post('/no-fly-zones', body);

export const updateNoFlyZone = (zoneId, body) => request.put(`/no-fly-zones/${zoneId}`, body);

export const deleteNoFlyZone = (zoneId) => request.delete(`/no-fly-zones/${zoneId}`);

export const importNoFlyZones = async (regionId, geoJson) => {
  const rid = await resolveRegionId(regionId);
  return request.post('/no-fly-zones/import', geoJson, { params: { regionId: rid } });
};
