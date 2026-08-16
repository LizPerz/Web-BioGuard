# Seguridad · BioGuard Frontend

Este documento describe la postura de seguridad del proyecto y el pipeline
DevSecOps implementado.

## Resumen de controles

| Categoría | Herramienta | Dónde se ejecuta |
| --- | --- | --- |
| SAST (análisis estático) | Semgrep (reglas propias en `.semgrep/rules/` + registros oficiales `p/javascript`, `p/react`, `p/owasp-top-ten`) | CI + local |
| Escaneo de secretos | Gitleaks (`gitleaks.toml`) | CI + local + pre-commit |
| SCA (dependencias) | `npm audit` | CI + local |
| Licencias | `scripts/license-check.mjs` | CI + local |
| SBOM | `npm sbom` (CycloneDX) | CI (artefacto) |
| Contenedor | Trivy (imagen, HIGH/CRITICAL) | CI |
| IaC | Checkov (Dockerfile/App Spec) | CI |
| CodeQL | GitHub CodeQL (`security-extended`) | CI |
| Lint | Oxlint | CI + local + pre-commit |
| Typecheck | `tsc -b` | CI + local |
| Pruebas de seguridad | `node --test` (sin dependencias) | CI + local |
| Actualización de dependencias | Dependabot | GitHub |

## Ejecutar las pruebas localmente

```bash
npm run lint            # Oxlint
npm run typecheck       # TypeScript
npm run test            # pruebas unitarias (node:test)
npm run security:audit  # npm audit --audit-level=high
npm run security:sast   # Semgrep (si está instalado)
npm run security:secrets# Gitleaks (si está instalado)
npm run security:licenses# revisión de licencias de dependencias
npm run security        # audit + sast + secrets + licenses
npm run security:all    # lint + typecheck + test + security
```

Los scripts `security:sast` y `security:secrets` detectan la herramienta en el
sistema. Si no está instalada avisan y no bloquean en local; en CI (`CI=true`)
fallan, porque el pipeline real usa las acciones nativas de GitHub.

## Hooks locales (Lefthook)

`lefthook.yml` instala un hook de **pre-commit** (`npm run prepare`) que ejecuta
en paralelo:

- `node scripts/pre-commit-secrets.mjs`: Gitleaks sobre los ficheros staged
  (`--redact`). Si `gitleaks` no está en el `PATH`, avisa y continúa (el CI lo
  garantiza).
- `npx oxlint {staged_files}`: lint de los ficheros staged.

El hook de commit se puede probar sin commitear con `npx lefthook run pre-commit`.

## Pipeline CI/CD (GitHub Actions)

- **`.github/workflows/devsecops.yml`**
  - `quality`: `npm ci` → lint → typecheck → tests → build → licencias.
  - `sast`: Semgrep con las reglas de `.semgrep/rules` (bloqueantes) y los
    registros oficiales `p/javascript`, `p/react` y `p/owasp-top-ten` (con
    `continue-on-error`), subiendo SARIF a Code Scanning.
  - `secrets`: Gitleaks (gitleaks-action) sobre el historial completo.
  - `deps`: `npm audit --audit-level=high` + SBOM (`npm sbom`, artefacto
    CycloneDX).
  - `trivy`: escaneo de la imagen del contenedor (HIGH/CRITICAL, SARIF).
  - `iac`: Checkov sobre `Dockerfile` y `digitalocean-app.yaml` (SARIF,
    `soft_fail`).
  - Trigger: push/PR a `main`, programado semanalmente.
- **`.github/workflows/codeql.yml`**: análisis CodeQL de JavaScript/TypeScript.
- **`.github/dependabot.yml`**: PRs automáticos de actualización de dependencias
  (npm y GitHub Actions).

Ninguna rama que no pase estas comprobaciones debería fusionarse a `main`.

## Endurecimiento de la aplicación

### Content Security Policy (CSP)

La CSP se inyecta en el HTML de **producción** (`vite build`) mediante el plugin
`bioguard-csp-meta` (ver `vite.config.ts`). En desarrollo no se aplica porque
Vite necesita scripts inline para HMR/React Refresh.

Directivas clave:

- `script-src 'self'`: sin scripts inline ni remotos → mitiga XSS.
- `object-src 'none'` y `frame-ancestors 'none'`: no se incrustan plugins ni se
  deja incrustar la app.
- `connect-src 'self' https://bioguard-api-lkvnq.ondigitalocean.app`: solo el API
  real.
- `img-src 'self' data: blob: https://*.basemaps.cartocdn.com`: avatares (data
  URIs) y mapas.

Definición centralizada en `src/lib/security.ts` (`CSP_POLICY`). En el build, el
origen de `connect-src` se deriva de `VITE_API_URL` si está definida (función
`buildCsp`), de modo que la CSP siempre cubre el API al que la app se conecta
realmente en cada despliegue.

### Cabeceras HTTP de seguridad

`SECURITY_HEADERS` en `src/lib/security.ts`:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

Se aplican automáticamente en `vite preview` (plugin `bioguard-security-headers`).

