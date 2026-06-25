import api from './api';

export interface AppointmentRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status?: string;
  notes?: string | null;
  doctor_notes?: string | null;
  patients?: any;
  doctors?: any;
}

export type AppointmentPayload = {
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const listAppointments = async (params?: Record<string, string | undefined>): Promise<AppointmentRecord[]> =>
  unwrap(await api.get('/appointments', { params }));

export const createAppointment = async (payload: AppointmentPayload): Promise<AppointmentRecord> =>
  unwrap(await api.post('/appointments', payload));

export const updateAppointment = async (id: string, payload: Partial<AppointmentPayload> & Record<string, any>): Promise<AppointmentRecord> =>
  unwrap(await api.put(`/appointments/${id}`, payload));

export const cancelAppointment = async (id: string): Promise<AppointmentRecord> =>
  unwrap(await api.delete(`/appointments/${id}`));

export const getAppointmentById = async (id: string): Promise<AppointmentRecord> =>
  unwrap(await api.get(`/appointments/${id}`));

export const checkInPatient = async (id: string): Promise<AppointmentRecord> =>
  unwrap(await api.patch(`/reception/appointments/${id}/check-in`));