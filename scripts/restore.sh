#!/usr/bin/env bash
# =============================================================================
# EMBLEMA NEXUS — Script de Restauración (Disaster Recovery & Restore)
# =============================================================================
# Restaura base de datos PostgreSQL, Nextcloud y archivos desde un backup previo.
# Uso:
#   ./scripts/restore.sh [DIRECTORIO_O_TIMESTAMP_DEL_BACKUP]
#   Ejemplo: ./scripts/restore.sh 20260922_030000
#   Si no se pasa parámetro, listará los backups disponibles interactivamente.
# =============================================================================

set -euo pipefail

# Colores de consola
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
AZUL='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/emblema-nexus}"

echo -e "${AZUL}=============================================================================${NC}"
echo -e "${AZUL}            EMBLEMA NEXUS — Asistente de Restauración de Copias              ${NC}"
echo -e "${AZUL}=============================================================================${NC}"

# 1. Determinar el directorio de backup a restaurar
TARGET_BACKUP="${1:-}"

if [ -z "$TARGET_BACKUP" ]; then
    echo "Buscando copias de seguridad disponibles en $BACKUP_BASE_DIR..."
    if [ ! -d "$BACKUP_BASE_DIR" ] || [ -z "$(ls -A "$BACKUP_BASE_DIR" 2>/dev/null)" ]; then
        echo -e "${ROJO}[ERROR] No se encontraron copias de seguridad en $BACKUP_BASE_DIR.${NC}"
        exit 1
    fi

    echo ""
    echo "Copias de seguridad disponibles:"
    select bkp in $(ls -1dt "$BACKUP_BASE_DIR"/*/ 2>/dev/null | xargs -n 1 basename); do
        if [ -n "$bkp" ]; then
            TARGET_BACKUP="$bkp"
            break
        else
            echo "Opción inválida. Intente de nuevo."
        fi
    done
fi

# Resolver ruta completa del backup
if [ -d "$TARGET_BACKUP" ]; then
    BACKUP_PATH="$TARGET_BACKUP"
elif [ -d "${BACKUP_BASE_DIR}/${TARGET_BACKUP}" ]; then
    BACKUP_PATH="${BACKUP_BASE_DIR}/${TARGET_BACKUP}"
else
    echo -e "${ROJO}[ERROR] No se encontró el directorio de respaldo: $TARGET_BACKUP${NC}"
    exit 1
fi

echo -e "${AZUL}[INFO] Directorio de respaldo seleccionado:${NC} $BACKUP_PATH"

# 2. Comprobación de integridad SHA256 si existe el manifiesto
if [ -f "${BACKUP_PATH}/SHA256SUMS.txt" ]; then
    echo -e "${AZUL}[INFO] Verificando integridad de los archivos de respaldo...${NC}"
    cd "$BACKUP_PATH"
    if sha256sum -c --quiet SHA256SUMS.txt; then
        echo -e "${VERDE}[OK] Verificación de integridad SHA256 superada.${NC}"
    else
        echo -e "${ROJO}[PELIGRO] La verificación de integridad SHA256 falló. Los archivos podrían estar corruptos.${NC}"
        read -p "¿Desea continuar a pesar del error de integridad? (si/NO): " FORCE_CONTINUE
        if [ "$FORCE_CONTINUE" != "si" ] && [ "$FORCE_CONTINUE" != "SI" ]; then
            echo "Restauración cancelada por el usuario."
            exit 1
        fi
    fi
fi

# 3. Confirmación obligatoria de seguridad
echo ""
echo -e "${ROJO}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${ROJO}║                              ¡ADVERTENCIA!                                 ║${NC}"
echo -e "${ROJO}║ Esta operación SOBREESCRIBIRÁ la base de datos y los archivos actuales.    ║${NC}"
echo -e "${ROJO}║ Todos los datos generados desde la creación de este backup se PERDERÁN.    ║${NC}"
echo -e "${ROJO}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
read -p "Escriba 'RESTAURAR' para confirmar la operación: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTAURAR" ]; then
    echo "Operación cancelada. No se realizaron cambios."
    exit 0
fi

# 4. Cargar variables de entorno
ENV_FILE="$PROJECT_ROOT/.env.production"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-emblema_user}"
POSTGRES_DB="${POSTGRES_DB:-emblema_nexus}"
NEXTCLOUD_DB="${NEXTCLOUD_DB:-nextcloud}"

# 5. Pausar temporalmente el contenedor de la aplicación para evitar escrituras concurrentes
echo -e "${AMARILLO}[1/5] Deteniendo aplicación web para evitar escrituras concurrentes...${NC}"
docker stop emblema-app || true

# 6. Restauración de PostgreSQL: Base principal Emblema Nexus
echo -e "${AMARILLO}[2/5] Restaurando base de datos principal: $POSTGRES_DB...${NC}"
APP_SQL_FILE=$(ls -1 "${BACKUP_PATH}"/postgres_${POSTGRES_DB}_*.sql.gz 2>/dev/null | head -n 1 || true)

if [ -n "$APP_SQL_FILE" ] && [ -f "$APP_SQL_FILE" ]; then
    # Desconectar sesiones activas antes del restore
    docker exec -i emblema-postgres psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" || true

    gunzip -c "$APP_SQL_FILE" | docker exec -i emblema-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    echo -e "${VERDE}[OK] Base de datos principal $POSTGRES_DB restaurada.${NC}"
else
    echo -e "${AMARILLO}[AVISO] No se encontró archivo de volcado para $POSTGRES_DB. Omitiendo.${NC}"
fi

# 7. Restauración de PostgreSQL: Base de datos Nextcloud
echo -e "${AMARILLO}[3/5] Restaurando base de datos de Nextcloud: $NEXTCLOUD_DB...${NC}"
NC_SQL_FILE=$(ls -1 "${BACKUP_PATH}"/postgres_${NEXTCLOUD_DB}_*.sql.gz 2>/dev/null | head -n 1 || true)

if [ -n "$NC_SQL_FILE" ] && [ -f "$NC_SQL_FILE" ]; then
    docker exec -i emblema-postgres psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$NEXTCLOUD_DB' AND pid <> pg_backend_pid();" || true

    gunzip -c "$NC_SQL_FILE" | docker exec -i emblema-postgres psql -U "$POSTGRES_USER" -d "$NEXTCLOUD_DB"
    echo -e "${VERDE}[OK] Base de datos de Nextcloud $NEXTCLOUD_DB restaurada.${NC}"
fi

# 8. Restauración de Archivos de Nextcloud
echo -e "${AMARILLO}[4/5] Restaurando archivos y datos de Nextcloud...${NC}"
NC_DATA_FILE=$(ls -1 "${BACKUP_PATH}"/nextcloud_data_*.tar.gz 2>/dev/null | head -n 1 || true)

if [ -n "$NC_DATA_FILE" ] && [ -f "$NC_DATA_FILE" ]; then
    docker exec -u www-data emblema-nextcloud php occ maintenance:mode --on > /dev/null 2>&1 || true
    cat "$NC_DATA_FILE" | docker exec -i emblema-nextcloud tar -xzf - -C /var/www/html
    docker exec emblema-nextcloud chown -R www-data:www-data /var/www/html/data
    docker exec -u www-data emblema-nextcloud php occ files:scan --all || true
    docker exec -u www-data emblema-nextcloud php occ maintenance:mode --off > /dev/null 2>&1 || true
    echo -e "${VERDE}[OK] Archivos de Nextcloud restaurados y permisos verificados.${NC}"
fi

# 9. Reinicio de Servicios y Comprobación de Salud
echo -e "${AMARILLO}[5/5] Reiniciando servicios y validando salud...${NC}"
docker start emblema-app

echo "Esperando a que la aplicación esté lista..."
sleep 5

if docker exec emblema-app curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${VERDE}[OK] La aplicación respondió satisfactoriamente al healthcheck.${NC}"
else
    echo -e "${AMARILLO}[AVISO] Verifique los logs con 'docker compose -f docker-compose.prod.yml logs app'.${NC}"
fi

echo ""
echo -e "${VERDE}=============================================================================${NC}"
echo -e "${VERDE}       ¡PROCESO DE RESTAURACIÓN DE EMBLEMA NEXUS FINALIZADO CON ÉXITO!       ${NC}"
echo -e "${VERDE}=============================================================================${NC}"
