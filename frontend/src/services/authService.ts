// Authentication adapter: secure token storage, cacheable user context, and account self-service calls.
import api from './api';
import {
  clearSession,
  getAccessToken,
  getSession,
  saveSession,
  updateSessionUser,
  UserRole,
} from './sessionStorage';

export interface User {
  id: string;
  name: string;
  role: UserRole;
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
      const session = await saveSession({ accessToken: token, user });
      if (!session) {
        return { success: false, message: 'Unable to store secure session.' };
      }
      return { success: true, token: session.accessToken, user: session.user };
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
    await clearSession();
  } catch (error) {
    console.error('[Auth Service] Error clearing session storage:', error);
  }
};

/**
 * Retrieves the currently active user profile from local storage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const session = await getSession();
    return session?.user ?? null;
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
      const session = await updateSessionUser(user);
      return session?.user ?? null;
    }
    return null;
  } catch (error: any) {
    console.error('[Auth Service] Profile fetch error:', error.response?.data || error.message);
    // A rejected token ends the session; other failures retain cached identity for graceful offline use.
    if (error.response?.status === 401) {
      return null;
    }
    return getCurrentUser();
  }
};

export const validateCurrentSession = async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;

  try {
    const response = await api.get('/auth/me');
    const user = response.data.data?.user;
    if (!user) {
      await clearSession();
      return null;
    }

    const updatedSession = await updateSessionUser(user);
    return updatedSession?.user ?? session.user;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }

    console.warn('[Auth Service] Session validation skipped:', error.response?.data || error.message);
    return session.user;
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
    return await getAccessToken();
  } catch {
    return null;
  }
};
// Used during app bootstrap only; protected API requests still validate the token server-side.
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};
