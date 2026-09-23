# Manual de Despliegue en VPS Dedicado — Emblema Nexus
**Plataforma Integral de Gestión Legal, Agrimensura y Bienes Raíces**  
*Documento Técnico de Operaciones y DevOps — Versión 1.0 (Producción)*  
*República Dominicana — Cumplimiento Ley No. 32-23 de Facturación Electrónica e-CF*

---

## Índice de Contenidos
1. [Visión General de la Infraestructura](#1-visión-general-de-la-infraestructura)
2. [Dimensionamiento de Hardware y Proveedores de VPS](#2-dimensionamiento-de-hardware-y-proveedores-de-vps)
3. [Preparación y Hardening del Sistema Operativo (Ubuntu 22.04 / 24.04 LTS)](#3-preparación-y-hardening-del-sistema-operativo-ubuntu-2204--2404-lts)
4. [Instalación de Docker Engine y Docker Compose V2](#4-instalación-de-docker-engine-y-docker-compose-v2)
5. [Configuración de Red, Dominios y Registros DNS](#5-configuración-de-red-dominios-y-registros-dns)
6. [Arquitectura de Contenedores y Variables de Entorno](#6-arquitectura-de-contenedores-y-variables-de-entorno)
7. [Certificados SSL/TLS Automáticos con Caddy / Let's Encrypt](#7-certificados-ssltls-automáticos-con-caddy--lets-encrypt)
8. [Inicialización de Base de Datos y Secuencia de Migraciones (1 a 19)](#8-inicialización-de-base-de-datos-y-secuencia-de-migraciones-1-a-19)
9. [Aprovisionamiento y Vinculación de Nextcloud (WebDAV)](#9-aprovisionamiento-y-vinculación-de-nextcloud-webdav)
10. [Configuración del Certificado Digital e-CF (DGII Ley 32-23)](#10-configuración-del-certificado-digital-e-cf-dgii-ley-32-23)
11. [Automatización de Respaldos (Backups) y Tareas Cron](#11-automatización-de-respaldos-backups-y-tareas-cron)
12. [Monitoreo, Mantenimiento y Solución de Problemas (Troubleshooting)](#12-monitoreo-mantenimiento-y-solución-de-problemas-troubleshooting)

---

## 1. Visión General de la Infraestructura

Emblema Nexus opera bajo una arquitectura contenerizada multi-servicio diseñada para garantizar alta disponibilidad, aislamiento de procesos, confidencialidad de datos notariales y cumplimiento estricto con las normas tributarias de la Dirección General de Impuestos Internos (DGII).

```
                            +-------------------------------------------+
                            |            USUARIOS Y CLIENTES            |
                            |   (Navegador Web / Portal Móvil HTTPS)    |
                            +---------------------+---------------------+
                                                  |
                                                  v
                                      [ Puerto 80 / 443 TCP ]
                            +-------------------------------------------+
                            |           PROXY INVERSO CADDY             |
                            |    (Terminación TLS 1.3 Let's Encrypt)    |
                            +----+--------------------+---------------+--+
                                 |                    |               |
             +-------------------+                    |               +--------------------+
             | Proxy HTTP :3000                       | Proxy HTTP :8080                   | Proxy HTTP :3000
             v                                        v                                    v
+--------------------------+             +--------------------------+             +--------------------------+
|  EMBLEMA NEXUS ERP CORE  |             |      NEXTCLOUD HUB       |             |    PORTAL DE CLIENTES    |
|   Next.js 16 Standalone  |             |  Almacenamiento WebDAV   |             |   Tracking & Solicitudes |
|   Node.js 20 Alpine      |             |    Apache + PHP 8.2      |             |   Subdominio / Récords   |
+------------+-------------+             +------------+-------------+             +------------+-------------+
             |                                        |                                        |
             | Conexión Pool Postgres :5432           | Conexión MariaDB/PG                    | Consultas RLS
             v                                        v                                        |
+--------------------------+             +--------------------------+                          |
|    POSTGRESQL / SUPABASE |             |     STORAGE VOLUMES      |                          |
|   19 Migraciones + RLS   |             |  Archivos Cifrados NVMe  |                          |
|   PostGIS / Pgcrypto     |             |  Plantillas Notariales   |                          |
+--------------------------+             +--------------------------+                          |
             |                                                                                 |
             +=========================== RED INTERNA DOCKER BRIDGE ===========================+
```

---

## 2. Dimensionamiento de Hardware y Proveedores de VPS

Para garantizar un rendimiento fluido del motor de Next.js 16 con Server Components, la ejecución de transacciones de base de datos con políticas RLS y la manipulación de documentos DOCX/PDF en Nextcloud, se recomiendan los siguientes perfiles:

### 2.1 Tabla de Especificaciones Técnicas

| Perfil de Carga | Usuarios Concurrentes | vCPU | Memoria RAM | Almacenamiento NVMe | Proveedor y Plan Recomendado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Básico / Piloto** | Hasta 10 empleados | 4 vCPU | 8 GB RAM | 120 GB NVMe | Hetzner CPX31 / DigitalOcean 8GB Droplet |
| **Producción Estándar** *(Recomendado)* | 10 a 50 empleados + Portal | 4 a 6 vCPU | 16 GB RAM | 240 GB NVMe | Hetzner CPX41 / Contabo Cloud VPS L |
| **Corporativo / Multi-sede** | 50+ empleados + Brigadas GPS | 8 vCPU | 32 GB RAM | 400 GB+ NVMe | Hetzner Dedicated AX42 / Linode 32GB Dedicated |

> [!IMPORTANT]
> Se recomienda **Hetzner Cloud** (Datacenter Hillsboro/Ashburn en EE.UU. o Falkenstein en Alemania) o **DigitalOcean** (Región NYC) por su baja latencia hacia la República Dominicana (<60ms) y velocidad de I/O en discos NVMe.

---

## 3. Preparación y Hardening del Sistema Operativo (Ubuntu 22.04 / 24.04 LTS)

Una vez desplegada la instancia limpia con **Ubuntu 22.04 LTS** o **Ubuntu 24.04 LTS**, conéctese por SSH como `root` y ejecute el procedimiento de aseguramiento.

### 3.1 Actualización del Sistema y Zona Horaria
Configure la zona horaria legal de Santo Domingo (`America/Santo_Domingo`, UTC-4 sin cambio de horario) y actualice todos los paquetes del sistema operativo:

```bash
# Establecer zona horaria oficial dominicana
timedatectl set-timezone America/Santo_Domingo

# Actualizar repositorios e índices de paquetes
apt update && apt upgrade -y

# Instalar utilidades esenciales de administración
apt install -y curl wget git ufw htop net-tools fail2ban ca-certificates gnupg lsb-release unattended-upgrades
```

### 3.2 Creación de Usuario Administrativo Dedicado (Sin Root)
Nunca ejecute aplicaciones ni inicie sesión cotidiana directamente como `root`:

```bash
# Crear usuario operador
adduser nexusadmin

# Otorgar permisos de superusuario mediante sudo
usermod -aG sudo nexusadmin

# Transferir llaves SSH de root al nuevo usuario
mkdir -p /home/nexusadmin/.ssh
cp /root/.ssh/authorized_keys /home/nexusadmin/.ssh/
chown -R nexusadmin:nexusadmin /home/nexusadmin/.ssh
chmod 700 /home/nexusadmin/.ssh
chmod 600 /home/nexusadmin/.ssh/authorized_keys
```

### 3.3 Hardening del Servidor SSH
Edite el archivo `/etc/ssh/sshd_config` para deshabilitar la autenticación por contraseña y bloquear el acceso directo de root:

```bash
sudo nano /etc/ssh/sshd_config
```

Ajuste las siguientes directivas:
```ini
# Puerto alternativo opcional para mitigación de escaneos automáticos (ej. 2222 o mantener 22)
Port 22

# Deshabilitar acceso root
PermitRootLogin no

# Autenticación exclusiva por llave pública RSA / Ed25519
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no

# Límites de sesión
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

Reinicie el servicio SSH y pruebe la conexión en una terminal nueva antes de cerrar la actual:
```bash
sudo systemctl restart ssh
```

### 3.4 Configuración del Firewall UFW
Restrinja estrictamente el tráfico entrante a los servicios operativos esenciales:

```bash
# Políticas predeterminadas: bloquear entrada, permitir salida
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir puerto SSH (ajustar si configuró puerto alternativo)
sudo ufw allow 22/tcp comment "SSH Acceso Administrativo"

# Tráfico web para el Proxy Inverso (Caddy / Let's Encrypt)
sudo ufw allow 80/tcp comment "HTTP Redirección y Certbot"
sudo ufw allow 443/tcp comment "HTTPS Tráfico Seguro e-CF/ERP"
sudo ufw allow 443/udp comment "HTTP/3 QUIC Soporte Caddy"

# Activar firewall
sudo ufw --force enable
sudo ufw status verbose
```

### 3.5 Creación de Memoria de Intercambio (SWAP)
Next.js y PostgreSQL requieren estabilidad en picos de compilación o sincronización de bases de datos:

```bash
# Crear swapfile de 4 GB con permisos seguros
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persistir en /etc/fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimizar comportamiento del kernel para VPS con NVMe
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl vm.vfs_cache_pressure=50
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

---

## 4. Instalación de Docker Engine y Docker Compose V2

Instale el motor oficial de Docker siguiendo los repositorios oficiales de Docker Inc.:

```bash
# Añadir la llave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Añadir el repositorio al índice APT
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine, CLI, Containerd y Docker Compose V2
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permitir al usuario nexusadmin ejecutar Docker sin sudo
sudo usermod -aG docker nexusadmin

# Verificar instalación y versiones
docker --version
docker compose version
```

---

## 5. Configuración de Red, Dominios y Registros DNS

Antes de levantar el proxy y solicitar certificados SSL, configure los registros de su zona DNS en su proveedor (Cloudflare, Namecheap, GoDaddy o AWS Route53).

Supongamos que el dominio corporativo de la firma es `emblemanexus.com.do` y la IP pública del VPS es `203.0.113.50`:

| Nombre del Subdominio | Tipo de Registro | Destino / Valor | Función Operativa |
| :--- | :--- | :--- | :--- |
| `app.emblemanexus.com.do` | **A** | `203.0.113.50` | Acceso al ERP Core (Abogados, Agrimensores, Contabilidad) |
| `portal.emblemanexus.com.do` | **A** | `203.0.113.50` | Portal Público de Tracking `TRK-` y Consulta de Clientes |
| `cloud.emblemanexus.com.do` | **A** | `203.0.113.50` | Instancia Nextcloud para almacenamiento WebDAV y Actos |

> [!TIP]
> Si utiliza Cloudflare, configure los registros inicialmente con el modo **DNS Only** (Nube gris) durante la primera puesta en marcha para que Caddy emita los certificados TLS directamente con Let's Encrypt vía desafío HTTP-01.

---

## 6. Arquitectura de Contenedores y Variables de Entorno

### 6.1 Estructura del Directorio de Producción
Inicie sesión como `nexusadmin` y cree el directorio de despliegue en `/opt/emblema-nexus`:

```bash
sudo mkdir -p /opt/emblema-nexus
sudo chown -R nexusadmin:nexusadmin /opt/emblema-nexus
cd /opt/emblema-nexus
git clone https://github.com/tu-organizacion/emblema-nexus.git .
```

### 6.2 Archivo de Variables de Entorno `.env.production`
Cree el archivo `/opt/emblema-nexus/.env.production` con permisos restrictivos (`chmod 600`):

```bash
# =============================================================================
# EMBLEMA NEXUS — CONFIGURACIÓN OFICIAL DE PRODUCCIÓN
# =============================================================================
NODE_ENV=production
PORT=3000
TZ=America/Santo_Domingo

# --- Dominio y URL Base ---
NEXT_PUBLIC_APP_URL=https://app.emblemanexus.com.do
NEXT_PUBLIC_PORTAL_URL=https://portal.emblemanexus.com.do
NEXT_PUBLIC_APP_NAME="Emblema Nexus"

# --- Base de Datos PostgreSQL Producción ---
POSTGRES_DB=emblema_nexus_prod
POSTGRES_USER=nexus_db_admin
POSTGRES_PASSWORD=GenerarPasswordSegura64CharsConOpenSSL!
DATABASE_URL=postgresql://nexus_db_admin:GenerarPasswordSegura64CharsConOpenSSL!@postgres:5432/emblema_nexus_prod?schema=public

# --- Supabase / Auth Keys ---
NEXT_PUBLIC_SUPABASE_URL=https://app.emblemanexus.com.do/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# --- Nextcloud WebDAV Storage ---
NEXTCLOUD_URL=https://cloud.emblemanexus.com.do
NEXTCLOUD_USER=nexus_system_bot
NEXTCLOUD_APP_PASSWORD=tu-token-webdav-generado-en-nextcloud

# --- Facturación Electrónica e-CF (DGII Ley 32-23) ---
DGII_ENVIRONMENT=PROD
DGII_RNC_EMISOR=131897452
DGII_P12_BASE64=MIIK...CadenaCompletaCertificadoP12EnBase64...
DGII_P12_SECRET=ClavePrivadaDelCertificadoX509

# --- Administrador Maestro Inicial ---
ADMIN_EMAIL=gerencia@emblemanexus.com.do
ADMIN_PASSWORD=ClaveInicialSegura2026!
```

### 6.3 Archivo `docker-compose.prod.yml`
El archivo define los servicios aislados en una red interna cifrada:

```yaml
version: '3.8'

services:
  # ---------------------------------------------------------------------------
  # 1. Reverse Proxy & SSL Automático: Caddy v2
  # ---------------------------------------------------------------------------
  caddy:
    image: caddy:2-alpine
    container_name: nexus-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp" # Soporte HTTP/3 QUIC
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - nexus-internal-net
    depends_on:
      - app
      - nextcloud

  # ---------------------------------------------------------------------------
  # 2. Aplicación Principal: Emblema Nexus ERP & Portal
  # ---------------------------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: nexus-app
    restart: always
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=3000
    expose:
      - "3000"
    networks:
      - nexus-internal-net
    depends_on:
      postgres:
        condition: service_healthy

  # ---------------------------------------------------------------------------
  # 3. Base de Datos Relacional: PostgreSQL con Extensiones
  # ---------------------------------------------------------------------------
  postgres:
    image: postgres:15-alpine
    container_name: nexus-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-emblema_nexus_prod}
      POSTGRES_USER: ${POSTGRES_USER:-nexus_db_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      TZ: America/Santo_Domingo
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d:ro
    expose:
      - "5432"
    networks:
      - nexus-internal-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-nexus_db_admin} -d ${POSTGRES_DB:-emblema_nexus_prod}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ---------------------------------------------------------------------------
  # 4. Almacenamiento Documental: Nextcloud Hub
  # ---------------------------------------------------------------------------
  nextcloud:
    image: nextcloud:29-apache
    container_name: nexus-nextcloud
    restart: always
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=nextcloud_db
      - POSTGRES_USER=${POSTGRES_USER:-nexus_db_admin}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - NEXTCLOUD_TRUSTED_DOMAINS=cloud.emblemanexus.com.do
      - OVERWRITEPROTOCOL=https
      - OVERWRITECLIURL=https://cloud.emblemanexus.com.do
      - PHP_MEMORY_LIMIT=1024M
      - PHP_UPLOAD_LIMIT=512M
    volumes:
      - nextcloud_data:/var/www/html
    expose:
      - "80"
    networks:
      - nexus-internal-net
    depends_on:
      - postgres

networks:
  nexus-internal-net:
    driver: bridge

volumes:
  pgdata:
  caddy_data:
  caddy_config:
  nextcloud_data:
```

---

## 7. Certificados SSL/TLS Automáticos con Caddy / Let's Encrypt

Caddy gestiona de manera totalmente autónoma la emisión, renovación a 90 días y engrapado OCSP (OCSP Stapling) de los certificados SSL ante Let's Encrypt y ZeroSSL.

Cree el archivo `/opt/emblema-nexus/Caddyfile`:

```caddy
{
    email alertas-devops@emblemanexus.com.do
    admin off
}

# --- ERP Core de Emblema Nexus ---
app.emblemanexus.com.do {
    encode zstd gzip

    # Cabeceras estrictas de seguridad (HSTS, CSP, XSS Protection)
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

# --- Portal de Clientes y Tracking ---
portal.emblemanexus.com.do {
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }

    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

# --- Instancia Nextcloud WebDAV ---
cloud.emblemanexus.com.do {
    encode zstd gzip

    # Redirecciones requeridas por los clientes CalDAV/CardDAV de Nextcloud
    redir /.well-known/carddav /remote.php/dav 301
    redir /.well-known/caldav /remote.php/dav 301

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }

    reverse_proxy nextcloud:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        # Tamaño de carga hasta 500 MB para planos DWG y actos notariales
        max_request_body 524288000
    }
}
```

---

## 8. Inicialización de Base de Datos y Secuencia de Migraciones (1 a 19)

Emblema Nexus depende de 19 migraciones SQL desarrolladas a lo largo de las 10 fases del proyecto. Deben ejecutarse en estricto orden secuencial dentro de la base de datos PostgreSQL.

### 8.1 Inventario de las 19 Migraciones
1. `00001_esquema_base.sql`: Empresas, perfiles y miembros multi-tenant.
2. `00002_permisos.sql`: Matriz RBAC, roles del sistema y permisos atómicos.
3. `00003_clientes.sql`: Clientes personas físicas (Cédula) y jurídicas (RNC DGII).
4. `00004_expedientes.sql`: Expedientes legales, workflows procesales, etapas y tareas.
5. `00005_finanzas_placeholder.sql`: Estructura inicial contable.
6. `00006_ecf_placeholder.sql`: Estructura base de facturación electrónica.
7. `00007_documentos.sql`: Archivos, versionamiento SHA-256 y plantillas notariales DOCX.
8. `00008_reportes_placeholder.sql`: Parámetros de analítica.
9. `00009_auditoria_versionamiento.sql`: Esquema `audit.logs` y snapshots de entidades.
10. `00010_politicas_rls.sql`: Políticas de Row Level Security para aislamiento empresarial.
11. `00011_funciones_triggers.sql`: Triggers de auditoría, timestamp y secuencias automáticas.
12. `00012_indices.sql`: Índices B-Tree y GIN para optimización de consultas.
13. `00013_agenda_tareas_notificaciones.sql`: Calendario, audiencias, tablero Kanban y alertas.
14. `00014_finanzas_facturacion.sql`: Cotizaciones, NCF tradicionales B01/B02, pagos y gastos.
15. `00015_facturacion_electronica_ecf.sql`: e-CF (E31, E32, E34), secuencias y firmas XML-DSig.
16. `00016_agrimensura_catastro.sql`: Parcelas, coordenadas UTM 19N, Tareas ($628.86\text{ m}^2$) y DNMC.
17. `00017_inmobiliaria_bienes_raices.sql`: Inmuebles, contratos esquema 2+1, comisiones y retención ISR 10%.
18. `00018_portal_clientes_tracking.sql`: Tokens `TRK-`, Magic Links y requerimientos web.
19. `00019_reportes_analitica_bi.sql`: Vistas para formatos DGII 606, 607, 608 y BI de rentabilidad.

### 8.2 Script Automatizado de Ejecución de Migraciones
Para ejecutar todas las migraciones en un ambiente limpio o aplicar cambios incrementales, cree y ejecute el script `scripts/migrate.sh`:

```bash
#!/usr/bin/env bash
set -e

echo "=== APLICANDO LAS 19 MIGRACIONES EN EMBLEMA NEXUS PROD ==="

DB_USER="${POSTGRES_USER:-nexus_db_admin}"
DB_NAME="${POSTGRES_DB:-emblema_nexus_prod}"
MIGRATIONS_DIR="./supabase/migrations"

# Lista ordenada de archivos
MIGRATION_FILES=(
  "00001_esquema_base.sql"
  "00002_permisos.sql"
  "00003_clientes.sql"
  "00004_expedientes.sql"
  "00005_finanzas_placeholder.sql"
  "00006_ecf_placeholder.sql"
  "00007_documentos.sql"
  "00008_reportes_placeholder.sql"
  "00009_auditoria_versionamiento.sql"
  "00010_politicas_rls.sql"
  "00011_funciones_triggers.sql"
  "00012_indices.sql"
  "00013_agenda_tareas_notificaciones.sql"
  "00014_finanzas_facturacion.sql"
  "00015_facturacion_electronica_ecf.sql"
  "00016_agrimensura_catastro.sql"
  "00017_inmobiliaria_bienes_raices.sql"
  "00018_portal_clientes_tracking.sql"
  "00019_reportes_analitica_bi.sql"
)

for file in "${MIGRATION_FILES[@]}"; do
  echo "--> Ejecutando migración: $file..."
  docker exec -i nexus-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATIONS_DIR/$file"
  echo "    [OK] $file aplicada satisfactoriamente."
done

echo "=== TODAS LAS 19 MIGRACIONES FUERON APLICADAS CON ÉXITO ==="
```

Asigne permisos de ejecución y ejecute:
```bash
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

---

## 9. Aprovisionamiento y Vinculación de Nextcloud (WebDAV)

El módulo de gestión documental de Emblema Nexus delega el almacenamiento seguro de expedientes, planos topográficos y contratos notariales en Nextcloud a través del protocolo WebDAV.

### 9.1 Instalación por Consola de Nextcloud
Una vez que el contenedor `nexus-nextcloud` se encuentre en estado `running`, ejecute el comando de instalación automática:

```bash
docker exec -u www-data nexus-nextcloud php occ maintenance:install \
  --database "pgsql" \
  --database-name "nextcloud_db" \
  --database-host "postgres" \
  --database-user "nexus_db_admin" \
  --database-pass "GenerarPasswordSegura64CharsConOpenSSL!" \
  --admin-user "nc_admin" \
  --admin-pass "ClaveAdministradorNextcloud2026!"
```

### 9.2 Creación del Usuario Bot y Token de Aplicación WebDAV
1. Inicie sesión en `https://cloud.emblemanexus.com.do` con las credenciales `nc_admin`.
2. Diríjase a **Ajustes de Administración > Usuarios**.
3. Cree un usuario de servicio exclusivo:
   - **Usuario**: `nexus_system_bot`
   - **Grupo**: `Sistema`
   - **Cuota**: `Ilimitada`
4. Inicie sesión como `nexus_system_bot` y diríjase a **Ajustes Personales > Seguridad > Dispositivos y contraseñas**.
5. Escriba un nombre para la aplicación: `EmblemaNexus-ERP` y haga clic en **Crear nueva contraseña de la aplicación**.
6. Copie el token generado (ejemplo: `k9sL2-Xm8Pq-4Nt9w-B1v7c`) y configúrelo en el archivo `.env.production`:
   ```ini
   NEXTCLOUD_URL=https://cloud.emblemanexus.com.do
   NEXTCLOUD_USER=nexus_system_bot
   NEXTCLOUD_APP_PASSWORD=k9sL2-Xm8Pq-4Nt9w-B1v7c
   ```

### 9.3 Estructura de Directorios Raíz
Ejecute el comando para crear los directorios base del despacho:
```bash
docker exec -u www-data nexus-nextcloud php occ files:mkdir nexus_system_bot/Expedientes
docker exec -u www-data nexus-nextcloud php occ files:mkdir nexus_system_bot/Plantillas
docker exec -u www-data nexus-nextcloud php occ files:mkdir nexus_system_bot/Clientes
docker exec -u www-data nexus-nextcloud php occ files:scan nexus_system_bot
```

---

## 10. Configuración del Certificado Digital e-CF (DGII Ley 32-23)

La República Dominicana, mediante la **Ley No. 32-23**, establece la obligatoriedad del uso de Comprobantes Fiscales Electrónicos (e-CF). Para emitir e-CF válidos ante la DGII, la empresa debe poseer un Certificado Digital de Persona Jurídica emitido por una entidad de certificación acreditada por el INDOTEL:
- **AVANSI Dominicana** (`avansi.com.do`)
- **Digifirma Dominicana**
- **Cámara de Comercio y Producción de Santo Domingo (CCPSD)**

### 10.1 Inspección y Conversión del Archivo `.p12` / `.pfx`
El prestador de servicios entrega un archivo en formato PKCS#12 (extensión `.p12` o `.pfx`).

```bash
# Verificar la validez del certificado y los datos de la empresa con OpenSSL
openssl pkcs12 -in certificado_empresa.p12 -info -noout
```

### 10.2 Codificación a Base64 para Entorno Seguro
Para inyectar el certificado en el contenedor Docker sin almacenar archivos binarios sensibles en el repositorio git:

```bash
# Convertir el archivo .p12 a una sola línea Base64 limpia
base64 -w 0 certificado_empresa.p12 > cert_base64.txt

# Copiar el contenido e insertarlo en .env.production
# DGII_P12_BASE64=$(cat cert_base64.txt)
# DGII_P12_SECRET="ClaveSecretaDelCertificado123"
```

> [!WARNING]
> La clave privada contenida en el certificado nunca debe compartirse ni enviarse por correo electrónico ordinario. Si el certificado vence o es revocado, debe actualizarse inmediatamente en `.env.production` y reiniciar el servicio `nexus-app`.

### 10.3 Paso a Producción ante la DGII
1. Complete la etapa de certificación en el ambiente de prueba `CERT` emitiendo los sets de prueba requeridos por la DGII.
2. Solicite la resolución formal de pase a producción a través de la Oficina Virtual (OFV) de la DGII.
3. Actualice en `.env.production`:
   ```ini
   DGII_ENVIRONMENT=PROD
   ```
4. Verifique que las secuencias autorizadas en `ecf_sequences` coincidan con el rango otorgado por la DGII para cada tipo de comprobante (`E31`, `E32`, `E34`).

---

## 11. Automatización de Respaldos (Backups) y Tareas Cron

Para asegurar la continuidad de negocio y la preservación de expedientes legales, se implementa un cronjob diario a las **02:00 AM AST** que genera copias consistentes de la base de datos PostgreSQL y los archivos de Nextcloud, aplicando una rotación automática de 30 días.

### 11.1 Script de Respaldos `/opt/emblema-nexus/scripts/backup.sh`
Cree el archivo de respaldo:

```bash
#!/usr/bin/env bash
set -e

BACKUP_DIR="/var/backups/emblema-nexus"
FECHA=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[${FECHA}] Iniciando respaldo automatizado de Emblema Nexus..."

# 1. Respaldo de Base de Datos PostgreSQL (Formato Custom comprimido)
DUMP_FILE="${BACKUP_DIR}/emblema_nexus_db_${FECHA}.dump"
docker exec nexus-postgres pg_dump -U nexus_db_admin -Fc emblema_nexus_prod > "$DUMP_FILE"
echo "  -> Dump de base de datos completado: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# 2. Respaldo comprimido del volumen de Nextcloud y Caddy
STORAGE_FILE="${BACKUP_DIR}/emblema_nexus_storage_${FECHA}.tar.gz"
tar -czf "$STORAGE_FILE" -C /opt/emblema-nexus .env.production Caddyfile
echo "  -> Configuraciones respaldadas: $STORAGE_FILE"

# 3. Rotación: Eliminar copias de seguridad de más de 30 días
find "$BACKUP_DIR" -name "emblema_nexus_*" -type f -mtime +$RETENTION_DAYS -delete
echo "  -> Rotación de respaldos completada (archivos > ${RETENTION_DAYS} días eliminados)."

echo "[$(date +"%Y%m%d_%H%M%S")] Respaldo finalizado con éxito."
```

Haga el script ejecutable:
```bash
chmod +x /opt/emblema-nexus/scripts/backup.sh
```

### 11.2 Programación en la Crontab del Sistema
Edite el crontab del usuario root o nexusadmin:

```bash
sudo crontab -e
```

Añada las siguientes tareas:
```cron
# 1. Respaldo diario de base de datos y archivos a las 2:00 AM
0 2 * * * /opt/emblema-nexus/scripts/backup.sh >> /var/log/nexus_backup.log 2>&1

# 2. Verificación y consulta de estado de timbrados e-CF pendientes (Cada hora)
0 * * * * docker exec nexus-app node -e "/* Tarea programada de sincronización e-CF */" >> /var/log/nexus_ecf_sync.log 2>&1

# 3. Limpieza de logs de Docker (Cada domingo a las 3:30 AM)
30 3 * * 0 docker system prune -f --volumes >> /dev/null 2>&1
```

---

## 12. Monitoreo, Mantenimiento y Solución de Problemas (Troubleshooting)

### 12.1 Comandos Esenciales de Operaciones
```bash
# Ver estado de salud de todos los contenedores
docker compose -f docker-compose.prod.yml ps

# Inspeccionar consumo de CPU, Memoria y Red en tiempo real
docker stats --no-stream

# Ver logs continuos de la aplicación ERP
docker compose -f docker-compose.prod.yml logs -f --tail=100 app

# Ver logs de emisión de certificados SSL en Caddy
docker compose -f docker-compose.prod.yml logs -f --tail=50 caddy

# Reiniciar únicamente el servicio ERP sin interrumpir la base de datos
docker compose -f docker-compose.prod.yml restart app
```

### 12.2 Matriz de Solución de Problemas Comunes

| Síntoma / Error | Causa Probable | Procedimiento de Resolución |
| :--- | :--- | :--- |
| **Error 502 Bad Gateway en navegador** | El contenedor `nexus-app` no está escuchando en el puerto 3000 o se detuvo. | Ejecute `docker compose logs app` para inspeccionar errores de inicio o variables faltantes. Verifique que `postgres` esté saludable con `docker compose ps`. |
| **Certificado SSL Inválido / Advertencia HTTPS** | Caddy no pudo validar el dominio ante Let's Encrypt. | Verifique que los registros DNS `A` apunten a la IP pública del VPS (`dig +short app.emblemanexus.com.do`). Asegúrese de que los puertos 80 y 443 estén abiertos en UFW (`sudo ufw status`). |
| **Error 401 Unauthorized en Nextcloud WebDAV** | Token de aplicación revocado o usuario `nexus_system_bot` sin acceso. | Inicie sesión en `cloud.emblemanexus.com.do`, genere una nueva contraseña de aplicación para `nexus_system_bot` y actualice `NEXTCLOUD_APP_PASSWORD` en `.env.production`. |
| **Error DGII Código 1002 (Semilla / Token Inválido)** | Desfase de hora en el VPS o certificado `.p12` no corresponde al RNC emisor. | Ejecute `timedatectl` para verificar la sincronización horaria. Revise que `DGII_RNC_EMISOR` coincida exactamente con el RNC registrado en el certificado digital. |
| **Consumo de memoria RAM > 95% (OOM Killer)** | Fuga de memoria o Nextcloud PHP sin límite adecuado. | Compruebe qué proceso consume memoria con `htop`. Ajuste `PHP_MEMORY_LIMIT=1024M` en `docker-compose.prod.yml` y asegúrese de que la memoria SWAP esté activa (`swapon --show`). |

---
*Manual redactado y certificado por el Equipo de Arquitectura & Operaciones de Emblema Nexus.*
