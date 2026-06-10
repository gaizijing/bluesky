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
    boundaryUrl: region.boundaryUrl,
    adcode: region.adcode,
    centerLng: region.centerLng,
    centerLat: region.centerLat,
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
    centerLng: Number(data.centerLng),
    centerLat: Number(data.centerLat),
    adcode: data.adcode?.trim() || undefined,
    boundarySourceUrl: data.boundarySourceUrl?.trim() || undefined,
    modelUrl: data.modelUrl?.trim() || undefined,
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
  const payload = {
    name: data.name,
    centerLng: data.centerLng != null ? Number(data.centerLng) : undefined,
    centerLat: data.centerLat != null ? Number(data.centerLat) : undefined,
    modelUrl: data.modelUrl?.trim() || undefined,
    enabled: data.enabled !== false,
    isDefault: Boolean(data.isDefault),
  };
  if (data.adcode?.trim()) {
    payload.adcode = data.adcode.trim();
  }
  if (data.boundarySourceUrl?.trim()) {
    payload.boundarySourceUrl = data.boundarySourceUrl.trim();
  }
  const response = await request.put(`/regions/${regionId}`, payload);
  return mapRegionToLegacyConfig(response);
};

export const deleteRegionConfig = async (id) => {
  await request.delete(`/regions/${id}`);
  return true;
};
