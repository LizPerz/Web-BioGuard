import { defineConfig, type Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { API_ORIGIN, SECURITY_HEADERS, buildCsp } from './src/lib/security.ts'

/**
 * Aplica las cabeceras HTTP de seguridad en el servidor de preview
 * (`vite preview`), es decir, cuando se sirve el build de producción
 * localmente. Para el entorno desplegado, el hosting/CDN/proxy debe enviarlas.
 */
function securityHeadersPlugin(): Plugin {
  return {
    name: 'bioguard-security-headers',
    apply: 'serve',
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(name, value)
        }
        next()
      })
    },
  }
}

/**
 * Inyecta la meta-tag de Content Security Policy únicamente en el HTML de
 * producción (`vite build`). En desarrollo Vite necesita scripts inline para
 * HMR/React Refresh, por lo que no se aplica la CSP estricta.
 * El origen de `connect-src` se deriva de VITE_API_URL (si está definida en el
 * entorno del build) para que la CSP siempre cubra el API real desplegado.
 */
function cspMetaPlugin(apiOrigin: string | undefined): Plugin {
  return {
    name: 'bioguard-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: buildCsp(apiOrigin),
          },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = (env.VITE_API_URL as string | undefined) || undefined

  return {
    plugins: [react(), securityHeadersPlugin(), cspMetaPlugin(apiOrigin)],
    build: {
      // Nunca publicar sourcemaps en producción (evita exponer el código fuente).
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': {
          target: API_ORIGIN,
          changeOrigin: true,
        },
      },
    },
  }
})
