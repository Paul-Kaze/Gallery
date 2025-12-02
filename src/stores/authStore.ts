import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../lib/api';

interface User {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface Admin {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null, token: string | null) => void;
  setAdmin: (admin: Admin | null, token: string | null) => void;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      admin: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user, token) => {
        set({ user, admin: null, token, error: null });
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
      },

      setAdmin: (admin, token) => {
        set({ admin, user: null, token, error: null });
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
      },

      loginWithGoogle: async (googleToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.googleLogin(googleToken);
          if (response.type === 'admin' && response.admin) {
            set({ 
              admin: response.admin, 
              user: null, 
              token: response.token, 
              isLoading: false,
              error: null
            });
          } else {
            set({ 
              user: response.user, 
              admin: null, 
              token: response.token, 
              isLoading: false,
              error: null
            });
          }
          localStorage.setItem('auth_token', response.token || '');
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Google login failed' 
          });
          throw error;
        }
      },

      loginAsAdmin: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.adminLogin(username, password);
          set({ 
            admin: response.admin, 
            user: null, 
            token: response.token, 
            isLoading: false,
            error: null
          });
          localStorage.setItem('auth_token', response.token);
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Admin login failed' 
          });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, admin: null, token: null, error: null });
        localStorage.removeItem('auth_token');
      },

      validateToken: async () => {
        const token = get().token || localStorage.getItem('auth_token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await apiClient.validateToken(token);
          if (response.type === 'user') {
            set({ user: response.user, admin: null, isLoading: false });
          } else if (response.type === 'admin') {
            set({ admin: response.admin, user: null, isLoading: false });
          } else {
            set({ user: null, admin: null, token: null, isLoading: false });
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          // 验证失败，清除认证状态
          set({ user: null, admin: null, token: null, isLoading: false });
          localStorage.removeItem('auth_token');
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // localStorage中的键名
      partialize: (state) => ({ 
        user: state.user, 
        admin: state.admin, 
        token: state.token 
      }), // 只持久化这些字段
    }
  )
);
