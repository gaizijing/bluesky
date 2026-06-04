import request from '@/utils/request';
import { setCurrentRegionId as setRegionIdInStorage } from '../regionContext';
import { mapRegionToLegacyConfig } from '../lib/mappers';

export const fetchRegions = async () => {
  const data = await request.get('/regions');
  return (Array.isArray(data) ? data : []).map(mapRegionToLegacyConfig);
};

export const fetchDefaultRegion = async () => {
  const data = await request.get('/regions/default');
  return mapRegionToLegacyConfig(data);
};

export const setCurrentRegionId = async (regionId) => setRegionIdInStorage(regionId);

export const getRegionConfig = async () => {
  const region = await fetchDefaultRegion();
  return {
    regionId: region.regionId,
    defaultName: region.name,
    name: region.name,
    modelUrl: region.modelUrl,
    mapLift: region.mapLift,
    bounds: {
      west: region.west,
      east: region.east,
      south: region.south,
      north: region.north,
    },
  };
};

export const getAllRegionConfigs = () => fetchRegions();

export const getDefaultRegionConfig = () => fetchDefaultRegion();

export const getRegionConfigById = async (id) => {
  const response = await request.get(`/regions/${id}`);
  return mapRegionToLegacyConfig(response);
};

export const addRegionConfig = async (data) => {
  const payload = {
    name: data.name,
    west: data.west,
    east: data.east,
    south: data.south,
    north: data.north,
    centerLng: data.centerLng ?? (data.west + data.east) / 2,
    centerLat: data.centerLat ?? (data.south + data.north) / 2,
    modelUrl: data.modelUrl,
    enabled: data.enabled !== false,
    isDefault: Boolean(data.isDefault),
  };
  const response = await request.post('/regions', payload);
  return mapRegionToLegacyConfig(response);
};

export const setRegionDefault = async (regionId) => {
  const data = await request.put(`/regions/${regionId}/default`);
  return mapRegionToLegacyConfig(data);
};

export const updateRegionConfig = async (data) => {
  const regionId = data.regionId || data.id;
  const west = Number(data.west);
  const east = Number(data.east);
  const south = Number(data.south);
  const north = Number(data.north);
  const payload = {
    name: data.name,
    west,
    east,
    south,
    north,
    centerLng: data.centerLng ?? (west + east) / 2,
    centerLat: data.centerLat ?? (south + north) / 2,
    modelUrl: data.modelUrl,
    enabled: data.enabled !== false,
    isDefault: Boolean(data.isDefault),
  };
  const response = await request.put(`/regions/${regionId}`, payload);
  return mapRegionToLegacyConfig(response);
};

export const deleteRegionConfig = async (id) => {
  await request.delete(`/regions/${id}`);
  return true;
};
