import { getAccessToken, getRefreshToken, getUser, saveSession, clearSession, broadcastLogout } from './auth.ts';
import { API_ORIGIN, fotoSrc } from './security.ts';

// `import.meta.env` es una extensión de Vite que no existe al ejecutar el módulo
// bajo Node (pruebas). El acceso opcional evita lanzar en ese entorno y Vite
// sigue sustituyendo `import.meta.env` en build/serve.
const viteEnv = import.meta.env as { VITE_API_URL?: string; DEV?: boolean } | undefined;

export const API_BASE_URL = viteEnv?.VITE_API_URL ?? (viteEnv?.DEV ? '' : API_ORIGIN);

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

// Endpoints públicos: en ellos un 401 significa credenciales inválidas,
// no una sesión expirada, por lo que no deben forzar el cierre de sesión.
const RUTAS_PUBLICAS = [
  '/api/Auth/login-web',
  '/api/Auth/register',
  '/api/Auth/forgot-password',
  '/api/Auth/reset-password',
  '/api/Auth/2FA/enviar',
  '/api/Auth/2FA/verificar',
  '/api/Auth/refresh',
];

let refreshEnCurso: Promise<string | null> | null = null;

/**
 * Restaura la sesión al cargar la app: si hay refresh token en sessionStorage
 * pero no hay access token en memoria (p. ej. tras recargar la página), lo
 * renueva silenciosamente. Devuelve true si queda una sesión activa.
 * Se invoca desde main.tsx antes de renderizar el árbol de React.
 */
export async function restaurarSesion(): Promise<boolean> {
  if (getAccessToken()) return true;
  if (!getRefreshToken()) return false;
  const nuevo = await renovarToken();
  return Boolean(nuevo);
}

async function renovarToken(): Promise<string | null> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RefreshToken: refreshTokenValue }),
    });
    const body: { accessToken?: string; refreshToken?: string } | null = await res.json().catch(() => null);
    if (!res.ok || !body?.accessToken) return null;
    const user = getUser();
    saveSession(body.accessToken, body.refreshToken ?? refreshTokenValue, user ?? { id: '', nombre: '', rol: '', plan: '' });
    return body.accessToken;
  } catch {
    return null;
  }
}

function refrescarSiNecesario(): Promise<string | null> {
  if (!refreshEnCurso) {
    refreshEnCurso = renovarToken().finally(() => {
      refreshEnCurso = null;
    });
  }
  return refreshEnCurso;
}

// ── 401 auto-logout callback ──────────────────────────────
let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorizedHandler(handler: () => void): void {
  _onUnauthorized = handler;
}

