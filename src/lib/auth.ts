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

/**
 * Access token en memoria del módulo: nunca se persiste en el navegador (ni
 * en disco, ni en el sync de cuentas, ni se comparte entre pestañas). Al
 * cargar la app se restaura con `restaurarSesion()` (src/lib/api.ts), que
 * renueva el access token vía /api/Auth/refresh si existe refresh token en
 * sessionStorage. Es el patrón recomendado por OWASP para SPAs cuando el
 * backend no soporta cookies httpOnly.
 */
let accessTokenMemoria: string | null = null;

// ── Multi-tab sync ─────────────────────────────────────────
const logoutChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('bioguard_auth')
  : null;

export function broadcastLogout(): void {
  logoutChannel?.postMessage({ type: 'logout' });
}

let _onLogoutFromOtherTab: (() => void) | null = null;

export function onLogoutFromOtherTab(callback: () => void): () => void {
  _onLogoutFromOtherTab = callback;
  return () => { _onLogoutFromOtherTab = null; };
}

if (logoutChannel) {
  logoutChannel.onmessage = (ev) => {
    if (ev.data?.type === 'logout') {
      _onLogoutFromOtherTab?.();
    }
  };
}

// ── Backward-compatible migration from localStorage ─────────

function migrateFromLocalStorage(): void {
  const oldToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const oldRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  const oldUser = localStorage.getItem(USER_KEY);

  if (oldToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, oldToken);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (oldRefresh) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, oldRefresh);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  if (oldUser) {
    sessionStorage.setItem(USER_KEY, oldUser);
    localStorage.removeItem(USER_KEY);
  }
}

migrateFromLocalStorage();

// ── Session API ─────────────────────────────────────────────

export function saveSession(
  token: string,
  refreshTokenValue: string | null | undefined,
  user: SessionUser,
): void {
  accessTokenMemoria = token;
  if (refreshTokenValue) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  return accessTokenMemoria;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  accessTokenMemoria = null;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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
  sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
}

export function updateSessionUser(patch: Partial<SessionUser>): SessionUser | null {
  const user = getUser();
  if (!user) return null;
  const updated: SessionUser = { ...user, ...patch };
  sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
}

// ── Centralized logout ─────────────────────────────────────

export async function performLogout(navigate: (to: string) => void): Promise<void> {
  const { logout } = await import('./api');
  const token = getAccessToken();
  if (token) {
    try { await logout(token); } catch { /* remote logout failed; local session still cleaned */ }
  }
  clearSession();
  broadcastLogout();
  navigate('/login');
}
