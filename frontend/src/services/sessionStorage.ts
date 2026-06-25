// Centralized secure session storage. No screen or feature service should call SecureStore directly.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'Admin' | 'Doctor' | 'Patient' | 'Receptionist' | 'Pharmacist' | 'Laboratory Staff';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface StoredSession {
  accessToken: string;
  user: SessionUser;
}

type SessionListener = (session: StoredSession | null) => void;

const SESSION_KEYS = {
  accessToken: 'medicore.auth.accessToken',
  userId: 'medicore.auth.userId',
  userRole: 'medicore.auth.userRole',
  userName: 'medicore.auth.userName',
  userEmail: 'medicore.auth.userEmail',
} as const;

const LEGACY_SECURE_STORE_KEYS = ['auth_token'];
const LEGACY_ASYNC_STORAGE_KEYS = ['user_info'];
const VALID_ROLES: UserRole[] = ['Admin', 'Doctor', 'Patient', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];
const listeners = new Set<SessionListener>();

const isUserRole = (role: unknown): role is UserRole => (
  typeof role === 'string' && VALID_ROLES.includes(role as UserRole)
);

const cleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const toSessionUser = (value: unknown): SessionUser | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  const name = cleanString(candidate.name);
  const email = cleanString(candidate.email);
  const role = candidate.role;

  if (!id || !name || !email || !isUserRole(role)) return null;

  return { id, name, email, role };
};

const notifySessionChanged = (session: StoredSession | null) => {
  listeners.forEach((listener) => listener(session));
};

export const subscribeToSessionChanges = (listener: SessionListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearSession = async (): Promise<void> => {
  await Promise.all([
    ...Object.values(SESSION_KEYS).map((key) => SecureStore.deleteItemAsync(key)),
    ...LEGACY_SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
    ...LEGACY_ASYNC_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)),
  ]);
  notifySessionChanged(null);
};

export const saveSession = async (session: {
  accessToken: string;
  user: unknown;
}): Promise<StoredSession | null> => {
  const accessToken = cleanString(session.accessToken);
  const user = toSessionUser(session.user);

  if (!accessToken || !user) {
    await clearSession();
    return null;
  }

  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(SESSION_KEYS.userId, user.id),
    SecureStore.setItemAsync(SESSION_KEYS.userRole, user.role),
    SecureStore.setItemAsync(SESSION_KEYS.userName, user.name),
    SecureStore.setItemAsync(SESSION_KEYS.userEmail, user.email),
    ...LEGACY_SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
    ...LEGACY_ASYNC_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)),
  ]);

  const storedSession = { accessToken, user };
  notifySessionChanged(storedSession);
  return storedSession;
};

export const getSession = async (): Promise<StoredSession | null> => {
  const [accessToken, id, role, name, email] = await Promise.all([
    SecureStore.getItemAsync(SESSION_KEYS.accessToken),
    SecureStore.getItemAsync(SESSION_KEYS.userId),
    SecureStore.getItemAsync(SESSION_KEYS.userRole),
    SecureStore.getItemAsync(SESSION_KEYS.userName),
    SecureStore.getItemAsync(SESSION_KEYS.userEmail),
  ]);

  const user = toSessionUser({ id, role, name, email });

  if (!accessToken && !user) return null;

  if (!accessToken || !user) {
    await clearSession();
    return null;
  }

  return { accessToken, user };
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.accessToken ?? null;
};

export const updateSessionUser = async (user: unknown): Promise<StoredSession | null> => {
  const currentSession = await getSession();
  if (!currentSession) return null;

  return saveSession({
    accessToken: currentSession.accessToken,
    user,
  });
};
