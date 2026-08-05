import { getAccessToken } from './auth';

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
  const token = getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── Pacientes ─────────────────────────────────────────────

export interface PacienteResponse {
  id: string;
  nombre: string;
  esDiabetico?: boolean;
  perfilCompletado?: boolean;
  fechaNacimiento?: string | null;
  edad?: number;
  pesoKg?: number;
  estaturaCm?: number;
  sexo?: string | null;
  familiaresDiabetes?: boolean;
  actividadFisica?: string | null;
  codigoAccesoQr?: string | null;
}

export interface CrearPacientePayload {
  Nombre: string;
  Edad?: number;
  PesoKg?: number;
  EstaturaCm?: number;
  EsDiabetico?: boolean;
}

export interface CrearPacienteResponse {
  pacienteId?: string;
  message?: string;
  codigoAccesoQr?: string | null;
  codigoExpira?: string | null;
}

export function getMiPaciente(): Promise<PacienteResponse | null> {
  return request<PacienteResponse>('/api/Pacientes/mi-paciente').catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}

export function createPaciente(payload: CrearPacientePayload): Promise<CrearPacienteResponse> {
  return request<CrearPacienteResponse>('/api/Pacientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function actualizarPaciente(id: string, payload: { Nombre: string }): Promise<MessageResponse> {
  return request<MessageResponse>(`/api/Pacientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function actualizarBiometriaPaciente(
  id: string,
  payload: {
    Edad?: number;
    PesoKg?: number;
    EstaturaCm?: number;
    EsDiabetico?: boolean;
  },
): Promise<MessageResponse> {
  return request<MessageResponse>(`/api/Pacientes/${id}/biometria`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function eliminarPaciente(id: string): Promise<void> {
  return request<void>(`/api/Pacientes/${id}`, { method: 'DELETE' });
}

// ── Cuidadores ────────────────────────────────────────────

export interface CuidadorResponse {
  id: string;
  nombre: string;
  parentesco: string;
  pacienteId?: string;
}

export interface CrearCuidadorPayload {
  PacienteId: string;
  Nombre: string;
  Parentesco: string;
  Telefono?: string;
  Correo?: string;
}

export function getCuidadores(): Promise<CuidadorResponse[]> {
  return request<CuidadorResponse[]>('/api/Cuidadores');
}

export function crearCuidador(payload: CrearCuidadorPayload): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Cuidadores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function actualizarCuidador(
  id: string,
  payload: { Nombre: string; Parentesco: string },
): Promise<MessageResponse> {
  return request<MessageResponse>(`/api/Cuidadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function eliminarCuidador(id: string): Promise<void> {
  return request<void>(`/api/Cuidadores/${id}`, { method: 'DELETE' });
}
