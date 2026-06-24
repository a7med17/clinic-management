// Authentication adapter: secure token storage, cacheable user context, and account self-service calls.
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// The token belongs in encrypted device storage; the non-sensitive user snapshot supports offline rendering.
const TOKEN_KEY = 'auth_token';

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Doctor' | 'Patient' | 'Receptionist' | 'Pharmacist' | 'Laboratory Staff';
  email: string;
  is_active?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

/**
 * Performs login call to backend
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const responseData = response.data;

    if (responseData.success && responseData.data?.token) {
      const { token, user } = responseData.data;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await AsyncStorage.setItem('user_info', JSON.stringify(user));
      return { success: true, token, user };
    }
    
    return { success: false, message: responseData.message || 'Verification failed.' };
  } catch (error: any) {
    console.error('[Auth Service] Login call error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Connection failed. Ensure backend server is running.';
    return { success: false, message: errorMessage };
  }
};

/**
 * Clears stored credentials and logs out user
 */
export const logout = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem('user_info');
  } catch (error) {
    console.error('[Auth Service] Error clearing session storage:', error);
  }
};

/**
 * Retrieves the currently active user profile from local storage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

// Prefer the authoritative server profile so role/status changes take effect on the next app start.
export const getCurrentUserProfile = async (): Promise<User | null> => {
  try {
    const response = await api.get('/auth/me');
    const user = response.data.data?.user;
    if (user) {
      await AsyncStorage.setItem('user_info', JSON.stringify(user));
    }
    return user || null;
  } catch (error: any) {
    console.error('[Auth Service] Profile fetch error:', error.response?.data || error.message);
    // A rejected token ends the session; other failures retain cached identity for graceful offline use.
    if (error.response?.status === 401) {
      await logout();
      return null;
    }
    return getCurrentUser();
  }
};

// Registration intentionally does not persist the returned token; the screen directs users to sign in explicitly.
export const register = async (payload: RegisterPayload): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.post('/auth/register', payload);
    return { success: Boolean(response.data.success), message: response.data.message };
  } catch (error: any) {
    console.error('[Auth Service] Registration call error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Unable to create the account.' };
  }
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.patch('/auth/change-password', payload);
    return { success: true, message: response.data.message || 'Password changed successfully.' };
  } catch (error: any) {
    console.error('[Auth Service] Change password error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Unable to change password.' };
  }
};

/**
 * Gets the token
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};
// Used during app bootstrap only; protected API requests still validate the token server-side.
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};
