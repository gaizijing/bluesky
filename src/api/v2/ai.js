import request from '@/utils/request';
import { resolveRegionId } from '../regionContext';

export async function fetchAiConclusion({
  scene,
  regionId,
  targetType,
  targetId,
  time,
} = {}) {
  const rid = await resolveRegionId(regionId);
  return request.post('/ai/conclusion', null, {
    params: {
      scene,
      regionId: rid,
      targetType,
      targetId,
      time,
    },
  });
}
