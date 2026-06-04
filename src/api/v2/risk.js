import request from '@/utils/request';
import { resolveRegionId } from '../regionContext';
import { noFlyZonesToCesium } from '@/utils/noFlyZoneCesium';

export const getRiskZones = async (regionId) => {
  const rid = await resolveRegionId(regionId);
  const data = await request.get('/no-fly-zones', { regionId: rid });
  const zones = noFlyZonesToCesium(Array.isArray(data) ? data : []);
  return { zones };
};
