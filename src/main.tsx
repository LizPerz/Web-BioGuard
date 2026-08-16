import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { initTheme } from './lib/theme'
import { ThemeProvider } from './lib/theme-provider'
import { restaurarSesion } from './lib/api'
import App from './App'

initTheme()

// Restaura la sesión (renueva el access token con el refresh de sessionStorage)
// antes de renderizar, para que las rutas protegidas no redirijan a /login en
// cada recarga. La sesión vive solo en memoria y en la pestaña actual.
async function boot() {
  await restaurarSesion()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

void boot()
