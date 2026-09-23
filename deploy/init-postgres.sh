#!/bin/bash
# =============================================================================
# EMBLEMA NEXUS — Inicialización de PostgreSQL
# Este script se ejecuta únicamente la primera vez que se inicia el volumen
# =============================================================================
set -e

echo "[INIT-POSTGRES] Creando extensiones y base de datos secundaria..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Extensiones necesarias para UUIDs y criptografía
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

# Crear base de datos dedicada para Nextcloud si no existe
NEXTCLOUD_DB_NAME="${NEXTCLOUD_DB:-nextcloud}"
echo "[INIT-POSTGRES] Verificando base de datos: $NEXTCLOUD_DB_NAME"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $NEXTCLOUD_DB_NAME'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$NEXTCLOUD_DB_NAME')\gexec
    GRANT ALL PRIVILEGES ON DATABASE $NEXTCLOUD_DB_NAME TO $POSTGRES_USER;
EOSQL

echo "[INIT-POSTGRES] Inicialización de PostgreSQL completada con éxito."
