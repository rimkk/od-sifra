import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; inviteToken?: string }) =>
    api.post('/auth/register', data),
  setup: (data: { email: string; password: string; name: string; workspaceName: string; workspaceSlug: string }) =>
    api.post('/auth/setup', data),
  getSetupStatus: () => api.get('/auth/setup-status'),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: { name?: string; phone?: string; avatarUrl?: string }) =>
    api.patch('/auth/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Workspaces
export const workspaceApi = {
  getAll: () => api.get('/workspaces'),
  getById: (id: string) => api.get(`/workspaces/${id}`),
  create: (data: { name: string; slug: string; description?: string; defaultCurrency?: string }) =>
    api.post('/workspaces', data),
  update: (id: string, data: any) => api.patch(`/workspaces/${id}`, data),
  getMembers: (id: string) => api.get(`/workspaces/${id}/members`),
  getMember: (workspaceId: string, userId: string) =>
    api.get(`/workspaces/${workspaceId}/members/${userId}`),
  addMember: (workspaceId: string, data: { email: string; name: string; role: string; phone?: string; password?: string }) =>
    api.post(`/workspaces/${workspaceId}/members`, data),
  updateMember: (workspaceId: string, userId: string, data: { role?: string }) =>
    api.patch(`/workspaces/${workspaceId}/members/${userId}`, data),
  removeMember: (workspaceId: string, userId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${userId}`),
};

// Boards
export const boardApi = {
  getByWorkspace: (workspaceId: string) => api.get(`/boards/workspace/${workspaceId}`),
  getById: (id: string) => api.get(`/boards/${id}`),
  create: (data: { workspaceId: string; name: string; type?: string; description?: string; color?: string; isPublic?: boolean }) =>
    api.post('/boards', data),
  update: (id: string, data: any) => api.patch(`/boards/${id}`, data),
  delete: (id: string) => api.delete(`/boards/${id}`),
  addMember: (boardId: string, userId: string, canEdit?: boolean) =>
    api.post(`/boards/${boardId}/members`, { userId, canEdit }),
  removeMember: (boardId: string, userId: string) =>
    api.delete(`/boards/${boardId}/members/${userId}`),
};

// Groups
export const groupApi = {
  create: (data: { boardId: string; name: string; color?: string }) =>
    api.post('/groups', data),
  update: (id: string, data: { name?: string; color?: string; collapsed?: boolean }) =>
    api.patch(`/groups/${id}`, data),
  reorder: (boardId: string, groupIds: string[]) =>
    api.post('/groups/reorder', { boardId, groupIds }),
  delete: (id: string) => api.delete(`/groups/${id}`),
};

// Columns
export const columnApi = {
  create: (data: { boardId: string; name: string; type: string; settings?: any; width?: number }) =>
    api.post('/columns', data),
  update: (id: string, data: any) => api.patch(`/columns/${id}`, data),
  reorder: (boardId: string, columnIds: string[]) =>
    api.post('/columns/reorder', { boardId, columnIds }),
  delete: (id: string) => api.delete(`/columns/${id}`),
};

// Tasks
export const taskApi = {
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: { groupId: string; name: string }) =>
    api.post('/tasks', data),
  update: (id: string, data: { name?: string; groupId?: string }) =>
    api.patch(`/tasks/${id}`, data),
  updateField: (taskId: string, columnId: string, value: any) =>
    api.patch(`/tasks/${taskId}/field/${columnId}`, { value }),
  reorder: (groupId: string, taskIds: string[]) =>
    api.post('/tasks/reorder', { groupId, taskIds }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  // Assignments
  assign: (taskId: string, userId: string) =>
    api.post(`/tasks/${taskId}/assign`, { userId }),
  unassign: (taskId: string, userId: string) =>
    api.delete(`/tasks/${taskId}/assign/${userId}`),
  // Comments
  addComment: (taskId: string, content: string) =>
    api.post(`/tasks/${taskId}/comments`, { content }),
  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),
  // Sub-tasks
  addSubTask: (taskId: string, name: string) =>
    api.post(`/tasks/${taskId}/subtasks`, { name }),
  updateSubTask: (taskId: string, subTaskId: string, data: { name?: string; isCompleted?: boolean }) =>
    api.patch(`/tasks/${taskId}/subtasks/${subTaskId}`, data),
  deleteSubTask: (taskId: string, subTaskId: string) =>
    api.delete(`/tasks/${taskId}/subtasks/${subTaskId}`),
};

// Invites
export const inviteApi = {
  create: (data: { workspaceId: string; email: string; role: string }) =>
    api.post('/invites', data),
  getByToken: (token: string) => api.get(`/invites/token/${token}`),
  getByWorkspace: (workspaceId: string) => api.get(`/invites/workspace/${workspaceId}`),
  cancel: (id: string) => api.delete(`/invites/${id}`),
  resend: (id: string) => api.post(`/invites/${id}/resend`),
};

// Threads (Messages)
export const threadApi = {
  getAll: () => api.get('/threads'),
  getById: (id: string) => api.get(`/threads/${id}`),
  create: (data: { workspaceId: string; participantIds: string[]; title?: string; initialMessage?: string }) =>
    api.post('/threads', data),
  sendMessage: (threadId: string, content: string) =>
    api.post(`/threads/${threadId}/messages`, { content }),
  markAsRead: (threadId: string) => api.post(`/threads/${threadId}/read`),
};

// Notifications
export const notificationApi = {
  getAll: (unreadOnly?: boolean) => api.get(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export default api;
