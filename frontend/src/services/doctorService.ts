// Doctor portal API adapter for the authenticated doctor's schedule, patients, notes, and lab requests.
import api from './api';

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Checked In' | 'In Consultation' | 'Completed' | 'Cancelled' | 'No Show';
export type LabStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';

export interface DoctorAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  notes?: string | null;
  doctor_notes?: string | null;
  patients?: any;
  doctors?: any;
}

export interface DoctorDashboardData {
  doctor: any;
  metrics: {
    todaysAppointments: number;
    pendingConsultations: number;
    patientQueue: number;
    labRequests: number;
    completedToday: number;
  };
  upcomingAppointments: DoctorAppointment[];
}

export interface DoctorPatientDetail {
  patient: any;
  appointmentHistory: DoctorAppointment[];
}

export interface DoctorLabTest {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  status: LabStatus;
  result?: string | null;
  created_at: string;
  patients?: any;
}

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getDoctorDashboard = async (): Promise<DoctorDashboardData> => unwrap(await api.get('/doctor/dashboard'));

export const getDoctorAppointments = async (params?: { view?: 'today' | 'upcoming'; status?: string }): Promise<DoctorAppointment[]> =>
  unwrap(await api.get('/doctor/appointments', { params }));

export const getDoctorAppointment = async (id: string): Promise<DoctorAppointment> => unwrap(await api.get(`/doctor/appointments/${id}`));

export const updateDoctorAppointmentStatus = async (id: string, status: AppointmentStatus): Promise<DoctorAppointment> =>
  unwrap(await api.patch(`/doctor/appointments/${id}/status`, { status }));

export const updateDoctorAppointmentNotes = async (id: string, doctor_notes: string, complete = false): Promise<DoctorAppointment> =>
  unwrap(await api.patch(`/doctor/appointments/${id}/notes`, { doctor_notes, complete }));

export const getDoctorPatients = async (): Promise<any[]> => unwrap(await api.get('/doctor/patients'));

export const getDoctorPatient = async (id: string): Promise<DoctorPatientDetail> => unwrap(await api.get(`/doctor/patients/${id}`));

export const getDoctorLabTests = async (status?: string): Promise<DoctorLabTest[]> =>
  unwrap(await api.get('/doctor/lab-tests', { params: status ? { status } : undefined }));

export const createDoctorLabTest = async (payload: { patient_id: string; test_name: string }): Promise<DoctorLabTest> =>
  unwrap(await api.post('/doctor/lab-tests', payload));

export const getDoctorProfile = async (): Promise<any> => unwrap(await api.get('/doctor/profile'));
