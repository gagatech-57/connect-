import { create } from 'zustand';
import api from '../services/api.js';

export const useAuthStore = create((set, get) => {
  // Listen for the custom logout event from axios interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-logout', () => {
      set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
    });
  }

  return {
    user: null,
    token: localStorage.getItem('accessToken') || null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    isCheckingAuth: true,
    error: null,

    // Boot hook: verify if user session is valid
    checkAuth: async () => {
      set({ isCheckingAuth: true, error: null });
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ user: null, isAuthenticated: false, isCheckingAuth: false });
          return;
        }

        const res = await api.get('/users/profile');
        set({ user: res.data.user, isAuthenticated: true, isCheckingAuth: false });
      } catch (err) {
        console.error('Check auth failed:', err.message);
        localStorage.removeItem('accessToken');
        set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
      }
    },

    register: async (username, fullName, email, password) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/register', { username, fullName, email, password });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    verifyOTP: async (email, otp) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/verify-otp', { email, otp });
        const { token, user } = res.data;
        localStorage.setItem('accessToken', token);
        set({ token, user, isAuthenticated: true });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Verification failed';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    resendOTP: async (email) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/resend-otp', { email });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to resend OTP';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    login: async (email, password) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        
        localStorage.setItem('accessToken', token);
        set({ token, user, isAuthenticated: true });
        return res.data;
      } catch (err) {
        // If login returns unverified error (which we map to 403 or specific flags)
        if (err.response?.status === 403 || err.response?.data?.message === 'Email not verified') {
          return { unverified: true, email };
        }
        const errMsg = err.response?.data?.message || 'Login failed';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.error('Logout request failed:', err.message);
      } finally {
        localStorage.removeItem('accessToken');
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    forgotPassword: async (email) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to process request';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    resetPassword: async (email, otp, newPassword) => {
      set({ error: null });
      try {
        const res = await api.post('/auth/reset-password', { email, otp, newPassword });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to reset password';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    changePassword: async (oldPassword, newPassword) => {
      set({ error: null });
      try {
        const res = await api.put('/auth/change-password', { oldPassword, newPassword });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to change password';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    updateProfile: async (data) => {
      set({ error: null });
      try {
        const res = await api.put('/users/profile', data);
        set({ user: res.data.user });
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to update profile';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },

    updateAvatar: async (formData) => {
      set({ error: null });
      try {
        const res = await api.put('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        set((state) => ({ user: { ...state.user, avatar: res.data.avatar } }));
        return res.data;
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to upload avatar';
        set({ error: errMsg });
        throw new Error(errMsg);
      }
    },
  };
});
