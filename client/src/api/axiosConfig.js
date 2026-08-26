import axios from 'axios';

// Create a pre-configured axios instance pointing to your backend
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach the JWT token to every request, if we have one saved
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;