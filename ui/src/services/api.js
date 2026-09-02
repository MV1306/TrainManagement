import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const trainsApi = {
  getAll: () => api.get('/trains'),
  getCoverage: () => api.get('/trains/coverage'),
  getById: (id) => api.get(`/trains/${id}`),
  create: (data) => api.post('/trains', data),
  update: (id, data) => api.put(`/trains/${id}`, data),
  remove: (id) => api.delete(`/trains/${id}`),
  toggleStatus: (id) => api.patch(`/trains/${id}/status`),
  duplicate: (id) => api.post(`/trains/${id}/duplicate`),
};

export const stationsApi = {
  getAll: () => api.get('/stations'),
  getById: (id) => api.get(`/stations/${id}`),
  create: (data) => api.post('/stations', data),
  update: (id, data) => api.put(`/stations/${id}`, data),
  remove: (id) => api.delete(`/stations/${id}`),
};

export const scrapeApi = {
  getTrainInfo: (trainNo) => api.get(`/scrape/train/${trainNo}`),
  getStops: (internalId) => api.get(`/scrape/stops/${internalId}`),
};
