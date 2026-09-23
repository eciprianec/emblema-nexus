# =============================================================================
# EMBLEMA NEXUS — Dockerfile de Producción Multi-Stage
# Next.js 16 (Standalone) + React 19 en Node.js 20 Alpine
# =============================================================================

# -----------------------------------------------------------------------------
# Etapa 1: Dependencias (deps)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
# libc6-compat requerida para compatibilidad con librerías nativas en Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar manifiestos de paquetes para aprovechar la caché de capas Docker
COPY package.json package-lock.json ./

# Instalar dependencias exactas y limpias de producción/desarrollo para compilación
RUN npm ci

# -----------------------------------------------------------------------------
# Etapa 2: Compilación (builder)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Reutilizar node_modules instalados en la etapa deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría de Next.js durante la compilación
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variables de entorno por defecto requeridas en tiempo de compilación estática
ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-build-key
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_NAME="Emblema Nexus"

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Compilar proyecto Next.js generando salida standalone en .next/standalone
RUN npm run build

# -----------------------------------------------------------------------------
# Etapa 3: Ejecución en Producción (runner)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Endurecimiento de seguridad: Crear usuario y grupo de sistema sin privilegios de root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar carpeta pública y artefactos estáticos generados
COPY --from=builder /app/public ./public

# Copiar artefacto standalone empaquetado por Next.js con permisos de usuario no-root
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Asignar usuario sin privilegios
USER nextjs

# Exponer el puerto de la aplicación Next.js
EXPOSE 3000

# Comprobación de salud continua del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Iniciar servidor standalone con Node.js
CMD ["node", "server.js"]
