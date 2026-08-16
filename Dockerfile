# BioGuard · Frontend
# Multi-stage: se compila el SPA con Node y se sirve con nginx, que aplica las
# cabeceras de seguridad (DigitalOcean App Platform no permite cabeceras
# personalizadas en los sitios estáticos; por eso se sirve como web service).

# ── Etapa 1: build ─────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Si el API desplegado difiere del por defecto, define VITE_API_URL aquí:
#   ARG VITE_API_URL
#   ENV VITE_API_URL=$VITE_API_URL
# y configura el "build arg" en la app de DigitalOcean.

RUN npm run build

# ── Etapa 2: servidor web (nginx no-root + cabeceras de seguridad) ─────────
# nginx-unprivileged ejecuta el master y los workers como el usuario "nginx"
# (no root): si un atacante compromete el proceso, no gana privilegios en el
# contenedor. Escucha en el puerto 8080 (los puertos bajos requieren root).
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Checkov CKV_DOCKER_3: declara explícitamente el usuario no-root. La imagen
# nginx-unprivileged ya define el usuario "nginx"; se confirma con USER.
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
