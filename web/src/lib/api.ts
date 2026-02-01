import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('od_sifra_token');
        localStorage.removeItem('od_sifra_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Property API
export const propertyApi = {
  getAll: () => api.get('/properties'),
  getById: (id: string) => api.get(`/properties/${id}`),
  create: (data: any) => api.post('/properties', data),
  update: (id: string, data: any) => api.put(`/properties/${id}`, data),
  delete: (id: string) => api.delete(`/properties/${id}`),
  getFinancials: (customerId: string) =>
    api.get(`/properties/customer/${customerId}/financials`),
};

// Renovation API
export const renovationApi = {
  getById: (id: string) => api.get(`/renovations/${id}`),
  create: (data: any) => api.post('/renovations', data),
  update: (id: string, data: any) => api.put(`/renovations/${id}`, data),
  addStep: (renovationId: string, data: any) =>
    api.post(`/renovations/${renovationId}/steps`, data),
  updateStep: (stepId: string, data: any) =>
    api.put(`/renovations/steps/${stepId}`, data),
  getByProperty: (propertyId: string) =>
    api.get(`/renovations/property/${propertyId}`),
};

// Message API
export const messageApi = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: string, page = 1) =>
    api.get(`/messages/with/${userId}?page=${page}`),
  send: (data: { receiverId: string; content: string }) =>
    api.post('/messages', data),
  markAsRead: (id: string) => api.put(`/messages/${id}/read`),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// User API
export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),
  getContacts: () => api.get('/users/contacts'),
  // Admin user management
  getPending: () => api.get('/users/pending'),
  getAll: () => api.get('/users/all'),
  approve: (userId: string) => api.post(`/users/${userId}/approve`),
  reject: (userId: string) => api.post(`/users/${userId}/reject`),
};

// Invitation API
export const invitationApi = {
  validate: (token: string) => api.get(`/invitations/validate/${token}`),
  create: (data: { email: string; role: string }) =>
    api.post('/invitations', data),
  getAll: () => api.get('/invitations'),
  delete: (id: string) => api.delete(`/invitations/${id}`),
};

// Admin API
export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getCustomers: (page = 1) => api.get(`/admin/customers?page=${page}`),
  getCustomerDetails: (id: string) => api.get(`/admin/customers/${id}`),
  getEmployees: (page = 1) => api.get(`/admin/employees?page=${page}`),
  assignCustomer: (customerId: string, employeeId: string) =>
    api.post('/admin/assign-customer', { customerId, employeeId }),
  toggleUserStatus: (id: string) => api.put(`/admin/users/${id}/toggle-status`),
};

// Customer Accounts API
export const customerAccountApi = {
  // Get all customer accounts
  getAll: () => api.get('/customer-accounts'),
  // Get single account
  getById: (id: string) => api.get(`/customer-accounts/${id}`),
  // Create new account (with optional primary user)
  create: (data: {
    accountName: string;
    description?: string;
    primaryUser?: {
      email: string;
      password: string;
      name: string;
      phone?: string;
    };
  }) => api.post('/customer-accounts', data),
  // Update account
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/customer-accounts/${id}`, data),
  // Add user directly to account
  addUser: (accountId: string, data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => api.post(`/customer-accounts/${accountId}/users`, data),
  // Invite multiple users to account
  inviteUsers: (accountId: string, emails: string[]) =>
    api.post(`/customer-accounts/${accountId}/invite`, { emails }),
  // Remove user from account
  removeUser: (accountId: string, userId: string) =>
    api.delete(`/customer-accounts/${accountId}/users/${userId}`),
};

// Notification API
export const notificationApi = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};