function cerrarSesionExpirada(): void {
  clearSession();
  broadcastLogout();
  if (_onUnauthorized) {
    _onUnauthorized();
  } else if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?expirada=1');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const llamar = async (tok: string | null): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...options.headers,
      },
    });

  let res: Response;
  try {
    res = await llamar(token);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo.', 0);
  }

  const leerBody = async (r: Response): Promise<ApiErrorBody | null> => r.json().catch(() => null);
  let body = await leerBody(res);

  // Token vencido: intentar renovarlo una sola vez y reintentar la petición.
  if (res.status === 401 && token) {
    const esRutaPublica = RUTAS_PUBLICAS.some((r) => path.startsWith(r));
    const nuevoToken = await refrescarSiNecesario();

    if (nuevoToken) {
      try {
        res = await llamar(nuevoToken);
      } catch {
        throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo.', 0);
      }
      body = await leerBody(res);
      if (res.ok) return body as T;
      if (!esRutaPublica && res.status === 401) {
        cerrarSesionExpirada();
        throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
      }
    } else if (!esRutaPublica) {
      cerrarSesionExpirada();
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
  }

  if (!res.ok) {
    // Errores 5xx: mensaje genérico al usuario. Nunca se muestra el body del
    // backend en la UI para no filtrar detalles internos (stack traces,
    // mensajes de DB, rutas internas, etc.); se registra solo en consola.
    if (res.status >= 500) {
      if (body) console.warn('[api] error de servidor', res.status, body);
      throw new ApiError(`Error del servidor (${res.status})`, res.status);
    }
    const message = body?.message ?? body?.title ?? `Error de la solicitud (${res.status})`;
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
  requiresVerification?: boolean;
  userId?: string;
  correo?: string;
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

export function forgotPassword(payload: { Correo: string }): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>('/api/Auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ForgotPasswordResponse extends MessageResponse {
  requestId?: string;
  token?: string;
}

export function marcarResetAbierto(payload: { RequestId: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/reset-password/abrir', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getResetAbierto(requestId: string): Promise<{ abierto: boolean }> {
  return request<{ abierto: boolean }>(`/api/Auth/reset-password/estado?requestId=${encodeURIComponent(requestId)}`);
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

// ── Usuario Web / Perfil ────────────────────────────────

export interface MiPerfilResponse {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  fechaRegistro?: string;
  plan?: string;
  fotoPerfil?: string | null;
}

// Re-export de la utilidad de sanitización de imágenes (definida en security.ts)
// para no romper los imports existentes de los componentes.
export { fotoSrc };

export function getMiPerfil(): Promise<MiPerfilResponse> {
  return request<MiPerfilResponse>('/api/UsuariosWeb/mi-perfil');
}

export function actualizarPerfil(payload: {
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>('/api/UsuariosWeb/mi-perfil', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function cambiarCorreo(payload: { NuevoCorreo: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/UsuariosWeb/mi-perfil/correo', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function subirFoto(payload: { FotoBase64: string }): Promise<MessageResponse> {
  return request<MessageResponse>('/api/UsuariosWeb/mi-perfil/foto', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function eliminarFoto(): Promise<MessageResponse> {
  return request<MessageResponse>('/api/UsuariosWeb/mi-perfil/foto', {
    method: 'DELETE',
  });
}

export function cambiarPassword(payload: {
  PasswordActual: string;
  NuevaPassword: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>('/api/Auth/cambiar-password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function eliminarMiCuenta(): Promise<void> {
  return request<void>('/api/UsuariosWeb/mi-cuenta', {
    method: 'DELETE',
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
  foto?: string | null;
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
  telefono?: string;
  correo?: string;
  foto?: string | null;
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
  payload: { Nombre: string; Parentesco: string; Telefono: string; Correo: string },
): Promise<MessageResponse> {
  return request<MessageResponse>(`/api/Cuidadores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function eliminarCuidador(id: string): Promise<void> {
  return request<void>(`/api/Cuidadores/${id}`, { method: 'DELETE' });
}

// ── QR / Códigos de acceso ────────────────────────────────

export interface QrResponse {
  codigoAccesoQr: string;
  codigoExpira: string | null;
}

export function getQrPaciente(id: string): Promise<QrResponse> {
  return request<QrResponse>(`/api/Pacientes/${id}/qr`);
}

export function regenerarQrPaciente(id: string): Promise<QrResponse> {
  return request<QrResponse>(`/api/Pacientes/${id}/regenerar-qr`, { method: 'POST' });
}

export function getQrCuidador(id: string): Promise<QrResponse> {
  return request<QrResponse>(`/api/Cuidadores/${id}/qr`);
}

export function regenerarQrCuidador(id: string): Promise<QrResponse> {
  return request<QrResponse>(`/api/Cuidadores/${id}/regenerar-qr`, { method: 'POST' });
}

// ── Planes y Facturación ──────────────────────────────────

export interface PlanResponse {
  id: string;
  nombre: string;
  precio: number;
  precioMoneda: string;
  limitePacientes: number;
  limiteCuidadores: number;
  diasHistorial: number;
  gpsContinuo: boolean;
  aiConsole: boolean;
  descripcion: string;
}

export interface PagoResponse {
  id: string;
  monto: number;
  moneda: string;
  estado: string;
  fechaPago: string;
  metodoPago: string;
}

export interface SimularPagoResponse {
  PagoId?: string;
  Monto?: number;
  Moneda?: string;
  Estado?: string;
  message?: string;
}

export function getPlanes(): Promise<PlanResponse[]> {
  return request<PlanResponse[]>('/api/Planes');
}

export function getMiPlan(): Promise<PlanResponse> {
  return request<PlanResponse>('/api/UsuariosWeb/mi-plan');
}

export function simularPago(payload: { PlanNombre: string }): Promise<SimularPagoResponse> {
  return request<SimularPagoResponse>('/api/Pagos/simular-pago', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getHistorialPagos(): Promise<PagoResponse[]> {
  return request<PagoResponse[]>('/api/Pagos/historial');
}

// ── Reportes ─────────────────────────────────────────────

export interface LecturaResponse {
  id: string;
  pulsoBpm: number;
  temperaturaC: number;
  estresPct: number;
  probabilidadPico: number;
  pasos?: number | null;
  glucosaEstimadaMgDl?: number | null;
  timestamp: string;
}

export interface EventoResponse {
  id: string;
  nivelRiesgo: string;
  probabilidadMl: number;
  descripcion: string;
  fechaEvento: string;
  atendida: boolean;
}

export interface AlertaResponse {
  id: string;
  tipo: string;
  nivel: string;
  titulo: string;
  mensaje: string;
  atendida: boolean;
  fechaCreacion: string;
  fechaAtencion?: string | null;
}

export function getLecturasRango(
  pacienteId: string,
  desde: string,
  hasta: string,
): Promise<LecturaResponse[]> {
  const params = new URLSearchParams({ desde, hasta });
  return request<LecturaResponse[]>(`/api/Sensores/lecturas/${pacienteId}/rango?${params.toString()}`);
}

export function getEventos(pacienteId: string, limite = 500): Promise<EventoResponse[]> {
  return request<EventoResponse[]>(`/api/Sensores/eventos/${pacienteId}?limite=${limite}`);
}

export function getHistorialAlertas(pacienteId: string, limite = 500): Promise<AlertaResponse[]> {
  return request<AlertaResponse[]>(`/api/Reportes/historial-alertas/${pacienteId}?limite=${limite}`);
}

// ── Predicciones ML ──────────────────────────────────────

export interface PrediccionMlResponse {
  id: string;
  pacienteId: string;
  probabilidadPico: number;
  nivelRiesgo: string | null;
  casoClinico: string;
  imc: number;
  z: number;
  pPico: number;
  accionAutomatizada?: string;
  modeloVersion: string;
  fechaPrediccion: string;
}

export function getPredicciones(pacienteId: string): Promise<PrediccionMlResponse[]> {
  return request<PrediccionMlResponse[]>(`/api/Sensores/predicciones/${pacienteId}`);
}

export function getPrediccionActual(pacienteId: string): Promise<PrediccionMlResponse> {
  return request<PrediccionMlResponse>(`/api/Sensores/predicciones/${pacienteId}/actual`);
}

// ── Ubicación GPS ───────────────────────────────────────

export interface UbicacionGpsResponse {
  id?: string;
  pacienteId?: string;
  latitud: number;
  longitud: number;
  precision?: number | null;
  tipo?: 'emergencia' | 'continua' | string;
  timestamp: string;
}

export function getUbicacionActual(pacienteId: string): Promise<UbicacionGpsResponse> {
  return request<UbicacionGpsResponse>(`/api/Sensores/tracking/${pacienteId}/actual`);
}

export function getRutaUbicaciones(
  pacienteId: string,
  desde: string,
  hasta: string,
): Promise<UbicacionGpsResponse[]> {
  const params = new URLSearchParams({ desde, hasta });
  return request<UbicacionGpsResponse[]>(`/api/Sensores/tracking/${pacienteId}/ruta?${params.toString()}`);
}

// ── Notificaciones ───────────────────────────────────────

export interface NotificacionResponse {
  id: string;
  titulo: string;
  mensaje: string;
  tipo?: string;
  nivel?: string;
  leida: boolean;
  pacienteId?: string;
  fechaCreacion: string;
}

export function getNotificaciones(): Promise<NotificacionResponse[]> {
  return request<NotificacionResponse[]>('/api/Notificaciones');
}

export function getNotificacionesByPaciente(
  pacienteId: string,
): Promise<NotificacionResponse[]> {
  return request<NotificacionResponse[]>(`/api/Notificaciones/by-paciente/${pacienteId}`);
}

export function marcarNotificacionLeida(id: string): Promise<unknown> {
  return request<unknown>(`/api/Notificaciones/${id}/leer`, { method: 'PUT' });
}

export function eliminarNotificacion(id: string): Promise<void> {
  return request<void>(`/api/Notificaciones/${id}`, { method: 'DELETE' });
}
