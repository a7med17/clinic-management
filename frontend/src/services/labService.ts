// Laboratory adapter for staff test queues, lab request queue, and result/status updates.
import api from './api';

export type LabTestStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';

export interface LabTestRecord {
  id: string;
  patient_id?: string | null;
  doctor_id?: string | null;
  test_name: string;
  status: LabTestStatus;
  result?: string | null;
  created_at: string;
  patients?: any;
  doctors?: any;
}

export interface LabDashboardData {
  pendingRequests: number;
  processingRequests: number;
  completedToday: number;
  urgentRequests: number;
}

export interface LabRequestTest {
  id: string;
  test_name: string;
  priority: string;
  status: string;
  clinical_notes?: string;
  created_at: string;
}

export interface LabRequestRecord {
  id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  patients: { id: string; name: string };
  doctors: { id: string; name: string };
  appointments: { id: string; appointment_date: string; status: string };
  lab_request_tests: LabRequestTest[];
  highest_priority?: string;
}

export interface LabRequestDetail {
  id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  patients: { id: string; name: string; email: string; phone: string; date_of_birth: string; gender: string; blood_type: string };
  doctors: { id: string; name: string; specialization: string; phone: string; email: string };
  appointments: { id: string; appointment_date: string; status: string; notes: string };
  lab_request_tests: LabRequestTest[];
}

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getLabTests = async (params?: { status?: string; search?: string }): Promise<LabTestRecord[]> =>
  unwrap(await api.get('/lab-tests', { params }));

export const updateLabTest = async (id: string, payload: Partial<Pick<LabTestRecord, 'status' | 'result' | 'test_name'>>): Promise<LabTestRecord> =>
  unwrap(await api.put(`/lab-tests/${id}`, payload));

export const getLabDashboard = async (): Promise<LabDashboardData> =>
  unwrap(await api.get('/lab/dashboard'));

export const getLabRequests = async (): Promise<LabRequestRecord[]> =>
  unwrap(await api.get('/lab/requests'));

export const getLabRequest = async (id: string): Promise<LabRequestDetail> =>
  unwrap(await api.get(`/lab/requests/${id}`));

export const startProcessing = async (id: string): Promise<LabRequestDetail> =>
  unwrap(await api.patch(`/lab/requests/${id}/start-processing`));

export const cancelRequest = async (id: string, cancellation_reason?: string): Promise<LabRequestDetail> =>
  unwrap(await api.patch(`/lab/requests/${id}/cancel`, { cancellation_reason }));
