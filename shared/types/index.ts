// Shared types between backend and mobile app

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';

export type PropertyStatus = 'ACTIVE' | 'VACANT' | 'RENOVATION' | 'SOLD';

export type RenovationStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type NotificationType = 
  | 'STATUS_CHANGE' 
  | 'VISIT_SCHEDULED' 
  | 'VISIT_COMPLETED' 
  | 'MESSAGE' 
  | 'RENOVATION_UPDATE' 
  | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Property {
  id: string;
  customerId: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  description?: string;
  purchaseCost: number;
  monthlyRent: number;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  rentalStart?: string;
  rentalEnd?: string;
  status: PropertyStatus;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Renovation {
  id: string;
  propertyId: string;
  title: string;
  description?: string;
  status: RenovationStatus;
  budget?: number;
  actualCost?: number;
  startDate?: string;
  endDate?: string;
  steps: RenovationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface RenovationStep {
  id: string;
  renovationId: string;
  title: string;
  description?: string;
  status: RenovationStatus;
  orderIndex: number;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  inviterId: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  invitationToken?: string;
}

// Dashboard types
export interface AdminOverview {
  totalCustomers: number;
  totalEmployees: number;
  totalProperties: number;
  activeProperties: number;
  vacantProperties: number;
  totalMonthlyRent: number;
  estimatedAnnualRevenue: number;
  recentCustomers: Pick<User, 'id' | 'name' | 'email' | 'createdAt'>[];
}

export interface CustomerFinancials {
  totalProperties: number;
  activeProperties: number;
  vacantProperties: number;
  totalPurchaseCost: number;
  totalMonthlyRent: number;
  estimatedAnnualIncome: number;
  properties: {
    id: string;
    address: string;
    purchaseCost: number;
    monthlyRent: number;
    status: PropertyStatus;
  }[];
}

export interface CustomerWithStats extends User {
  totalProperties: number;
  activeProperties: number;
  totalMonthlyRent: number;
  daysSinceOnboarding: number;
  assignedEmployee?: Pick<User, 'id' | 'name' | 'email'>;
}

// Conversation types
export interface Conversation {
  partner: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'role'>;
  lastMessage?: Message;
  unreadCount: number;
}
