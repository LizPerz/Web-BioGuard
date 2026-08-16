# React + TypeScript + Vite

Frontend del proyecto BioGuard. Aplicación React 19 + TypeScript + Vite con
pipeline DevSecOps integrado.

## Comandos

```bash
npm install          # instala dependencias
npm run dev          # entorno de desarrollo
npm run build        # build de producción
npm run preview      # sirve el build con cabeceras de seguridad aplicadas
npm run lint         # Oxlint
npm run typecheck    # tsc -b
npm run test         # pruebas unitarias (node:test)
npm run security:all # lint + typecheck + test + audit + SAST + secretos
```

## Seguridad

Consulta [`SECURITY.md`](SECURITY.md) para la postura de seguridad completa:
CSP, cabeceras HTTP, SAST (Semgrep), escaneo de secretos (Gitleaks), CodeQL,
Dependabot y cómo ejecutarlo localmente.

- Los endpoints del API se usan a través del proxy `/api` de Vite (configurado
  en `vite.config.ts`).
- La configuración de entorno se documenta en `.env.example`.

## Despliegue (DigitalOcean App Platform)

El repositorio incluye `Dockerfile` + `nginx.conf` (sirve el build con las
cabeceras de seguridad) y la especificación `digitalocean-app.yaml`. Sigue los
pasos documentados en ese spec y en [`SECURITY.md`](SECURITY.md).

## Stack

- React 19 + TypeScript
- [Vite](https://vite.dev/) (con `@vitejs/plugin-react`)
- [Oxlint](https://oxc.rs) para lint
- [React Router](https://reactrouter.com), [Leaflet](https://leafletjs.com) para mapas

## Seguridad del flujo de sesión

La sesión no se persiste en `localStorage`: el access token vive solo en
memoria y el refresh token en `sessionStorage` (alcance de la pestaña). Al
recargar la página, `restaurarSesion()` renueva el access token vía el API. Si
el refresh token es inválido o caducó, la app redirige al login.
