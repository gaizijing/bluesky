import request from '@/utils/request';

export const getUserList = () => request.get('/users/list');

export const getUserById = (id) => request.get(`/users/${id}`);

export const createUser = (data) => request.post('/users', data);

export const registerUser = (data) => request.post('/users/register', data);

export const updateUser = (id, data) => request.put(`/users/${id}`, data);

export const deleteUser = (id) => request.delete(`/users/${id}`);

export const updateUserStatus = (id, status) =>
  request.put(`/users/${id}/status`, null, { params: { status } });

export const changeUserPassword = (oldPassword, newPassword) =>
  request.put('/users/change-password', {}, { params: { oldPassword, newPassword } });
