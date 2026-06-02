import request from '@/utils/request';
import { resolveRegionId } from './regionContext';

/** P2：区域风险热力 GET /risk/heatmap */
export async function fetchRiskHeatmap({
  regionId,
  time = 'now',
  heightM = 100,
  west,
  south,
  east,
  north,
} = {}) {
  const rid = await resolveRegionId(regionId);
  const query = { regionId: rid, time, heightM };
  if (west != null) query.west = west;
  if (south != null) query.south = south;
  if (east != null) query.east = east;
  if (north != null) query.north = north;
  return request.get('/risk/heatmap', query);
}
