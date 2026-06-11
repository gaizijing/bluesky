import request from '@/utils/request';

const SIM_REQ = { showLoading: false, skipLoading: true };

export function createSimSession(regionId, routeId) {
  return request.post('/sim/sessions', null, {
    ...SIM_REQ,
    params: { regionId, routeId },
  });
}

export function getSimSession(sessionId) {
  return request.get(`/sim/sessions/${sessionId}`, {}, SIM_REQ);
}

export function bindSimRoute(sessionId, routeId) {
  return request.put(`/sim/sessions/${sessionId}/route`, null, {
    ...SIM_REQ,
    params: { routeId },
  });
}

export function connectSimSession(sessionId, config) {
  return request.post(`/sim/sessions/${sessionId}/connect`, config, SIM_REQ);
}

export function disconnectSimSession(sessionId) {
  return request.post(`/sim/sessions/${sessionId}/disconnect`, {}, SIM_REQ);
}

export function controlSimSession(sessionId, command) {
  return request.post(`/sim/sessions/${sessionId}/control`, { command }, SIM_REQ);
}

export function closeSimSession(sessionId) {
  return request.post(`/sim/sessions/${sessionId}/close`, {}, SIM_REQ);
}
