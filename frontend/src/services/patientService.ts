// Patient portal API adapter. The backend scopes each endpoint to the signed-in patient.
import api from './api';
import { AppointmentStatus } from './doctorService';

export interface PatientAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  notes?: string | null;
  doctor_notes?: string | null;
  doctors?: any;
}

export interface PatientDashboardData {
  patient: any;
  appointmentCount: number;
  upcomingAppointment: PatientAppointment | null;
  latestLabResult: any | null;
  healthSummary: {
    bloodType?: string | null;
    allergies?: string | null;
    medicalConditions?: string | null;
    emergencyContact?: string | null;
  };
  recentActivity: {
    appointments: PatientAppointment[];
    labResults: any[];
  };
}

export interface PatientRecordsData {
  profile: any;
  appointmentHistory: PatientAppointment[];
  labResults: any[];
}

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getPatientDashboard = async (): Promise<PatientDashboardData> => unwrap(await api.get('/patient/dashboard'));

export const getPatientAppointments = async (params?: { view?: 'upcoming' | 'past'; status?: string }): Promise<PatientAppointment[]> =>
  unwrap(await api.get('/patient/appointments', { params }));

export const bookPatientAppointment = async (payload: { doctor_id: string; appointment_date: string; notes?: string }): Promise<PatientAppointment> =>
  unwrap(await api.post('/patient/appointments', payload));

export const cancelPatientAppointment = async (id: string): Promise<PatientAppointment> =>
  unwrap(await api.patch(`/patient/appointments/${id}/cancel`));

export const getPatientRecords = async (): Promise<PatientRecordsData> => unwrap(await api.get('/patient/records'));

export const getPatientLabResults = async (): Promise<any[]> => unwrap(await api.get('/patient/lab-results'));

export const getPatientProfile = async (): Promise<any> => unwrap(await api.get('/patient/profile'));

export const updatePatientProfile = async (payload: Record<string, any>): Promise<any> => unwrap(await api.put('/patient/profile', payload));

export const getDoctorsForBooking = async (): Promise<any[]> => unwrap(await api.get('/doctors'));
