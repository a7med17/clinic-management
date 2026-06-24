// Admin portal API adapter and the response types consumed by role-management screens.
import api from './api';
import { Role } from '../ui/clinicData';

export interface AdminDashboardSummary {
  cards: {
    totalPatients: number;
    totalDoctors: number;
    todaysAppointments: number;
    pendingBills: number;
  };
  summary: {
    activeStaff: number;
    waitingPatients: number;
    completedAppointments: number;
    systemStatus: string;
  };
  generatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveStaff {
  id: string;
  name: string;
  role: Role;
  email: string;
  is_active: boolean;
  availability: string;
}

// Backend responses use { success, message, data }; components only need the payload itself.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getAdminDashboardSummary = async (): Promise<AdminDashboardSummary> => {
  try {
    return unwrap(await api.get('/admin/dashboard/metrics'));
  } catch (error: any) {
    console.error('[Admin Service] Dashboard metrics request failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      baseURL: error.config?.baseURL,
      url: error.config?.url,
    });
    throw error;
  }
};

export const getAdminUsers = async (params?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]> => {
  return unwrap(await api.get('/admin/users', { params }));
};

export const createAdminUser = async (payload: { name: string; email: string; password: string; role: Role }): Promise<AdminUser> => {
  return unwrap(await api.post('/admin/users', payload));
};

export const updateAdminUser = async (id: string, payload: Partial<Pick<AdminUser, 'name' | 'email' | 'role'>>): Promise<AdminUser> => {
  return unwrap(await api.put(`/admin/users/${id}`, payload));
};

export const updateAdminUserStatus = async (id: string, is_active: boolean): Promise<AdminUser> => {
  return unwrap(await api.patch(`/admin/users/${id}/status`, { is_active }));
};

export const resetAdminUserPassword = async (id: string, password: string): Promise<AdminUser> => {
  return unwrap(await api.patch(`/admin/users/${id}/password`, { password }));
};

export const getActiveStaff = async (): Promise<ActiveStaff[]> => {
  return unwrap(await api.get('/admin/staff/active'));
};
