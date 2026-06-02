import request from '@/utils/request';

/** 超级管理员：触发格点+适飞+风险流水线 */
export function triggerSchedulerRecompute(regionId) {
  const params = regionId ? { regionId } : {};
  return request.post('/scheduler/recompute', {}, { params });
}

/** 超级管理员：按规则类型重算缓存（适飞/风险） */
export function triggerRecomputeByRule(ruleType, regionId) {
  const params = { ruleType };
  if (regionId) params.regionId = regionId;
  return request.post('/scheduler/recompute-by-rule', {}, { params });
}

/** 超级管理员：清理过期缓存 */
export function triggerSchedulerCleanup() {
  return request.post('/scheduler/cleanup');
}

/** 超级管理员：调度健康快照 */
export function fetchSchedulerHealth() {
  return request.get('/scheduler/health');
}
