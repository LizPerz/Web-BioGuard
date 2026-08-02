/* ============================================
   BioGuard TypeScript Types
   Generados desde los DTOs del backend .NET 9
   ============================================ */

// ── Auth ──
export interface RegisterWebRequest {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo: string;
  password: string;
  planNombre: string;
}

export interface LoginWebRequest {
  correo: string;
  password: string;
}

export interface LoginGoogleRequest {
  idToken: string;
}

export interface LoginCodigoRequest {
  codigoAcceso: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  nombre: string;
  rol: string;
  plan: string;
  requires2FA?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Enviar2FARequest {
  correo: string;
}

export interface Verificar2FARequest {
  correo: string;
  codigo: string;
}

export interface ForgotPasswordRequest {
  correo: string;
}

export interface ResetPasswordRequest {
  token: string;
  nuevaPassword: string;
}

export interface CambiarPasswordRequest {
  passwordActual: string;
  nuevaPassword: string;
}

export interface MessageResponse {
  message: string;
}

// ── Plan ──
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

// ── Paciente ──
export interface PacienteResponse {
  id: string;
  nombre: string;
  esDiabetico: boolean;
  perfilCompletado: boolean;
  codigoAccesoQr: string;
  CodigoAccesoQr?: string;
  CodigoAccesoQR?: string;
}

export interface CrearPacienteRequest {
  nombre: string;
}

export interface UpdateBiometriaRequest {
  edad: number;
  pesoKg: number;
  estaturaCm: number;
  esDiabetico: boolean;
  familiaresDiabetes: boolean;
  actividadFisica: string;
}

export interface UpdateNombreRequest {
  nombre: string;
}

// ── Cuidador ──
export interface CuidadorResponse {
  id: string;
  nombre: string;
  parentesco: string;
  pacienteId: string;
  codigoAccesoQr: string;
}

export interface CrearCuidadorRequest {
  pacienteId: string;
  nombre: string;
  parentesco: string;
  telefono: string;
  correo: string;
}

export interface ActualizarCuidadorRequest {
  nombre: string;
  parentesco: string;
}

// ── Sensor ──
export interface LecturaSensorRequest {
  pulsoBpm: number;
  temperaturaC: number;
  sudoracionGsr: number;
}

export interface LecturaSensorResponse {
  id: string;
  pulsoBpm: number;
  temperaturaC: number;
  sudoracionGsr: number;
  probabilidadPico: number;
  timestamp: string;
}

export interface EstadisticasResponse {
  ultimoPulso: number;
  ultimaTemperatura: number;
  ultimaSudoracion: number;
  promedioPulso: number;
  promedioTemperatura: number;
  estadoActual: string;
  totalLecturas: number;
}

export interface TendenciaItem {
  timestamp: string;
  pulsoBpm: number;
  temperaturaC: number;
  probabilidadPico: number;
}

export interface EventoMetabolicoResponse {
  id: string;
  nivelRiesgo: string;
  probabilidadMl: number;
  descripcion: string;
  fechaEvento: string;
  atendida: boolean;
}

export interface TrackingGpsRequest {
  longitud: number;
  latitud: number;
  esEmergencia: boolean;
}

export interface TrackingResponse {
  longitud: number;
  latitud: number;
  timestamp: string;
  esEmergencia: boolean;
}

// ── Medicamento ──
export interface MedicamentoResponse {
  id: string;
  pacienteId: string;
  nombre: string;
  dosis: string;
  horario: string;
  notas?: string;
  activo: boolean;
  fechaCreacion: string;
  ultimaToma?: string;
}

export interface CrearMedicamentoRequest {
  pacienteId: string;
  nombre: string;
  dosis: string;
  horario: string;
  notas?: string;
}

export interface ActualizarMedicamentoRequest {
  nombre: string;
  dosis: string;
  horario: string;
  notas?: string;
}

// ── Alerta ──
export interface AlertaResponse {
  id: string;
  pacienteId: string;
  tipo: string;
  nivel: string;
  titulo: string;
  mensaje: string;
  atendida: boolean;
  fechaCreacion: string;
  fechaAtencion?: string;
}

export interface CrearAlertaRequest {
  pacienteId: string;
  tipo: string;
  nivel: string;
  titulo: string;
  mensaje: string;
  pulsoBpm?: number;
  temperaturaC?: number;
  sudoracionGsr?: number;
  probabilidadPico?: number;
}

// ── Notificacion ──
export interface NotificacionResponse {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaEnvio: string;
}

// ── Pago ──
export interface CrearSesionPagoRequest {
  planNombre: string;
}

export interface PagoResponse {
  id: string;
  monto: number;
  moneda: string;
  estado: string;
  fechaPago: string;
  metodoPago: string;
}

export interface CrearSesionPagoResponse {
  pagoId: string;
  checkoutUrl?: string;
  monto: number;
  moneda: string;
  message: string;
}

export interface ReciboResponse {
  pagoId: string;
  monto: number;
  moneda: string;
  estado: string;
  fechaPago: string;
  descargaUrl: string;
}

// ── ML ──
export interface PrediccionResponse {
  id: string;
  probabilidad: number;
  nivelRiesgo: string;
  recomendacion: string;
  fechaPrediccion: string;
}

export interface ModeloMlResponse {
  id: string;
  nombre: string;
  tipo: string;
  accuracy: number;
  activo: boolean;
  fechaEntrenamiento: string;
}

// ── Reporte ──
export interface ReporteResumenResponse {
  totalLecturas: number;
  totalEventos: number;
  totalAlertas: number;
  totalMedicamentos: number;
  eventosCriticos: number;
  alertasPendientes: number;
  promedioPulso: number;
  ultimaLectura?: string;
}

export interface ReporteAlertaResponse {
  id: string;
  tipo: string;
  nivel: string;
  titulo: string;
  mensaje: string;
  atendida: boolean;
  fechaCreacion: string;
  fechaAtencion?: string;
}

export interface ReporteEventoResponse {
  id: string;
  nivelRiesgo: string;
  probabilidadMl: number;
  descripcion: string;
  fechaEvento: string;
  atendida: boolean;
}

export interface ReporteMedicamentoResponse {
  id: string;
  nombre: string;
  dosis: string;
  horario: string;
  activo: boolean;
  ultimaToma?: string;
}

// ── Usuario Web ──
export interface UsuarioPerfilResponse {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  fechaRegistro: string;
  plan: string;
  fotoPerfil?: string;
}

export interface UpdatePerfilRequest {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
}

export interface CambiarCorreoRequest {
  nuevoCorreo: string;
}

export interface CambiarPlanRequest {
  planNombre: string;
}

// ── Dispositivo ──
export interface VincularDispositivoRequest {
  nombre: string;
  macAddress: string;
}

export interface DispositivoResponse {
  vinculado: boolean;
  nombreDispositivo?: string;
  macAddress?: string;
  conectado?: boolean;
  fechaVinculacion?: string;
}

// ── Auditoria ──
export interface AuditoriaResponse {
  id: string;
  accion: string;
  tablaAfectada: string;
  registroId: string;
  fecha: string;
  ip: string;
}

// ── Generic API ──
export interface ApiError {
  message: string;
  status?: number;
}

export type BillingPeriod = 'mensual' | 'anual';
