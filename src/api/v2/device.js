import request from '@/utils/request';

export const getDeviceCount = () => request.get('/devices/count');

export const getDeviceAlarms = (params = {}) =>
  request.get('/devices/alarms', {
    date: params.date,
    level: params.level,
    limit: params.limit,
  });

export const getDeviceHistory = () => request.get('/devices/history');

export const getDeviceList = () => request.get('/devices/list');

export const getOnlineDevices = () => request.get('/devices/online');

export const getDevicesByType = (type) =>
  request.get(`/devices/by-type/${encodeURIComponent(type)}`);

export const getDeviceById = (id) => request.get(`/devices/${id}`);

export const createDevice = (data) => request.post('/devices', data);

export const updateDevice = (id, data) => request.put(`/devices/${id}`, data);

export const deleteDevice = (id) => request.delete(`/devices/${id}`);
