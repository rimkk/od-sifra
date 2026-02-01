import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  role: string;
  workspaces: Workspace[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; inviteToken?: string }) => Promise<void>;
  setup: (data: { email: string; password: string; name: string; workspaceName: string; workspaceSlug: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      currentWorkspace: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { token, user } = res.data;

          localStorage.setItem('token', token);

          set({
            token,
            user,
            currentWorkspace: user.workspaces[0] || null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register(data);
          const { token, user } = res.data;

          localStorage.setItem('token', token);

          set({
            token,
            user,
            currentWorkspace: user.workspaces[0] || null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setup: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.setup(data);
          const { token, user } = res.data;

          localStorage.setItem('token', token);

          set({
            token,
            user,
            currentWorkspace: user.workspaces[0] || null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          token: null,
          user: null,
          currentWorkspace: null,
          isInitialized: true,
        });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isInitialized: true });
          return;
        }

        set({ isLoading: true });
        try {
          const res = await authApi.getMe();
          const { user } = res.data;

          const currentWorkspace = get().currentWorkspace;
          const validWorkspace = user.workspaces.find((w: Workspace) => w.id === currentWorkspace?.id);

          set({
            token,
            user,
            currentWorkspace: validWorkspace || user.workspaces[0] || null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          localStorage.removeItem('token');
          set({
            token: null,
            user: null,
            currentWorkspace: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace });
      },

      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
