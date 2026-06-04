import request from '@/utils/request';

export const getAllAircraftModels = () => request.get('/aircraft-models/list');

export const getActiveAircraftModels = () => request.get('/aircraft-models/active');

export const getAircraftModelById = (id) => request.get(`/aircraft-models/${id}`);

export const addAircraftModel = (data) => request.post('/aircraft-models', data);

export const updateAircraftModel = (data) => request.put('/aircraft-models', data);

export const deleteAircraftModel = (id) => request.delete(`/aircraft-models/${id}`);
