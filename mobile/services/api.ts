import axios from 'axios';
import Constants from 'expo-constants';

// API base URL - update this for production
const API_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.odsifra.com/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('[API Error]', error.response.status, error.response.data);
    } else if (error.request) {
      // No response received
      console.error('[API Error] No response received');
    } else {
      console.error('[API Error]', error.message);
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
  registerPushToken: (token: string, platform: string) => 
    api.post('/users/push-token', { token, platform }),
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