**En producción (DigitalOcean App Platform)** las aplica nginx: el repositorio
incluye `Dockerfile` + `nginx.conf` y la especificación `digitalocean-app.yaml`.
DigitalOcean no permite cabeceras personalizadas en sitios estáticos, por lo que
el frontend se sirve como *web service* con nginx (build multi-stage). El
contenedor corre como usuario **no root** (`nginxinc/nginx-unprivileged`, puerto
`8080`) y nginx valida la configuración en el `ENTRYPOINT` antes de arrancar. La
CSP además viaja incrustada como meta-tag en el HTML (`vite build`), por lo que
aplica en cualquier hosting aunque ignore cabeceras; `frame-ancestors` no aplica
vía meta, así que `X-Frame-Options: DENY` (nginx) cubre el anti-framing.

El build **nunca genera sourcemaps** (`build.sourcemap: false`), evitando
exponer el código fuente en producción.

### Token de reseteo de contraseña

El token de reseteo viaja por el **estado del router** en el flujo de escritorio
(`ForgotPassword` → `ResetPassword`), nunca en la URL. Cuando la página se abre
directo desde el enlace del correo (que sí contiene el token en la URL por
diseño del backend), `ResetPassword` **elimina token y requestId de la URL**
(`history.replaceState`) en cuanto los lee, para no dejarlos en el historial del
navegador, sincronización ni logs de servidores/proxies.

### Rutas protegidas

`ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) redirige a `/login`
cualquier ruta autenticada (`/dashboard`, `/health`, `/pacientes`, `/ubicacion`,
`/billing`, `/planes`, `/settings`) sin sesión activa.

### Sanitización de imágenes

`fotoSrc` (`src/lib/security.ts`, re-exportada desde `src/lib/api.ts`) acepta
únicamente:

- `data:` URIs de **imágenes raster** (`png/jpg/jpeg/gif/webp/avif/bmp/x-icon`)
  con formato `;base64,`.
- URLs `http(s)`.
- Base64 crudo (formato heredado del API), envuelto como
  `data:image/jpeg;base64,...`.

Rechaza `javascript:`, `data:text/html`, SVG con contenido ejecutable, etc.,
evitando vectores de XSS vía la foto de perfil.

## Decisiones de arquitectura conocidas

- **Tokens en `localStorage`**: el backend no soporta cookies `httpOnly`, por lo
  que el SPA almacena access/refresh tokens en `localStorage` vía
  `src/lib/auth.ts`. Este patrón es vulnerable a XSS, por lo que está mitigado
  con CSP estricta y sanitización de entrada. Migración recomendada: cookies
  `httpOnly` + `SameSite`, o almacenamiento en memoria + refresh rota.
- **Reglas SAST propias**: las reglas de `.semgrep/rules` son un conjunto mínimo
  adaptado a React/TS; se pueden ampliar en cada revisión.
- **`Math.random()`** se usa únicamente en el simulador biométrico (datos
  ficticios), nunca para generación de tokens o códigos.
- **Datos de demostración anónimos**: `mockData.ts` usa un usuario genérico
  (`Usuario de demostración` / `demo@bioguard.app`); no se incluye información
  personal real en el bundle de producción.

## Reportar una vulnerabilidad

No abras issues públicos para vulnerabilidades de seguridad. Escribe a los
mantenedores del repositorio describiendo el hallazgo de forma privada, con:

1. Componente y versión afectados.
2. Descripción del impacto y pasos para reproducir.
3. Severidad estimada y, si es posible, una corrección propuesta.

## Resumen de archivos de seguridad

| Archivo | Propósito |
| --- | --- |
| `.semgrep/rules/*.yml` | Reglas SAST personalizadas |
| `.semgrepignore` | Exclusiones del escaneo Semgrep |
| `gitleaks.toml` | Configuración de escaneo de secretos |
| `lefthook.yml` | Hooks de pre-commit (Gitleaks + Oxlint) |
| `scripts/security-sast.mjs` | Ejecutor local de Semgrep |
| `scripts/security-secrets.mjs` | Ejecutor local de Gitleaks |
| `scripts/pre-commit-secrets.mjs` | Gitleaks en el hook de pre-commit |
| `scripts/license-check.mjs` | Política de licencias de dependencias |
| `src/lib/security.ts` | CSP, cabeceras, `buildCsp` y utilidades de sanitización |
| `src/components/auth/ProtectedRoute.tsx` | Barrera de autenticación |
| `src/pages/ForgotPassword/…` / `ResetPassword/…` | Token de reseteo por estado, no por URL |
| `Dockerfile` + `nginx.conf` | Despliegue DO App Platform (no root, puerto 8080) |
| `digitalocean-app.yaml` | Spec de App Platform (web service + nginx) |
| `.dockerignore` | Exclusiones del build de contenedor |
| `.github/workflows/devsecops.yml` | Pipeline DevSecOps principal (quality/sast/secrets/deps/trivy/iac) |
| `.github/workflows/codeql.yml` | CodeQL |
| `.github/dependabot.yml` | Actualizaciones de dependencias |
| `.env.example` | Variables de entorno documentadas |
| `src/test/*.test.ts` | Pruebas unitarias de seguridad |
