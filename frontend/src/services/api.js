import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://connect-vlil.onrender.com/api',
  withCredentials: true, // Crucial for HTTP-Only cookies (refresh token)
});

// Request Interceptor: Attach access token if present in memory
api.interceptors.request.use(
  (config) => {
    // We import dynamically to avoid circular dependency issues at boot
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamlessly refresh expired access token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and hasn't been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { token } = res.data;
        localStorage.setItem('accessToken', token);

        // Update authorization header and process queue
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        processQueue(null, token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is invalid/expired -> log user out
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('accessToken');
        // Dispatch custom logout event so stores can react
        window.dispatchEvent(new Event('auth-logout'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
