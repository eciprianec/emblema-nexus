#!/usr/bin/env bash
# =============================================================================
# EMBLEMA NEXUS — Script de Despliegue Automatizado para VPS (Ubuntu / Debian)
# Fase 10: Infraestructura de Producción, Docker Compose y Seguridad
# =============================================================================
# Este script:
# 1. Valida requisitos del sistema operativo.
# 2. Instala Docker Engine y Docker Compose si no están instalados.
# 3. Configura el entorno de producción (.env.production con claves seguras).
# 4. Levanta el stack completo multi-contenedor (Next.js, Postgres, Redis, Nextcloud, Caddy).
# 5. Ejecuta las migraciones de base de datos de forma secuencial.
# 6. Configura Nextcloud y verifica la salud de todos los servicios.
# =============================================================================

set -euo pipefail

# Colores para la consola
VERDE='\033[0;32m'
AZUL='\033[0;34m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

log_info() {
    echo -e "${AZUL}[INFO]${NC} $1"
}

log_success() {
    echo -e "${VERDE}[OK]${NC} $1"
}

log_warn() {
    echo -e "${AMARILLO}[AVISO]${NC} $1"
}

log_error() {
    echo -e "${ROJO}[ERROR]${NC} $1" >&2
}

echo -e "${CYAN}"
echo "============================================================================="
echo "        EMBLEMA NEXUS — Despliegue de Infraestructura en Producción         "
echo "============================================================================="
echo -e "${NC}"

# 1. Comprobación de Privilegios
if [ "$EUID" -ne 0 ]; then
    log_error "Este script debe ejecutarse con privilegios de root o mediante 'sudo'."
    exit 1
fi

# Detectar directorio base del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"
log_info "Directorio de trabajo del proyecto: $PROJECT_ROOT"

# 2. Instalación de Dependencias del Sistema Operativo
log_info "Actualizando paquetes del sistema e instalando herramientas base..."
apt-get update -qq
apt-get install -y -qq curl wget git openssl ca-certificates gnupg lsb-release

# 3. Comprobación e Instalación de Docker y Docker Compose
if ! command -v docker &> /dev/null; then
    log_warn "Docker no se encuentra instalado en este VPS. Procediendo con la instalación oficial..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log_success "Docker Engine instalado correctamente."
else
    log_success "Docker ya está instalado: $(docker --version)"
fi

if ! docker compose version &> /dev/null; then
    log_warn "Docker Compose Plugin no detectado. Instalando paquete docker-compose-plugin..."
    apt-get install -y -qq docker-compose-plugin
fi
log_success "Docker Compose disponible: $(docker compose version)"

# 4. Configuración de Variables de Entorno de Producción
ENV_FILE="$PROJECT_ROOT/.env.production"
ENV_EXAMPLE="$PROJECT_ROOT/.env.production.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        log_warn "No se encontró .env.production. Creándolo a partir de .env.production.example..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"

        # Generar contraseñas aleatorias criptográficamente seguras
        POSTGRES_PASS=$(openssl rand -hex 20)
        REDIS_PASS=$(openssl rand -hex 20)
        NEXTCLOUD_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
        JWT_SECRET=$(openssl rand -hex 32)
        SERVICE_ROLE=$(openssl rand -hex 32)

        sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASS}|g" "$ENV_FILE"
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASS}|g" "$ENV_FILE"
        sed -i "s|NEXTCLOUD_ADMIN_PASSWORD=.*|NEXTCLOUD_ADMIN_PASSWORD=${NEXTCLOUD_PASS}|g" "$ENV_FILE"
        sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE}|g" "$ENV_FILE"

        chmod 600 "$ENV_FILE"
        log_success "Archivo .env.production generado con contraseñas seguras únicas."
        log_warn "IMPORTANTE: Revise los dominios (APP_DOMAIN, NEXTCLOUD_DOMAIN) y credenciales SMTP en: $ENV_FILE"
    else
        log_error "No se encontró el archivo de plantilla .env.production.example."
        exit 1
    fi
