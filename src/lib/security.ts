/**
 * BioGuard · Capa de seguridad del frontend.
 *
 * Centraliza la política de seguridad de contenidos (CSP), las cabeceras HTTP
 * de seguridad y las utilidades de sanitización de la capa de presentación.
 * Debe permanecer libre de dependencias de terceros y sin efectos laterales.
 */

/** Host del API de BioGuard (backend) al que se conecta el SPA en producción. */
export const API_ORIGIN = 'https://bioguard-api-lkvnq.ondigitalocean.app';

/** Orígenes de mapas (Leaflet) permitidos por la CSP. */
export const MAP_ORIGIN = 'https://*.basemaps.cartocdn.com';

/** Google Fonts: CSS (style-src) y archivos de fuente (font-src). */
const FONTS_CSS_ORIGIN = 'https://fonts.googleapis.com';
const FONTS_FILES_ORIGIN = 'https://fonts.gstatic.com';

/**
 * Content Security Policy del SPA.
 * - default-src 'self': solo contenido del mismo origen por defecto.
 * - script-src 'self': sin scripts inline ni remote (bloquea XSS).
 * - style-src: React necesita atributos style inline; se permite el CSS de
 *   Google Fonts (la hoja importada en globals.css).
 * - img-src: permite data:/blob: (avatares) y los tiles de CARTO.
 * - font-src: fuentes locales (data:) y los archivos de Google Fonts.
 * - connect-src: solo el propio origen (proxy dev) y el API de producción.
 * - object-src 'none', frame-ancestors 'none': no se incrustan ni se deja
 *   incrustar el SPA.
 */
export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  `style-src 'self' 'unsafe-inline' ${FONTS_CSS_ORIGIN}`,
  `img-src 'self' data: blob: ${MAP_ORIGIN}`,
  `connect-src 'self' ${API_ORIGIN}`,
  `font-src 'self' data: ${FONTS_FILES_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Construye la CSP para el build, apuntando `connect-src` al origen real del
 * API (VITE_API_URL si está definida) en lugar del origen por defecto.
 * Permite que la CSP inyectada en el HTML siempre cubra el origen al que la
 * app se conecta realmente en cada despliegue.
 */
export function buildCsp(apiOrigin?: string): string {
  const origin = apiOrigin?.trim() || API_ORIGIN;
  if (origin === API_ORIGIN) return CSP_POLICY;
  // Solo se aceptan orígenes http(s); cualquier otra entrada inválida
  // mantiene la política por defecto en lugar de generar una CSP corrupta.
  if (!/^https?:\/\//i.test(origin)) return CSP_POLICY;
  return CSP_POLICY.replace(`connect-src 'self' ${API_ORIGIN}`, `connect-src 'self' ${origin}`);
}

/**
 * Cabeceras HTTP de seguridad recomendadas para el despliegue.
 * Deben enviarse por el hosting/CDN/proxy en producción y se aplican también
 * en el servidor de preview de Vite.
 * Se congela para que la política no pueda mutarse en tiempo de ejecución.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Security-Policy': CSP_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
});

/**
 * Patrón de un dato base64 crudo (formato que devuelve la API para las fotos).
 * Solo alfabeto base64 estándar o URL-safe; se excluyen caracteres peligrosos.
 */
const BASE64_RE = /^[A-Za-z0-9+/=_-]+$/;

/** Tipos de imagen raster permitidos en data URIs (se excluye SVG por XSS). */
const RASTER_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon);base64,/i;

/** Caracteres que indican inyección en el valor de un atributo HTML. */
const ATTR_INJECTION_RE = /["'<>\\]/;

/**
 * Devuelve una URL de imagen segura para un `<img src>`, o `undefined` si el
 * valor no es una imagen legítima.
 *
 * Se rechazan valores peligrosos como `javascript:`, `data:text/html`, SVG
 * con contenido ejecutable, etc., evitando vectores de XSS a través del
 * contenido de la foto de perfil.
 */
export function fotoSrc(foto?: string | null): string | undefined {
  if (!foto) return undefined;
  const recorte = foto.trim();
  if (recorte === '') return undefined;
  if (RASTER_IMAGE_RE.test(recorte)) return recorte;
  if (/^https?:\/\//i.test(recorte)) {
    return ATTR_INJECTION_RE.test(recorte) ? undefined : recorte;
  }
  if (BASE64_RE.test(recorte)) return `data:image/jpeg;base64,${recorte}`;
  return undefined;
}

/** Longitud mínima aceptada para una contraseña. */
export const PASSWORD_MIN_LENGTH = 8;

/** Reglas de complejidad de contraseña compartidas por los formularios. */
export const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  hasUpper: true,
  hasLower: true,
  hasNumber: true,
  hasSymbol: true,
  noSpaces: true,
} as const;

/** Verifica que una contraseña cumpla la política de complejidad. */
export function isStrongPassword(pass: string): boolean {
  return (
    pass.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(pass) &&
    /[a-z]/.test(pass) &&
    /[0-9]/.test(pass) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass) &&
    !/\s/.test(pass)
  );
}

/** Clave de almacenamiento para la sesión (evita duplicar el literal). */
export const STORAGE_KEYS = {
  accessToken: 'bioguard_access_token',
  refreshToken: 'bioguard_refresh_token',
  user: 'bioguard_user',
  onboarding: 'bioguard_pending_onboarding',
  pendingVerifyEmail: 'bioguard_pending_verify_email',
  resetRequest: 'bioguard_reset_request',
  theme: 'bioguard_theme',
} as const;
