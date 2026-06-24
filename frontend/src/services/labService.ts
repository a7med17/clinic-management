// Laboratory adapter for staff test queues and result/status updates.
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

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getLabTests = async (params?: { status?: string; search?: string }): Promise<LabTestRecord[]> =>
  unwrap(await api.get('/lab-tests', { params }));

export const updateLabTest = async (id: string, payload: Partial<Pick<LabTestRecord, 'status' | 'result' | 'test_name'>>): Promise<LabTestRecord> =>
  unwrap(await api.put(`/lab-tests/${id}`, payload));