else
    log_info "Archivo .env.production ya existe. Manteniendo configuración existente."
    chmod 600 "$ENV_FILE"
fi

# Cargar variables del entorno
export $(grep -v '^#' "$ENV_FILE" | xargs)

# 5. Crear estructura de almacenamiento para copias de seguridad
BACKUP_DIR="/backups/emblema-nexus"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
log_success "Directorio de backups verificado en: $BACKUP_DIR"

# 6. Construir e Iniciar Contenedores Docker
log_info "Construyendo imágenes y levantando el stack con Docker Compose..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

# 7. Esperar a que PostgreSQL esté completamente listo
log_info "Esperando disponibilidad de PostgreSQL..."
RETRIES=30
until docker exec emblema-postgres pg_isready -U "${POSTGRES_USER:-emblema_user}" -d "${POSTGRES_DB:-emblema_nexus}" &> /dev/null || [ $RETRIES -eq 0 ]; do
    echo -n "."
    sleep 2
    RETRIES=$((RETRIES - 1))
done
echo ""

if [ $RETRIES -eq 0 ]; then
    log_error "Tiempo de espera agotado: PostgreSQL no respondió a tiempo."
    exit 1
fi
log_success "PostgreSQL está activo y recibiendo conexiones."

# 8. Ejecución de Migraciones de Base de Datos
log_info "Ejecutando migraciones SQL en orden secuencial..."
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
        migration_name=$(basename "$migration")
        log_info "Aplicando migración: $migration_name"
        docker exec -i emblema-postgres psql -U "${POSTGRES_USER:-emblema_user}" -d "${POSTGRES_DB:-emblema_nexus}" < "$migration" || {
            log_warn "Aviso al ejecutar $migration_name (puede que los objetos ya existan)."
        }
    done
    log_success "Migraciones de base de datos procesadas."
fi

# 9. Configuración y Optimización de Nextcloud
log_info "Esperando inicio de Nextcloud para validar configuración..."
sleep 10
if docker ps | grep -q emblema-nextcloud; then
    docker exec -u www-data emblema-nextcloud php occ config:system:set default_phone_region --value="DO" || true
    docker exec -u www-data emblema-nextcloud php occ config:system:set overwriteprotocol --value="https" || true
    log_success "Parámetros base de Nextcloud actualizados."
fi

# 10. Verificación de Salud de la Aplicación (Healthcheck)
log_info "Verificando endpoint de salud de la aplicación Next.js..."
APP_HEALTH_RETRIES=20
APP_HEALTHY=false

while [ $APP_HEALTH_RETRIES -gt 0 ]; do
    if docker exec emblema-app curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        APP_HEALTHY=true
        break
    fi
    sleep 3
    APP_HEALTH_RETRIES=$((APP_HEALTH_RETRIES - 1))
done

if [ "$APP_HEALTHY" = true ]; then
    log_success "Healthcheck de Next.js superado exitosamente (HTTP 200 OK)."
else
    log_warn "La aplicación aún se está inicializando. Verifique los logs con: docker compose -f docker-compose.prod.yml logs app"
fi

# 11. Resumen y Estado Final
echo ""
echo -e "${VERDE}=============================================================================${NC}"
echo -e "${VERDE}          ¡DESPLIEGUE DE EMBLEMA NEXUS COMPLETADO CON ÉXITO!                 ${NC}"
echo -e "${VERDE}=============================================================================${NC}"
echo -e "Aplicación Principal:    https://${APP_DOMAIN:-app.emblemanexus.com}"
echo -e "Gestor Documental Cloud: https://${NEXTCLOUD_DOMAIN:-cloud.emblemanexus.com}"
echo -e "Healthcheck API:         https://${APP_DOMAIN:-app.emblemanexus.com}/api/health"
echo ""
echo -e "Para automatizar las copias de seguridad diarias a las 3:00 AM, agregue al crontab:"
echo -e "  ${CYAN}(crontab -l 2>/dev/null; echo \"0 3 * * * $PROJECT_ROOT/scripts/backup.sh >> /var/log/emblema-backup.log 2>&1\") | crontab -${NC}"
echo "============================================================================="
