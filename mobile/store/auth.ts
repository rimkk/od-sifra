import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  invitationToken?: string;
}

const TOKEN_KEY = 'od_sifra_token';
const USER_KEY = 'od_sifra_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;

      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data);
      const { user, accessToken } = response.data;

      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    delete api.defaults.headers.common['Authorization'];

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token is still valid
        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token expired, clear storage
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      set({ user: updatedUser });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
    }
  },
}));
