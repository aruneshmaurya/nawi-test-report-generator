import axios from 'axios';

let rawBase = import.meta.env.VITE_API_BASE_URL || '';
rawBase = rawBase.trim();

if (rawBase) {
  // Ensure protocol
  if (!rawBase.startsWith('http://') && !rawBase.startsWith('https://') && !rawBase.startsWith('/')) {
    rawBase = `https://${rawBase}`;
  }
  // Ensure /api suffix
  if (!rawBase.endsWith('/api') && !rawBase.endsWith('/api/')) {
    rawBase = rawBase.replace(/\/+$/, '') + '/api';
  }
} else {
  rawBase = '/api';
}

export const apiClient = axios.create({
  baseURL: rawBase,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nawi_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized and redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if already on /login or /verify
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/verify')) {
        localStorage.removeItem('nawi_token');
        localStorage.removeItem('nawi_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
