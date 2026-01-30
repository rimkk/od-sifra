import { create } from 'zustand';
import { api } from '@/lib/api';

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

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadStoredAuth: () => void;
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

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

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

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

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

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadStoredAuth: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token
        api.get('/auth/me')
          .then((response) => {
            set({
              user: response.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          })
          .catch(() => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            set({ isLoading: false });
          });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      set({ user: updatedUser });
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
  },
}));
