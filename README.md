<div align="center">

# Emblema Nexus

**Plataforma Integral de Gestión Empresarial para Firmas Legales, Agrimensura y Bienes Raíces**  
*Desarrollada para la República Dominicana — Cumplimiento de la Ley No. 32-23 de Facturación Electrónica y Ley No. 108-05 de Registro Inmobiliario*

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase / Postgres](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![DGII e-CF](https://img.shields.io/badge/DGII_e--CF-Ley_32--23_Homologado-0052cc?style=for-the-badge)](https://dgii.gov.do/)
[![Agrimensura](https://img.shields.io/badge/Geodesia-WGS84_UTM_19N-green?style=for-the-badge)](https://ri.gob.do/)
[![Storage](https://img.shields.io/badge/Storage-Nextcloud_WebDAV-0082c9?style=for-the-badge&logo=nextcloud)](https://nextcloud.com/)

</div>

---

## 📌 Descripción Ejecutiva

**Emblema Nexus** es la primera suite de gestión corporativa verticalizada para el mercado de la República Dominicana que unifica en un único entorno de trabajo de alta seguridad y disponibilidad las tres actividades fundamentales del sector patrimonial:

1. **Gestión Jurídica y Notarial**: Conducción procesal de expedientes ante los Tribunales de la República, control estricto de plazos procesales perentorios y generación dinámica de actos notariales en `.docx`.
2. **Agrimensura y Catastro Técnico**: Cartografía de parcelas en proyección oficial **WGS84 UTM Zona 19 Norte**, conversión automática y precisa a **Tareas dominicanas** ($1\text{ Tarea} = 628.86\text{ m}^2$), tramitación ante las Direcciones Regionales de la **DNMC** y control de actas de linderos con colindantes.
3. **Corretaje y Bienes Raíces**: Portafolio de propiedades vinculadas a parcelas catastrales y títulos de propiedad, contratos de arrendamiento bajo el estándar dominicano **2 + 1**, y liquidación de comisiones de corredores con **retención del 10% de ISR** según el Código Tributario de la DGII.
4. **Facturación Electrónica e-CF Homologada**: Emisión nativa de comprobantes fiscales electrónicos (**E31, E32, E34, E44, E45**), firma digital XML-DSig con certificados **X.509 (.p12)** emitidos por entidades acreditadas (Avansi, Digifirma, CCPSD), cálculo del código de seguridad de 6 dígitos y recepción de facturas B2B.
5. **Portal de Clientes de Autoservicio**: Seguimiento público de trámites mediante código alfanumérico **TRK-YYYY-XXXXX**, acceso privado con **Magic Links** o PIN, descarga de planos y carga de documentos requeridos.
6. **Cumplimiento Tributario y Analítica BI**: Generación instantánea de los archivos planos oficiales **606, 607 y 608 en formato `.txt`** para la Oficina Virtual de la DGII y cuadro de mando de rentabilidad neta por expediente.

---

## 🚀 Hoja de Ruta del Proyecto: 10 Fases Completadas

El desarrollo de Emblema Nexus se ha ejecutado de manera modular y rigurosa a lo largo de 10 fases continuas:

| Fase | Denominación y Alcance | Rutas Principales en la Aplicación | Migraciones SQL Vinculadas |
| :---: | :--- | :--- | :---: |
| **01** | **Arquitectura Base, Multi-empresa y RBAC**<br>Aislamiento de sedes por RLS, autenticación Supabase y matriz de permisos. | `/login`<br>`/dashboard`<br>`/configuracion` | `00001_esquema_base.sql`<br>`00002_permisos.sql` |
| **02** | **Directorio de Clientes y Expedientes Legales**<br>Validación de Cédula (Luhn) y RNC DGII, etapas procesales y plazos. | `/clientes`<br>`/clientes/[id]`<br>`/expedientes` | `00003_clientes.sql`<br>`00004_expedientes.sql` |
| **03** | **Agenda, Audiencias y Tablero Kanban de Tareas**<br>Calendario de audiencias judiciales, plazos perentorios y flujo ágil de tareas. | `/agenda`<br>`/agenda?tab=tasks`<br>`/agenda?tab=calendar` | `00013_agenda_tareas_notificaciones.sql` |
| **04** | **Finanzas y Facturación Tradicional NCF**<br>Cotizaciones con conversión a factura, comprobantes B01/B02, CxC y caja. | `/finanzas`<br>`/finanzas?tab=quotes`<br>`/finanzas?tab=expenses` | `00014_finanzas_facturacion.sql` |
| **05** | **Facturación Electrónica e-CF (Ley 32-23)**<br>Comprobantes E31/E32/E34, firma XML-DSig, TrackID DGII, QR y buzón B2B. | `/finanzas?tab=ecf-invoices`<br>`/finanzas?tab=ecf-receptions` | `00015_facturacion_electronica_ecf.sql` |
| **06** | **Agrimensura, Catastro DNMC y UTM 19N**<br>Ficha de parcelas, visor SVG de vértices, $1\text{ Tarea} = 628.86\text{ m}^2$, DNMC y brigadas. | `/agrimensura`<br>`/agrimensura/parcelas`<br>`/agrimensura/expedientes` | `00016_agrimensura_catastro.sql` |
| **07** | **Inmobiliaria, Esquema 2+1 y Comisiones con ISR**<br>Inmuebles, debida diligencia de títulos, contratos 2+1, showings y retención 10% ISR. | `/inmobiliaria`<br>`/inmobiliaria?tab=contracts`<br>`/inmobiliaria?tab=commissions` | `00017_inmobiliaria_bienes_raices.sql` |
| **08** | **Gestión Documental y Nextcloud WebDAV**<br>Repositorio en la nube, control de versiones SHA-256 y plantillas notariales DOCX. | `/documentos`<br>`/documentos?tab=templates` | `00007_documentos.sql`<br>`00009_auditoria_versionamiento.sql` |
| **09** | **Portal de Clientes, Tracking TRK y Magic Links**<br>Seguimiento público `TRK-`, acceso sin contraseña, subida de documentos. | `/portal`<br>`/portal/tracking`<br>`/portal/login`<br>`/portal/consulta` | `00018_portal_clientes_tracking.sql` |
| **10** | **Reportes Oficiales DGII, BI y Despliegue VPS**<br>Formatos planos 606, 607, 608 (.txt), analítica de rentabilidad, Docker y manuales. | `/reportes`<br>`/reportes?tab=dgii`<br>`/reportes?tab=profitability` | `00019_reportes_analitica_bi.sql`<br>`docs/MANUAL_DESPLIEGUE_VPS.md`<br>`docs/MANUAL_USUARIO.md` |

---

## 🛠️ Stack Tecnológico de Última Generación

```
+-------------------------------------------------------------------------------+
|                             ARQUITECTURA DEL SISTEMA                          |
+-------------------------------------------------------------------------------+
|  FRONTEND & SSR:       Next.js 16 (App Router) + React 19 + TypeScript 5      |
|  DISEÑO & UI:          Tailwind CSS v4 + Radix UI + Lucide Icons + Sonner     |
|  BASE DE DATOS:        PostgreSQL 15 (Supabase) + Row Level Security (RLS)    |
|  ALMACENAMIENTO:       Nextcloud 29 vía WebDAV Protocol + docx-templates      |
|  MOTOR FISCAL:         XML-DSig RSA-SHA256 + C14N Canonicalizer (DGII e-CF)   |
|  GEODESIA & CATASTRO:  Proyección UTM Zona 19N WGS84 + Algoritmo de Shoelace |
|  INFRAESTRUCTURA:      Docker Engine + Docker Compose V2 + Caddy TLS 1.3      |
+-------------------------------------------------------------------------------+
```

---

## 💻 Guía de Inicio Rápido en Desarrollo Local

### 1. Requisitos Previos
- **Node.js**: Versión `20.x` o superior instalada.
- **Gestor de Paquetes**: `npm`, `pnpm` o `yarn`.
- **Git**: Para control de versiones.

### 2. Clonación e Instalación de Dependencias
```bash
git clone https://github.com/tu-organizacion/emblema-nexus.git
cd emblema-nexus

# Instalar dependencias exactas
npm install
```

### 3. Configuración de Variables de Entorno
Copie la plantilla de entorno e ingrese los datos de su instancia local de Supabase y Nextcloud:
```bash
cp .env.example .env.local
```

### 4. Ejecución del Servidor de Desarrollo
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) en su navegador para acceder a la aplicación.

---

## 🐳 Puesta en Producción con Docker Compose

Para desplegar la suite completa (ERP Core, Caddy Reverse Proxy, PostgreSQL y Nextcloud Hub) en un servidor VPS:

### 1. Configurar Entorno de Producción
```bash
cp .env.example .env.production
nano .env.production
```

### 2. Ejecutar Script de Despliegue Automatizado
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

O manualmente mediante Docker Compose V2:
```bash
# Compilar e iniciar todos los servicios
docker compose -f docker-compose.prod.yml up -d --build

# Inspeccionar logs de ejecución
docker compose -f docker-compose.prod.yml logs -f app
```

---

## 📚 Documentación Técnica y Manuales Oficiales

Para consultar las especificaciones técnicas completas y los protocolos operativos, acceda a los documentos dedicados en la carpeta [`/docs`](file:///C:/emblema-nexus/docs):

- 📘 **[Manual de Despliegue en VPS Dedicado](file:///C:/emblema-nexus/docs/MANUAL_DESPLIEGUE_VPS.md)**: Guía paso a paso para Ubuntu 22.04 / 24.04 LTS, hardening de SSH y UFW, configuración de Docker, DNS, SSL con Caddy, ejecución de las 19 migraciones, certificados e-CF X.509 de DGII y copias de seguridad automáticas con cron.
- 📗 **[Manual Oficial de Usuario y Operaciones](file:///C:/emblema-nexus/docs/MANUAL_USUARIO.md)**: Manual exhaustivo de los 11 módulos del sistema: gestión de clientes (Cédula/RNC), expedientes y workflows, gestión documental, agenda y Kanban, finanzas B01/B02, facturación electrónica e-CF Ley 32-23, agrimensura UTM 19N y Tareas, inmobiliaria 2+1 y comisiones con retención ISR del 10%, portal de clientes y reportes oficiales 606/607/608.
- 📙 **[Arquitectura de Sistema](file:///C:/emblema-nexus/docs/ARCHITECTURE.md)**: Principios de diseño Server-First, aislamiento de inquilinos y flujos de datos.
- 📕 **[Modelo de Seguridad y Cumplimiento](file:///C:/emblema-nexus/docs/SECURITY.md)**: Tokens JWT, MFA, sanitización Zod y políticas de llaves criptográficas.
- 📓 **[Modelo de Base de Datos y Esquemas](file:///C:/emblema-nexus/docs/DATABASE.md)**: Catálogo de entidades relacionales y extensiones PostgreSQL.
- 📔 **[Matriz de Permisos y Roles RBAC](file:///C:/emblema-nexus/docs/PERMISSIONS.md)**: Definición de privilegios por módulo y jerarquía laboral.

---

## ⚖️ Licencia y Confidencialidad
Este software es propiedad exclusiva y confidencial de la firma operadora de **Emblema Nexus**. Queda prohibida su copia, redistribución o ingeniería inversa sin autorización expresa por escrito de la gerencia general, conforme a la legislación de propiedad intelectual y derecho de autor de la República Dominicana (Ley No. 65-00).
