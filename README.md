# BioGuard - Plataforma de Bioseguridad

Sistema integral de monitoreo biométrico en tiempo real para pacientes con diabetes, con alertas inteligentes, predicción de picos glucémicos mediante Machine Learning y gestión de cuidadores.

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Características principales](#características-principales)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración local](#instalación-y-configuración-local)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución local](#ejecución-local)
- [Despliegue en producción](#despliegue-en-producción)
- [API REST - Endpoints](#api-rest---endpoints)
- [Sistema de pagos con Stripe](#sistema-de-pagos-con-stripe)
- [Envío de correos](#envío-de-correos)
- [Testing](#testing)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Equipo](#equipo)

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                    Cliente                       │
├──────────┬──────────────┬───────────────────────┤
│ Wearable │   App Móvil  │   Frontend Web (React)│
│ (sensor) │  (Android)   │   (Vite + TypeScript)  │
└────┬─────┴──────┬───────┴───────────┬───────────┘
     │            │                   │
     │  Bluetooth  │   REST + SignalR  │ REST + Proxy
     └─────┬──────┴──────────┬──────────┘
           │                  │
           ▼                  ▼
    ┌────────────────────────────────┐
    │      Backend - .NET 9 API       │
    │  (ASP.NET Core + MongoDB)       │
    │                                │
    │  Módulos:                      │
    │   • Autenticación y 2FA        │
    │   • Pacientes y Cuidadores     │
    │   • Sensores + SignalR         │
    │   • Alertas inteligentes        │
    │   • ML - Predicción de picos    │
    │   • Pagos (Stripe)             │
    │   • Notificaciones (FCM)       │
    │   • Correos (SMTP Gmail)       │
    └──────────┬─────────────────────┘
               │
               ▼
    ┌────────────────────┐
    │   MongoDB Atlas    │
    │  (Base de datos)   │
    └────────────────────┘
```

---

## Características principales

### Módulo 1 — Autenticación
- Registro con verificación de correo (código de 6 dígitos)
- Login con JWT + Refresh Tokens
- 2FA con reenvío de código por correo
- Login con Google (OAuth)
- Recuperación de contraseña por correo
- QR Login para cuidadores

### Módulo 2 — Facturación y Pagos
- Planes: Gratis, Familiar ($10 MXN), Pro ($20 MXN), Enterprise
- Integración con Stripe Checkout (modo test)
- Webhook firma-validada que activa el plan automáticamente
- Historial de pagos
- Plan Gratis se activa sin Stripe

### Módulo 3 — Pacientes y Cuidadores
- Gestión de pacientes (CRUD)
- Vinculación de cuidadores con código QR
- Perfil biométrico: edad, peso, estatura, antecedentes
- Límites por plan (pacientes y cuidadores)

### Módulo 4 — Monitoreo en tiempo real
- Lecturas de sensores (pulso, temperatura, sudoración GSR)
- Streaming en vivo con SignalR (WebSocket)
- Almacenamiento en MongoDB con TTL automático
- Tracking GPS del paciente

### Módulo 5 — Alertas
- Alertas inteligentes por anomalías detectadas
- Notificaciones push (Firebase Cloud Messaging)
- Niveles de severidad (bajo, medio, alto, crítico)
- Marcar como atendida

### Módulo 6 — Machine Learning
- Predicción de picos glucémicos
- Modelos versionados en BD
- Probabilidad calculada por lectura

### Módulo 7 — Usuarios Web y Planes
- Gestión de perfil de usuario
- Cambio de plan automático tras pago
- Refresco automático del plan en la UI
- Dashboard con resumen

---

## Estructura del repositorio

```
Web-BioGuard/
├── BioGuard.Api/                 # Backend - .NET 9 Web API
│   ├── Controllers/              # 14 controladores REST
│   ├── Services/                 # 13 servicios de lógica de negocio
│   ├── Models/                   # Modelos de MongoDB
│   ├── DTOs/                     # Data Transfer Objects
│   ├── Config/                   # Configuración de DI y BD
│   ├── Properties/               # launchSettings.json
│   ├── Dockerfile                # Imagen Docker multi-stage
│   └── BioGuard.Api.csproj       # Dependencias NuGet
├── FrontendWebBioGuard/          # Frontend - React + Vite
│   ├── src/
│   │   ├── components/           # UI reutilizable (layout, ui)
│   │   ├── context/              # AuthContext, ThemeContext
│   │   ├── services/             # Servicios API (auth, pago, plano)
│   │   ├── pages/                # Páginas (public/auth/app)
│   │   ├── types/                # Tipos TypeScript
│   │   ├── constants/            # Rutas y constantes
│   │   └── utils/                # httpClient, helpers
│   ├── vite.config.ts            # Proxy a backend local
│   └── package.json
├── .do/app.yaml                  # Configuración DigitalOcean
├── .github/workflows/            # CI/CD (GitHub Actions)
├── Test1BioGuard/                # Pruebas unitarias
├── docker-compose.yml            # Orquestación local
├── env.example                   # Template de variables
├── .dockerignore
└── .gitignore
```

---

## Requisitos previos

| Herramienta | Versión | Uso |
|---|---|---|
| .NET SDK | 9.0+ | Backend |
| Node.js | 20+ | Frontend |
| MongoDB | Atlas | Base de datos |
| Git | 2.40+ | Control de versiones |
| Stripe CLI (opcional) | 1.45+ | Webhooks locales en test |

---

## Instalación y configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/LizPerz/Web-BioGuard.git
cd Web-BioGuard
```

### 2. Backend (.NET 9)

```bash
cd BioGuard.Api

# Restaurar paquetes
dotnet restore

# Compilar
dotnet build

# Ejecutar
dotnet run --launch-profile http
```

El backend se levanta en `http://localhost:5057`.

### 3. Frontend (React + Vite)

```bash
cd FrontendWebBioGuard

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

El frontend se levanta en `http://localhost:5173` con proxy a `http://localhost:5057`.

---

## Variables de entorno

### Backend (`launchSettings.json` o user-secrets)

```json
{
  "ASPNETCORE_ENVIRONMENT": "Development",
  "MONGODB_CONNECTION_STRING": "mongodb+srv://...",
  "JWT_SECRET_KEY": "...",
  "SMTP_HOST": "smtp.gmail.com",
  "SMTP_PORT": "587",
  "SMTP_USER": "tucorreo@gmail.com",
  "SMTP_PASS": "tu-app-password-de-gmail",
  "STRIPE_SECRET_KEY": "sk_test_...",
  "STRIPE_WEBHOOK_SECRET": "whsec_...",
  "FRONTEND_URL": "http://localhost:5173"
}
```

> **Importante:** Nunca subas secretos reales a git. `launchSettings.json` tiene placeholders. Los valores reales van en `dotnet user-secrets`.

### Configurar user-secrets (local, fuera del repo)

```bash
cd BioGuard.Api
dotnet user-secrets init
dotnet user-secrets set "STRIPE_SECRET_KEY" "sk_test_..."
dotnet user-secrets set "STRIPE_WEBHOOK_SECRET" "whsec_..."
dotnet user-secrets set "SMTP_USER" "tucorreo@gmail.com"
dotnet user-secrets set "SMTP_PASS" "tu-app-password"
```

### Frontend (`FrontendWebBioGuard/.env`)

```env
VITE_API_URL=
```

Si está vacío, el frontend usa el proxy de Vite (recomendado para local). En producción, poner la URL de la API.

---

## Ejecución local

### Script de arranque rápido (PowerShell)

```powershell
# Terminal 1 - Backend
cd BioGuard.Api
dotnet run --launch-profile http

# Terminal 2 - Frontend
cd FrontendWebBioGuard
npm run dev

# Terminal 3 - Stripe CLI (opcional, para webhooks locales)
stripe listen --forward-to http://localhost:5057/api/Pagos/webhook/stripe --api-key sk_test_...
```

### Verificar que todo corre

| Servicio | URL | Resultado esperado |
|---|---|---|
| Backend | `http://localhost:5057/health` | `{"status":"healthy"}` |
| Frontend | `http://localhost:5173` | Página de inicio |
| API | `http://localhost:5057/api/Planes` | Lista de planes |
| Swagger | `http://localhost:5057/swagger` | Documentación interactiva |

---

## Despliegue en producción

### DigitalOcean App Platform

El deploy está automatizado con GitHub Actions:

1. **Push a `main`** construye la imagen Docker y la sube a GHCR
2. DigitalOcean App Platform **auto-redeploys** al detectar la nueva imagen
3. Configuración en `.do/app.yaml`:

```yaml
name: bioguard-api
region: nyc
services:
  - name: bioguard-api
    image:
      registry_type: GHCR
      registry: LizPerz
      repository: Backend-BioGuard
      digest: ${IMAGE_DIGEST}
    http_port: 8080
    health_check:
      http_path: /health
    envs:
      - key: STRIPE_SECRET_KEY
        value: ${STRIPE_SECRET_KEY}
        type: SECRET
      - key: STRIPE_WEBHOOK_SECRET
        value: ${STRIPE_WEBHOOK_SECRET}
        type: SECRET
      - key: FRONTEND_URL
        value: https://bioguard.app
```

### URLs de producción

| Servicio | URL |
|---|---|
| API | `https://bioguard-api-lkvnq.ondigitalocean.app` |
| Frontend | `https://bioguard.app` |
| Health | `https://bioguard-api-lkvnq.ondigitalocean.app/health` |
| Webhook Stripe | `https://bioguard-api-lkvnq.ondigitalocean.app/api/Pagos/webhook/stripe` |

---

## API REST - Endpoints

> Documentación interactiva en `http://localhost:5057/swagger`

### Autenticación (`/api/Auth`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/register` | Registro (envía código por correo) |
| POST | `/login-web` | Login web con JWT |
| POST | `/login-google` | Login con Google OAuth |
| POST | `/login-codigo` | Login cuidador por QR |
| POST | `/2FA/enviar` | Reenviar código 2FA por correo |
| POST | `/2FA/verificar` | Verificar código 2FA |
| POST | `/refresh` | Refrescar token JWT |
| POST | `/forgot-password` | Enviar enlace de reseteo por correo |
| POST | `/reset-password` | Restablecer contraseña |

### Pagos (`/api/Pagos`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/crear-sesion` | JWT | Crea sesión de Stripe Checkout |
| POST | `/webhook/stripe` | Anónimo | Recibe eventos de Stripe |
| GET | `/historial` | JWT | Lista pagos del usuario |
| GET | `/{id}/recibo` | JWT | Detalle de un pago |
| POST | `/cancelar` | JWT | Cancela suscripción |

### Usuarios Web (`/api/UsuariosWeb`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/mi-perfil` | Perfil completo + plan |
| PUT | `/mi-perfil` | Editar nombre/apellidos |
| PUT | `/mi-perfil/correo` | Cambiar correo |
| PUT | `/mi-perfil/foto` | Subir foto (base64) |
| GET | `/mi-plan` | Plan actual del usuario |
| PUT | `/cambiar-plan` | Cambiar de plan manualmente |
| DELETE | `/mi-cuenta` | Eliminar cuenta y datos |

### Pacientes (`/api/Pacientes`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista de pacientes |
| GET | `/{id}` | Detalle de paciente |
| POST | `/` | Crear paciente |
| PUT | `/{id}` | Editar paciente |
| DELETE | `/{id}` | Eliminar paciente |

### Cuidadores (`/api/Cuidadores`)

Vinculación por QR, gestión de permisos.

### Sensores (`/api/Sensores`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/lectura` | Recibe una lectura del sensor |
| GET | `/{pacienteId}/historial` | Historial de lecturas |
| GET | `/{pacienteId}/ultima` | Última lectura en tiempo real |

### SignalR (`/hubs/bioguard`)

Hub en tiempo real para streaming de lecturas y alertas.

### Dispositivos, Medicamentos, Alertas, Notificaciones, Reportes, ML, Auditoría

Cada módulo expone su propio CRUD + endpoints específicos (ver Swagger).

---

## Sistema de pagos con Stripe

### Flujo del pago

```
1. Usuario selecciona plan en /licenciamientos
2. Frontend llama POST /api/Pagos/crear-sesion
3. Backend crea Checkout Session en Stripe
4. Frontend redirige a checkout.stripe.com
5. Usuario paga (tarjeta test 4242 4242 4242 4242)
6. Stripe redirige a /pago/exito
7. Stripe envía webhook checkout.session.completed
8. Backend valida firma, marca pago completado, activa plan
9. Frontend refresca el plan automáticamente
```

### Planes disponibles

| Plan | Precio | stripe_price_id |
|---|---|---|
| Gratis | $0 MXN | Activación inmediata (sin Stripe) |
| Familiar | $10 MXN | `price_1TzsA8DnzjiGrcc8u8qfrS6V` |
| Pro | $20 MXN | `price_1TzsAHDnzjiGrcc8ai2JCDSV` |
| Enterprise | Desactivado | (oculto en UI) |

### Tarjeta de prueba

```
Número: 4242 4242 4242 4242
Fecha: cualquier fecha futura
CVC: cualquier 3 dígitos
```

### Webhook de Stripe

```
Endpoint: /api/Pagos/webhook/stripe
Evento:  checkout.session.completed
Secret:  STRIPE_WEBHOOK_SECRET (whsec_...)
```

Para pruebas locales, Stripe CLI reenvía el webhook:

```bash
stripe listen --forward-to http://localhost:5057/api/Pagos/webhook/stripe --api-key sk_test_...
```

---

## Envío de correos

El backend usa MailKit con SMTP de Gmail para enviar:

| Flujo | Endpoint | Qué envía |
|---|---|---|
| Registro | `/register` | Código de verificación (6 dígitos) |
| Reenviar 2FA | `/2FA/enviar` | Código de verificación |
| Olvidé contraseña | `/forgot-password` | Enlace de reseteo |

### Configuración SMTP

```json
{
  "SMTP_HOST": "smtp.gmail.com",
  "SMTP_PORT": "587",
  "SMTP_USER": "tucorreo@gmail.com",
  "SMTP_PASS": "app-password-de-gmail"
}
```

> Para generar app password en Gmail: habilitar 2FA → Security → App passwords → crear una.

Si SMTP no está configurado, el código/enlace se imprime en consola (modo de desarrollo).

---

## Testing

### Backend

```bash
cd Test1BioGuard
dotnet test
```

### Probar el flujo de pagos local

1. Inicia backend, frontend y Stripe CLI
2. Inicia sesión en `http://localhost:5173`
3. Ve a `/licenciamientos` → selecciona Pro
4. Clic en "Continuar al pago" → "Pagar y Activar Plan"
5. Paga con `4242 4242 4242 4242`
6. Verifica `/pago/exito` muestra el pago completado
7. El plan cambia a Pro en la barra lateral automáticamente

---

## Tecnologías utilizadas

### Backend
- .NET 9 / ASP.NET Core
- MongoDB.Driver (MongoDB Atlas)
- Stripe.net 52.2.0 (pagos)
- MailKit (correos)
- Microsoft.AspNetCore.SignalR (WebSocket)
- AspNetCoreRateLimit (rate limiting)
- Swashbuckle (Swagger)

### Frontend
- React 18 + TypeScript
- Vite 6 (bundler)
- React Router DOM (ruteo)
- Axios (HTTP)
- Zustand (estado)
- Recharts / Victory (gráficas)
- jsPDF + html2canvas (reportes PDF)
- CSS Modules (estilos)

### DevOps
- GitHub Actions (CI/CD)
- GitHub Container Registry (GHCR)
- Docker (Dockerfile multi-stage)
- DigitalOcean App Platform (deploy)

### Servicios externos
- MongoDB Atlas (base de datos)
- Stripe (pagos)
- Gmail SMTP (correos)
- Firebase Cloud Messaging (notificaciones push)

---

## Equipo

| Rol | Responsable |
|---|---|
| Backend | Marisol Villagón |
| Frontend | Liz Perz |
| Wearable/App móvil | Equipo Wearables-BioGuard |
| DevOps | Liz Perz |

---

## Licencia

Proyecto académico - UTTT (Universidad Tecnológica de Tlaxcala)