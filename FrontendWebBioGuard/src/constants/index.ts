export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const ROUTES = {
  HOME: '/',
  LICENCIAMIENTOS: '/licenciamientos',
  LOGIN: '/login',
  REGISTRO: '/registro',
  CONFIRMAR_CORREO: '/confirmar-correo',
  OLVIDE_CONTRASENA: '/olvide-contrasena',
  REESTABLECER_CONTRASENA: '/reestablecer-contrasena',
  CHECKOUT: '/checkout',
  CONFIGURACION_COMPLETADA: '/configuracion-completada',
  PAGO_EXITO: '/pago/exito',
  PAGO_CANCELADO: '/pago/cancelado',
  DASHBOARD: '/dashboard',
  SALUD: '/salud',
  SEGURIDAD: '/seguridad',
  FACTURACION: '/facturacion',
  AJUSTES: '/ajustes',
} as const;

export const TOKEN_KEY = 'bioguard_token';
export const REFRESH_TOKEN_KEY = 'bioguard_refresh_token';
export const USER_KEY = 'bioguard_user';

export const PLAN_FEATURES: Record<string, string[]> = {
  Gratis: [
    '1 paciente monitoreado',
    '1 cuidador autorizado',
    'Historial de 7 días',
    'Alertas básicas',
    'Notificaciones push',
  ],
  Familiar: [
    '1 paciente monitoreado',
    '3 cuidadores autorizados',
    'Historial de 30 días',
    'GPS continuo',
    'Alertas avanzadas',
    'Notificaciones push',
    'Soporte prioritario',
  ],
  Pro: [
    '1 paciente monitoreado',
    '5 cuidadores autorizados',
    'Historial de 90 días',
    'GPS continuo',
    'Consola IA avanzada',
    'Predicciones metabólicas',
    'Reportes descargables',
    'Alertas inteligentes',
    'Notificaciones push',
    'Soporte 24/7',
  ],
};

export const PERIOD_LABELS: Record<string, string> = {
  mensual: '/mes',
  anual: '/año',
};

export const ANNUAL_DISCOUNT = 0.15; // 15% off for annual billing
