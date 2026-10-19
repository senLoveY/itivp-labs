import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginAPI = (email, password) => api.post('/auth/login', { email, password });
export const registerAPI = (email, password) => api.post('/auth/register', { email, password });

export const fetchTweetsAPI = (params, signal) => api.get('/tweets', { params, signal });
export const createTweetAPI = (data) => api.post('/tweets', data);
export const updateTweetAPI = (id, data) => api.put(`/tweets/${id}`, data);
export const deleteTweetAPI = (id) => api.delete(`/tweets/${id}`);
export const likeTweetAPI = (id) => api.post(`/tweets/${id}/like`);
