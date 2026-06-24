// Read-only pharmacy inventory adapter currently used by the pharmacist dashboard/list screens.
import api from './api';

export interface Medicine {
  id: string;
  name: string;
  quantity: number;
  price?: number | string | null;
  expiry_date?: string | null;
  created_at?: string;
}

// Normalize the standard backend envelope so screen code remains focused on view state.
const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const getMedicines = async (params?: { search?: string; low_stock?: boolean; expired?: boolean }): Promise<Medicine[]> =>
  unwrap(await api.get('/medicines', { params }));
