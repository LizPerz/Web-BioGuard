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

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
