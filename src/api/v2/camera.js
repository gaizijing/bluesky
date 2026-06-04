import request from '@/utils/request';

export const getCameras = (params = {}) => request.get('/cameras', params);

export const createCamera = (data) => request.post('/cameras', data);

export const getCameraById = (id) => request.get(`/cameras/${id}`);

export const updateCamera = (id, data) => request.put(`/cameras/${id}`, data);

export const deleteCamera = (id) => request.delete(`/cameras/${id}`);

export const getCameraPreview = (id) => request.get(`/cameras/${id}/preview`);

export const getCameraStream = (id) => request.get(`/cameras/${id}/stream`);

export const updateCameraActive = (id, active) =>
  request.put(`/cameras/${id}/active`, null, { params: { active } });
