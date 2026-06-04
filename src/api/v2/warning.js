import request from '@/utils/request';
import { resolveRegionId } from '../regionContext';
import { toWarningDisplay } from '@/utils/warningDisplay';

export async function fetchWarnings(params = {}) {
  const regionId = await resolveRegionId(params.regionId);
  const query = { regionId };
  if (params.statuses) query.statuses = params.statuses;
  if (params.types) query.types = params.types;
  if (params.limit != null) query.limit = params.limit;
  const data = await request.get('/warnings', query);
  const list = Array.isArray(data) ? data : [];
  return list.map(toWarningDisplay);
}

export const getRiskWarnings = async (params = {}) => {
  const warnings = await fetchWarnings(params);
  return { warnings };
};

export const ackWarning = async (warningId, remark = '') => {
  const q = remark ? `?remark=${encodeURIComponent(remark)}` : '';
  return request.post(`/warnings/${warningId}/ack${q}`);
};

/** 标记已读（查看详情），等同 ack */
export const readWarning = ackWarning;

export const handleWarning = async (warningId, remark = '') => {
  const q = remark ? `?remark=${encodeURIComponent(remark)}` : '';
  return request.post(`/warnings/${warningId}/handle${q}`);
};

export const closeWarning = async (warningId, remark = '') => {
  const q = remark ? `?remark=${encodeURIComponent(remark)}` : '';
  return request.post(`/warnings/${warningId}/close${q}`);
};
