import axios from 'axios';

const api = axios.create({ baseURL: 'http://192.168.29.141/TrainManagementAPI/api' });

export const trainsApi = {
  getAll: () => api.get('/trains'),
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

export const zonesApi = {
  getAll: () => api.get('/zones'),
};

export const scrapeApi = {
  getTrainInfo: (trainNo) => api.get(`/scrape/train/${trainNo}`),
  getStops: (internalId) => api.get(`/scrape/stops/${internalId}`),
  bulkScrape: (data) => api.post('/scrape/bulk', data),
};
