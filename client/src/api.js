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

let handleTokenExpired = () => {};

export function setOnTokenExpired(callback) {
  handleTokenExpired = callback;
}

// токен истёк или недействителен — выходим из аккаунта
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error;
    if (error.config?.headers?.Authorization && (status === 401 || message === 'Invalid or expired token.')) {
      handleTokenExpired();
    }
    return Promise.reject(error);
  }
);

// данные пользователя из JWT-токена: { id, email, role }
export function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return JSON.parse(atob(token.split('.')[1]));
}

export const loginAPI = (email, password) => api.post('/auth/login', { email, password });
export const registerAPI = (email, password) => api.post('/auth/register', { email, password });

export const fetchTweetsAPI = (params, signal) => api.get('/tweets', { params, signal });
export const createTweetAPI = (data) => api.post('/tweets', data);
export const updateTweetAPI = (id, data) => api.put(`/tweets/${id}`, data);
export const deleteTweetAPI = (id) => api.delete(`/tweets/${id}`);
export const likeTweetAPI = (id) => api.post(`/tweets/${id}/like`);

export const fetchUsersAPI = () => api.get('/admin/users');
export const banUserAPI = (id, banReason) => api.post(`/admin/users/${id}/ban`, { banReason });
export const unbanUserAPI = (id) => api.post(`/admin/users/${id}/unban`);
export const changeRoleAPI = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const fetchLogsAPI = (page, search, signal) =>
  api.get('/admin/logs', { params: { page, limit: 10, search }, signal });

export const fetchMyStatsAPI = () => api.get('/stats/me');

export const fetchCommentCountsAPI = (tweetIds) => api.get('/comments/counts', { params: { tweetIds: tweetIds.join(',') } });
export const fetchCommentsAPI = (tweetId) => api.get('/comments', { params: { tweetId, limit: 100 } });
export const createCommentAPI = (tweetId, text) => api.post('/comments', { tweetId, text });
export const updateCommentAPI = (id, text) => api.put(`/comments/${id}`, { text });
export const deleteCommentAPI = (id) => api.delete(`/comments/${id}`);
export const likeCommentAPI = (id) => api.patch(`/comments/${id}/like`);
export const addReplyAPI = (id, text, replyTo) => api.post(`/comments/${id}/replies`, { text, replyTo });
export const likeReplyAPI = (id, replyId) => api.patch(`/comments/${id}/replies/${replyId}/like`);
export const deleteReplyAPI = (id, replyId) => api.delete(`/comments/${id}/replies/${replyId}`);
