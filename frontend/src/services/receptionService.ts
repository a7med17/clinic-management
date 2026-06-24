// Reception portal API adapter for front-desk registration, booking, waiting-room, and billing workflows.
import api from './api';
import { AppointmentStatus } from './doctorService';

export interface ReceptionAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  notes?: string | null;
  patients?: any;
  doctors?: any;
  queuePosition?: number;
}

export interface ReceptionPatient {
  id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_type?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  insurance_provider?: string | null;
  upcomingAppointment?: ReceptionAppointment | null;
  billingStatus?: string;
}

export interface ReceptionDashboardData {
  metrics: {
    todaysAppointments: number;
    waitingPatients: number;
    checkedInPatients: number;
    newRegistrationsToday: number;
    pendingBillingCount: number;
  };
  waitingRoom: ReceptionAppointment[];
}

export interface ReceptionInvoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  appointment_id?: string | null;
  total_amount: number | string;
  status: 'Unpaid' | 'Paid' | 'Partially Paid' | 'Refunded';
  due_date: string;
  patients?: any;
  appointments?: any;
}

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getReceptionDashboard = async (): Promise<ReceptionDashboardData> => unwrap(await api.get('/reception/dashboard'));

export const getReceptionPatients = async (search?: string): Promise<ReceptionPatient[]> =>
  unwrap(await api.get('/reception/patients', { params: search ? { search } : undefined }));

export const createReceptionPatient = async (payload: Record<string, any>): Promise<ReceptionPatient> =>
  unwrap(await api.post('/reception/patients', payload));

export const updateReceptionPatient = async (id: string, payload: Record<string, any>): Promise<ReceptionPatient> =>
  unwrap(await api.put(`/reception/patients/${id}`, payload));

export const getReceptionAppointments = async (params?: { view?: 'today' | 'upcoming'; status?: string }): Promise<ReceptionAppointment[]> =>
  unwrap(await api.get('/reception/appointments', { params }));

export const createReceptionAppointment = async (payload: Record<string, any>): Promise<ReceptionAppointment> =>
  unwrap(await api.post('/reception/appointments', payload));

export const updateReceptionAppointment = async (id: string, payload: Record<string, any>): Promise<ReceptionAppointment> =>
  unwrap(await api.put(`/reception/appointments/${id}`, payload));

export const checkInReceptionAppointment = async (id: string): Promise<ReceptionAppointment> =>
  unwrap(await api.patch(`/reception/appointments/${id}/check-in`));

export const cancelReceptionAppointment = async (id: string): Promise<ReceptionAppointment> =>
  unwrap(await api.patch(`/reception/appointments/${id}/cancel`));

export const getReceptionWaitingRoom = async (): Promise<ReceptionAppointment[]> => unwrap(await api.get('/reception/waiting-room'));

export const getReceptionInvoices = async (): Promise<ReceptionInvoice[]> => unwrap(await api.get('/reception/invoices'));

export const createReceptionInvoice = async (payload: Record<string, any>): Promise<ReceptionInvoice> =>
  unwrap(await api.post('/reception/invoices', payload));

export const recordReceptionPayment = async (id: string, payload: { amount: string | number; payment_method: string }): Promise<any> =>
  unwrap(await api.patch(`/reception/invoices/${id}/payment`, payload));

export const getReceptionProfile = async (): Promise<any> => unwrap(await api.get('/reception/profile'));

export const updateReceptionProfile = async (payload: Record<string, any>): Promise<any> => unwrap(await api.put('/reception/profile', payload));
