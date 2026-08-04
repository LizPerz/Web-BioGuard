export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://bioguard-api-lkvnq.ondigitalocean.app';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiErrorBody {
  message?: string;
  title?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo.', 0);
  }

  const body: ApiErrorBody | null = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.message ?? body?.title ?? `Error del servidor (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  userId: string;
  nombre: string;
  rol: string;
  plan: string;
  requires2FA?: boolean;
  requiresVerification?: boolean;
  refreshToken?: string | null;
}

export interface LoginWebResponse {
  message?: string;
  requires2FA?: boolean;
  userId?: string;
  token?: string;
  nombre?: string;
  rol?: string;
  plan?: string;
  refreshToken?: string | null;
}

export interface RegisterResponse {
  message?: string;
  requiresVerification?: boolean;
  userId?: string;
  correo?: string;
  token?: string;
  nombre?: string;
  rol?: string;
  plan?: string;
  refreshToken?: string | null;
}

export interface Verify2FAResponse extends AuthResponse {
  message?: string;
}

export interface MessageResponse {
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export function registerWeb(payload: {
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno?: string;
  Correo: string;
  Password: string;
  PlanNombre: string;
}): Promise<RegisterResponse> {
  return request<RegisterResponse>('/api/Auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginWeb(payload: { Correo: string; Password: string }): Promise<LoginWebResponse> {
  return request<LoginWebResponse>('/api/Auth/login-web', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function enviar2FA(payload: { Correo: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/2FA/enviar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verificar2FA(payload: { Correo: string; Codigo: string }): Promise<Verify2FAResponse> {
  return request<Verify2FAResponse>('/api/Auth/2FA/verificar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(payload: { Correo: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: { Token: string; NuevaPassword: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function refreshToken(payload: { RefreshToken: string }): Promise<RefreshTokenResponse> {
  return request<RefreshTokenResponse>('/api/Auth/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(token: string): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
