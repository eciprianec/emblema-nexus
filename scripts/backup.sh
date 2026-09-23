#!/usr/bin/env bash
# =============================================================================
# EMBLEMA NEXUS — Script de Respaldo Automatizado (Backup)
# =============================================================================
# Funciones:
# 1. Exporta la base de datos principal PostgreSQL (emblema_nexus) comprimida en GZIP.
# 2. Exporta la base de datos de Nextcloud comprimida en GZIP.
# 3. Respalda el volumen de archivos y datos de Nextcloud.
# 4. Respalda la configuración y archivo de variables de entorno de producción.
# 5. Genera archivo de verificación de integridad SHA256.
# 6. Elimina automáticamente copias de seguridad con más de 30 días de antigüedad.
# =============================================================================

set -euo pipefail

# Configuración de rutas y marcas de tiempo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/emblema-nexus}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CURRENT_BACKUP_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"
RETENTION_DAYS=30
LOG_FILE="/var/log/emblema-backup.log"

log() {
    local msg="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
    echo "$msg"
    if [ -d "/var/log" ] && [ -w "/var/log" ]; then
        echo "$msg" >> "$LOG_FILE"
    fi
}

log "============================================================================="
log "Iniciando proceso de respaldo de Emblema Nexus ($TIMESTAMP)..."

# Cargar variables de entorno
ENV_FILE="$PROJECT_ROOT/.env.production"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    log "ADVERTENCIA: No se encontró $ENV_FILE. Se usarán valores predeterminados."
fi

POSTGRES_USER="${POSTGRES_USER:-emblema_user}"
POSTGRES_DB="${POSTGRES_DB:-emblema_nexus}"
NEXTCLOUD_DB="${NEXTCLOUD_DB:-nextcloud}"

# Crear directorio para esta copia de seguridad
mkdir -p "$CURRENT_BACKUP_DIR"
chmod 700 "$CURRENT_BACKUP_DIR"

# -----------------------------------------------------------------------------
# 1. Respaldo de Base de Datos PostgreSQL — Emblema Nexus
# -----------------------------------------------------------------------------
log "1/5: Exportando base de datos principal: $POSTGRES_DB..."
APP_DB_FILE="${CURRENT_BACKUP_DIR}/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

if docker ps | grep -q "emblema-postgres"; then
    docker exec emblema-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip -9 > "$APP_DB_FILE"
    log "Base de datos principal exportada exitosamente: $(du -h "$APP_DB_FILE" | cut -f1)"
else
    log "ERROR: El contenedor emblema-postgres no está en ejecución. Abortando respaldo de DB."
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Respaldo de Base de Datos PostgreSQL — Nextcloud
# -----------------------------------------------------------------------------
log "2/5: Exportando base de datos de Nextcloud: $NEXTCLOUD_DB..."
NC_DB_FILE="${CURRENT_BACKUP_DIR}/postgres_${NEXTCLOUD_DB}_${TIMESTAMP}.sql.gz"

docker exec emblema-postgres pg_dump -U "$POSTGRES_USER" -d "$NEXTCLOUD_DB" --clean --if-exists | gzip -9 > "$NC_DB_FILE" || {
    log "AVISO: No se pudo respaldar $NEXTCLOUD_DB o la base de datos no existe."
}

# -----------------------------------------------------------------------------
# 3. Respaldo de Archivos de Nextcloud (Volumen WebDAV)
# -----------------------------------------------------------------------------
log "3/5: Respaldando archivos y documentos de Nextcloud..."
NC_FILES_ARCHIVE="${CURRENT_BACKUP_DIR}/nextcloud_data_${TIMESTAMP}.tar.gz"

if docker ps | grep -q "emblema-nextcloud"; then
    # Habilitar modo mantenimiento en Nextcloud para consistencia de archivos
    docker exec -u www-data emblema-nextcloud php occ maintenance:mode --on > /dev/null 2>&1 || true

    # Crear archivo tar.gz excluyendo temporales y caché
    docker exec emblema-nextcloud tar -czf - \
        --exclude="data/updater-*" \
        --exclude="data/*/cache/*" \
        -C /var/www/html data config > "$NC_FILES_ARCHIVE" || {
        log "AVISO: Ocurrió una advertencia al empaquetar Nextcloud data."
    }

    # Desactivar modo mantenimiento
    docker exec -u www-data emblema-nextcloud php occ maintenance:mode --off > /dev/null 2>&1 || true
    log "Archivos de Nextcloud respaldados: $(du -h "$NC_FILES_ARCHIVE" | cut -f1)"
else
    log "AVISO: Contenedor emblema-nextcloud inactivo. Omitiendo respaldo de archivos."
fi

# -----------------------------------------------------------------------------
# 4. Respaldo de Configuración y Variables de Producción
# -----------------------------------------------------------------------------
log "4/5: Respaldando configuraciones de entorno y Caddy..."
CONFIG_ARCHIVE="${CURRENT_BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"
tar -czf "$CONFIG_ARCHIVE" -C "$PROJECT_ROOT" .env.production deploy/ docker-compose.prod.yml
chmod 600 "$CONFIG_ARCHIVE"

# -----------------------------------------------------------------------------
# 5. Generación de Checksums de Integridad SHA256
# -----------------------------------------------------------------------------
log "5/5: Generando firmas de comprobación de integridad SHA256..."
cd "$CURRENT_BACKUP_DIR"
sha256sum * > SHA256SUMS.txt
chmod 600 SHA256SUMS.txt

# -----------------------------------------------------------------------------
# 6. Política de Retención: Eliminar respaldos mayores a 30 días
# -----------------------------------------------------------------------------
log "Aplicando política de retención: eliminando respaldos con más de $RETENTION_DAYS días..."
DELETED_COUNT=$(find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" | wc -l)
find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
log "Copias de seguridad antiguas depuradas: $DELETED_COUNT eliminadas."

TOTAL_BACKUP_SIZE=$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)
log "Proceso de respaldo finalizado con éxito en: $CURRENT_BACKUP_DIR (Tamaño total: $TOTAL_BACKUP_SIZE)"
log "============================================================================="
