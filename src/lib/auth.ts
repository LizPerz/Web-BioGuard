import { STORAGE_KEYS } from './security.ts';

const ACCESS_TOKEN_KEY = STORAGE_KEYS.accessToken;
const REFRESH_TOKEN_KEY = STORAGE_KEYS.refreshToken;
const USER_KEY = STORAGE_KEYS.user;
const ONBOARDING_KEY = STORAGE_KEYS.onboarding;
const PENDING_VERIFY_EMAIL_KEY = STORAGE_KEYS.pendingVerifyEmail;

export interface SessionUser {
  id: string;
  nombre: string;
  rol: string;
  plan: string;
  correo?: string;
  fotoPerfil?: string | null;
}

export function saveSession(
  token: string,
  refreshTokenValue: string | null | undefined,
  user: SessionUser,
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshTokenValue) localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setPendingOnboarding(value: boolean): void {
  if (value) {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } else {
    localStorage.removeItem(ONBOARDING_KEY);
  }
}

export function getPendingOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function clearPendingOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function setPendingVerifyEmail(correo: string): void {
  sessionStorage.setItem(PENDING_VERIFY_EMAIL_KEY, correo);
}

export function getPendingVerifyEmail(): string {
  return sessionStorage.getItem(PENDING_VERIFY_EMAIL_KEY) ?? '';
}

export function clearPendingVerifyEmail(): void {
  sessionStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
}

export function updateSessionPlan(plan: string): void {
  const user = getUser();
  if (!user) return;
  const updated: SessionUser = { ...user, plan };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
}

export function updateSessionUser(patch: Partial<SessionUser>): SessionUser | null {
  const user = getUser();
  if (!user) return null;
  const updated: SessionUser = { ...user, ...patch };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
}
