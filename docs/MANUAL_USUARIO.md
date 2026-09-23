# Manual Oficial de Usuario y Operaciones — Emblema Nexus
**Plataforma Integral de Gestión Legal, Agrimensura y Bienes Raíces**  
*Manual Operativo Corporativo — Edición Oficial para la República Dominicana*  
*Cumplimiento Integral: Ley No. 108-05 de Registro Inmobiliario | Ley No. 32-23 de Facturación Electrónica | Código Tributario DGII*

---

## Tabla de Contenidos
1. [Arquitectura General, Acceso y Seguridad](#1-arquitectura-general-acceso-y-seguridad)
2. [Directorio Maestro de Clientes](#2-directorio-maestro-de-clientes)
3. [Gestión de Expedientes Legales y Workflows Procesales](#3-gestión-de-expedientes-legales-y-workflows-procesales)
4. [Gestión Documental, Nextcloud y Plantillas Notariales DOCX](#4-gestión-documental-nextcloud-y-plantillas-notariales-docx)
5. [Agenda, Audiencias Judiciales y Tablero Kanban de Tareas](#5-agenda-audiencias-judiciales-y-tablero-kanban-de-tareas)
6. [Finanzas y Facturación Tradicional (NCF B01 / B02)](#6-finanzas-y-facturación-tradicional-ncf-b01--b02)
7. [Facturación Electrónica e-CF (Ley 32-23 / DGII)](#7-facturación-electrónica-e-cf-ley-32-23--dgii)
8. [Agrimensura, Catastro Técnico y Trabajos de Campo (DNMC)](#8-agrimensura-catastro-técnico-y-trabajos-de-campo-dnmc)
9. [Inmobiliaria, Bienes Raíces y Liquidación de Comisiones con Retención ISR](#9-inmobiliaria-bienes-raíces-y-liquidación-de-comisiones-con-retención-isr)
10. [Portal de Clientes, Tracking TRK y Consulta Pública](#10-portal-de-clientes-tracking-trk-y-consulta-pública)
11. [Centro de Reportes Oficiales DGII (606, 607, 608) y Business Intelligence](#11-centro-de-reportes-oficiales-dgii-606-607-608-y-business-intelligence)

---

## 1. Arquitectura General, Acceso y Seguridad

Emblema Nexus es una solución de clase empresarial desarrollada específicamente para firmas multidisciplinarias dominicanas que integran servicios jurídicos, peritaje topográfico y corretaje de bienes raíces.

### 1.1 Inicio de Sesión y Autenticación Multi-Factor (MFA)
El acceso al sistema se realiza a través de la URL corporativa segura: `https://app.tudominio.com/login`.

1. **Credenciales Corporativas**: Ingrese su correo electrónico corporativo asignado y su contraseña de alta entropía.
2. **Segundo Factor de Autenticación (TOTP)**: Para usuarios con privilegios de gestión o contabilidad, el sistema solicitará el código temporal de 6 dígitos emitido por su aplicación de autenticación (Google Authenticator, Microsoft Authenticator o 1Password).
3. **Cierre de Sesión Automático**: Por razones de confidencialidad legal y cumplimiento bancario, las sesiones inactivas caducan automáticamente a los 30 minutos.

### 1.2 Estructura Multi-Empresa y Cambio de Sede
Emblema Nexus permite operar múltiples razones sociales o sucursales geográficas bajo una misma base de datos, garantizando aislamiento estricto mediante PostgreSQL Row Level Security (RLS).

En la barra superior de navegación, el usuario puede alternar entre las sedes autorizadas para su perfil:
- **Sede Principal Santo Domingo**: *Emblema Nexus S.R.L.* (RNC 1-31-89745-2)
- **Sucursal Zona Norte (Santiago)**: *Emblema Cibao S.R.L.* (RNC 1-32-45891-3)
- **Sucursal Zona Este (Punta Cana / Bávaro)**: *Emblema Turística S.R.L.* (RNC 1-33-78901-4)

> [!NOTE]
> Al cambiar de empresa, todos los expedientes, comprobantes fiscales, clientes y reportes se filtran de manera instantánea según el `company_id` activo.

### 1.3 Matriz de Roles y Permisos Granulares (RBAC)

| Rol del Sistema | Descripción de Responsabilidades | Módulos con Acceso Total | Restricciones de Seguridad |
| :--- | :--- | :--- | :--- |
| **Socio Director / Admin** | Control total técnico y legal de la firma. | Todos los módulos, configuración y RLS. | Ninguna. |
| **Abogado Senior / Titular** | Dirección procesal de casos y redacción de contratos. | Expedientes, Documentos, Clientes, Agenda. | No emite pagos ni altera configuraciones fiscales. |
| **Abogado Litigante** | Representación en audiencias y seguimiento de plazos. | Expedientes asignados, Audiencias, Tareas. | Solo lectura en finanzas del cliente. |
| **Agrimensor Líder (CODIA)** | Responsable técnico ante la DNMC y brigadas. | Agrimensura, Parcelas, Expedientes DNMC. | Sin acceso a módulos contables de la firma. |
| **Asesor Inmobiliario** | Captación, muestra de propiedades y promesas. | Inmobiliaria, Clientes, Agenda de Citas. | Solo visualiza sus comisiones personales. |
| **Contador / Financiero** | Facturación tradicional, e-CF DGII y reportes 606/607. | Finanzas, e-CF, Reportes BI, Caja y Bancos. | Sin permisos para modificar linderos o actos legales. |
| **Asistente Legal** | Carga de evidencias, recepción de llamadas y citas. | Agenda, Directorio de Clientes, Documentos. | No puede cerrar expedientes ni emitir NCFs. |

---

## 2. Directorio Maestro de Clientes

El módulo de Clientes centraliza la información patrimonial, fiscal y de contacto de personas físicas y jurídicas, sirviendo como núcleo para la apertura de expedientes y la emisión de comprobantes fiscales.

### 2.1 Personas Físicas (Cédula de Identidad y Electoral)
- **Documento de Identidad Principal**: Cédula dominicana de 11 dígitos numéricos sin guiones (ej. `00112345678`), validada automáticamente mediante el algoritmo de módulo 10 (Algoritmo de Luhn).
- **Extranjeros**: Selección de tipo `Pasaporte` con país de emisión.
- **Datos Requeridos**: Nombres, Apellidos, Estado Civil, Ocupación, Dirección Física Residencial, Teléfono Móvil y Correo Electrónico.

### 2.2 Personas Jurídicas (Registro Nacional de Contribuyentes - RNC)
- **RNC Dominicano**: Número de 9 dígitos asignado por la DGII.
- **Validación Oficial DGII en Tiempo Real**: El sistema incluye la función `RncLookup` que consulta la base de datos oficial de la DGII, autocompletando:
  - Razón Social registrada.
  - Nombre Comercial registrado.
  - Estado Tributario (Activo, Suspendido, Cancelado).
  - Actividad Económica principal.
  - Régimen de Tributación (Ordinario, RST, Exento).

### 2.3 Ficha 360° del Cliente
Al ingresar al perfil de un cliente (`/clientes/[id]`), el usuario dispone de pestañas consolidadas:
- **Expedientes Activos**: Historial de litigios, deslindes o contratos de alquiler vigentes.
- **Propiedades y Parcelas**: Inmuebles captados o parcelas catastrales registradas a su nombre.
- **Estado de Cuenta**: Facturas pendientes, pagos aplicados y cotizaciones emitidas.
- **Documentos de Identidad**: Copias digitales de cédulas, actas de nacimiento y certificados de vigencia mercantil de la Cámara de Comercio.

---

## 3. Gestión de Expedientes Legales y Workflows Procesales

El módulo de Expedientes (`/expedientes`) gestiona el ciclo de vida completo de los trámites legales de la firma, desde la consulta inicial hasta la sentencia ejecutoria o título definitivo.

```
+-----------------------------------------------------------------------------------+
|                        WORKFLOW PROCESAL DE EXPEDIENTES                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ FASE 1: APERTURA ]         [ FASE 2: INSTRUCCIÓN ]       [ FASE 3: RESOLUCIÓN ]|
|  * Admisión de caso           * Recolección probatoria       * Fallo / Sentencia  |
|  * Asignación Responsable     * Notificación Alguacil        * Emisión Certificado|
|  * Código LEG-YYYY-XXXX       * Audiencias fijadas           * Liquidación final  |
|               |                                |                          |       |
|               v                                v                          v       |
|  [ ETAPA: INICIAL ] --------> [ ETAPA: EN PROCESO ] ------> [ ETAPA: CERRADO ]   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 3.1 Nomenclatura Oficial de Expedientes
Cada caso creado recibe una numeración secuencial unívoca e inmutable por área:
- Legal / Litigios: `LEG-2026-0001`
- Agrimensura / Mensuras: `AGR-2026-0001`
- Inmobiliario / Transacciones: `INM-2026-0001`

### 3.2 Tipologías de Casos y Plantillas de Etapas Procesales

| Área | Tipo de Trámite | Etapas Procesales Típicas | Órgano o Tribunal Competente |
| :--- | :--- | :--- | :--- |
| **Inmobiliario** | Deslinde Judicial | 1. Contrato y Poder Notarial<br>2. Trabajos Topográficos<br>3. Notificación a Colindantes<br>4. Aprobación Técnica DNMC<br>5. Demanda en Deslinde<br>6. Fallo y Emisión de Título | Tribunal de Tierras de Jurisdicción Original |
| **Inmobiliario** | Saneamiento | 1. Reclamo de Posesión<br>2. Mensura Catastral<br>3. Publicación Avisos Oficiales<br>4. Audiencia de Saneamiento<br>5. Dictamen Abogado del Estado | Tribunal de Tierras |
| **Civil** | Cobro de Pesos | 1. Intimación de Pago Notarial<br>2. Demanda Principal<br>3. Audiencia de Pruebas<br>4. Conclusiones al Fondo<br>5. Sentencia y Ejecución | Juzgado de Primera Instancia Civil y Comercial |
| **Inmobiliario** | Partición de Bienes | 1. Inventario Notarial<br>2. Determinación de Herederos<br>3. Liquidación de Impuesto Sucesoral<br>4. Transferencia de Inmuebles | Tribunal Civil o Notaría Pública |

### 3.3 Control de Plazos Legales y Vencimientos
El sistema cuenta con un motor de cálculo de plazos de orden público y perentorios:
- Plazos en días francos (artículo 1033 del Código de Procedimiento Civil dominicano).
- Plazos de 30 días reglamentarios para respuestas a Oficios de Observación de la DNMC.
- Plazo de 30 días para objeciones tras la publicación de avisos de deslinde en el periódico.
- Alertas visuales: Amarillo (7 días previos al vencimiento), Naranja (3 días), Rojo (Vencido).

### 3.4 Vinculación de Participantes Procesales
Dentro de cada expediente se registran con su rol procesal:
- **Cliente / Demandante / Solicitante**
- **Contraparte / Demandado / Reclamante**
- **Abogados Representantes de la Contraparte**
- **Notario Público Actuante** (con mención de matrícula de Notario)
- **Agrimensor Asignado** (con número de colegiatura CODIA)
- **Tribunal o Sala Judicial** (identificación del juez y número de secretaría)

---

## 4. Gestión Documental, Nextcloud y Plantillas Notariales DOCX

Emblema Nexus integra un sistema de almacenamiento de grado notarial sincronizado con **Nextcloud** vía el estándar WebDAV.

### 4.1 Estructura Automatizada de Almacenamiento
Al crearse un expediente o cliente, el sistema aprovisiona la jerarquía de carpetas en Nextcloud de forma automática:
```
/EmblemaNexus/
  |-- Expedientes/
  |     |-- LEG-2026-0042_Deslinde_Familia_Perez/
  |     |     |-- 01_Actos_Notariales/
  |     |     |-- 02_Planos_y_Coordenadas/
  |     |     |-- 03_Notificaciones_Alguacil/
  |     |     |-- 04_Sentencias_y_Oficios/
  |-- Plantillas/
  |-- Clientes/
```

### 4.2 Control de Versiones y Verificación de Integridad SHA-256
- Cada vez que se sube una revisión de un contrato o informe pericial, se incrementa la versión (`v1.0`, `v1.1`, `v2.0`).
- El sistema calcula y almacena el hash criptográfico **SHA-256** del archivo en la tabla `document_versions`.
- **Botón de Verificación de Integridad**: Compara en milisegundos el hash del archivo residente en Nextcloud con el hash original registrado en la base de datos para garantizar que ningún documento legal haya sido alterado fuera del ERP.

### 4.3 Generador Dinámico de Plantillas DOCX (`docx-templates`)
Permite generar documentos legales listos para firma notarial en formato Microsoft Word (`.docx`), inyectando automáticamente las variables del cliente, la parcela o el expediente.

#### Plantillas Oficiales Incorporadas:
1. **Acto de Notoriedad para Determinación de Herederos**: Datos de los causantes, comparecencia de siete testigos idóneos dominicanos, generales de ley y descripción de la masa hereditaria.
2. **Contrato de Promesa de Compraventa Inmobiliaria**: Identificación del inmueble, matrícula de título, designación catastral, precio en USD o DOP, esquema de pagos contra avance de obra y penalidades por incumplimiento.
3. **Poder Notarial de Representación Legal**: Autorización para representación ante tribunales de tierras, Dirección General de Aduanas, DGII y DNMC.
4. **Acto de Colindancia Notarial**: Constancia de trabajos de campo, conformidad de los colindantes norte, sur, este y oeste, y firma del Agrimensor actuante.

---

## 5. Agenda, Audiencias Judiciales y Tablero Kanban de Tareas

### 5.1 Calendario Unificado de la Firma (`/agenda`)
El calendario proporciona vista mensual, semanal y diaria con filtros por abogado o agrimensor.

#### Categorías de Eventos:
- **Audiencia Judicial**: Fijación de audiencia en Juzgado de Paz, Tribunal de Tierras, Corte de Apelación o Suprema Corte de Justicia. Incluye sala, rol y expediente.
- **Cita con Cliente**: Entrevistas presenciales o virtuales (con enlace a Zoom o Google Meet).
- **Mensura de Campo**: Salida de brigada topográfica para levantamiento de coordenadas.
- **Vencimiento de Plazo Legal**: Fechas límites procesales improrrogables.
- **Reunión Interna**: Comités de socios o planificación de área.

### 5.2 Tablero Kanban de Tareas
Permite la gestión ágil del despacho visualizando el flujo de trabajo en 4 columnas:
1. **Pendiente**: Tareas creadas pendientes de iniciar.
2. **En Progreso**: En ejecución activa por el profesional asignado.
3. **En Revisión**: Sometidas a revisión de un Abogado Senior o Agrimensor Titular.
4. **Completado**: Verificadas y concluidas.

Cada tarjeta muestra:
- Prioridad con código de color: *Baja (Gris), Media (Azul), Alta (Ámbar), Urgente (Rojo)*.
- Expediente legal vinculado.
- Fecha límite de cumplimiento.
- Miembro del equipo responsable con avatar visual.

---

## 6. Finanzas y Facturación Tradicional (NCF B01 / B02)

Para clientes o transacciones que operan bajo el régimen de Comprobantes Fiscales tradicionales (Previo a la obligatoriedad total de e-CF):

### 6.1 Módulo de Cotizaciones y Conversión a Factura
1. Ingrese a `/finanzas` y presione **Nueva Cotización**.
2. Seleccione el cliente, moneda (DOP o USD), validez (ej. 15 días) y desglose de servicios (Honorarios por Deslinde, Tasas Registrales, Sellos de Ley).
3. Una vez aprobada por el cliente, presione **Convertir en Factura**: el sistema traspasa los ítems y genera automáticamente la cuenta por cobrar y el comprobante fiscal correspondiente.

### 6.2 Tipos de Comprobantes Tradicionales (NCF Serie B)
- **NCF B01 (Factura de Crédito Fiscal)**: Utilizado para empresas y personas físicas registradas en la DGII que requieren deducir gastos para fines del Impuesto sobre la Renta (ISR) y adelantar ITBIS. Estructura: 1 letra + 10 dígitos (ej. `B0100000045`).
- **NCF B02 (Factura de Consumo)**: Emitido a personas físicas o consumidores finales que no usarán el comprobante para crédito fiscal.

### 6.3 Control de Cuentas por Cobrar (CxC) y Pagos
- Registro de pagos parciales (abonos a honorarios).
- Métodos soportados: Efectivo, Transferencia Bancaria (Banco de Reservas, Banco Popular Dominicano, Banco BHD), Cheque de Gerencia.
- Conciliación automática de saldo deudor e impresión de Recibos de Caja oficiales.

### 6.4 Control de Gastos y Costos Directos por Expediente
Permite cargar a cada expediente judicial los desembolsos realizados en su ejecución:
- Tasas de la Dirección Nacional de Mensuras Catastrales (DNMC).
- Sellos de la Ley 33-91 del Colegio de Abogados de la República Dominicana (CARD).
- Honorarios ministeriales de Notarios y Alguaciles.
- Viáticos y transporte de las brigadas de topografía.

---

## 7. Facturación Electrónica e-CF (Ley 32-23 / DGII)

Emblema Nexus incorpora un motor homologado para la emisión y recepción de Comprobantes Fiscales Electrónicos según la **Ley No. 32-23** y la **Norma General 06-2018** de la DGII.

```
+-------------------------------------------------------------------------------------------------+
|                       FLUJO DE EMISIÓN DE FACTURA ELECTRÓNICA e-CF                              |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  [ 1. FACTURA ERP ] -----> [ 2. XML e-CF ] -----> [ 3. FIRMA DIGITAL ] -----> [ 4. WEB SERVICE  |
|    Items, ITBIS 18%,        Esquema XSD Oficial     Certificado X.509         DGII RECEPCIÓN ]  |
|    RNC Emisor/Cliente       DGII e-CF               XML-DSig RSA-SHA256              |          |
|                                                                                      v          |
|  [ 7. REPRESENTACIÓN ] <-- [ 6. ACEPTADO DGII ] <-- [ 5. TIMBRADO ASÍNCRONO ] <----+            |
|    IMPRESA (RI)              Estado oficial          Respuesta con TrackID                      |
|    Código QR Oficial         Código Seguridad        Verificación cada 60s                      |
|    Seguridad 6 dígitos       6 caracteres HEX                                                   |
+-------------------------------------------------------------------------------------------------+
```

### 7.1 Tipos de e-CF Soportados

| Código e-CF | Nombre Oficial DGII | RNC Requerido | Uso Principal en la Firma |
| :--- | :--- | :--- | :--- |
| **E31** | Factura de Crédito Fiscal Electrónica | Obligatorio (9 u 11 dígitos) | Honorarios legales facturados a empresas deducibles de ISR. |
| **E32** | Factura de Consumo Electrónica | Opcional (< RD$250k) | Servicios legales prestados a particulares y personas físicas. |
| **E34** | Nota de Crédito Electrónica | Obligatorio | Devoluciones, rebajas o anulación de montos de un e-CF previo. |
| **E44** | Regímenes Especiales Electrónico | Obligatorio | Facturación a empresas de Zona Franca o Embajadas (Exentas). |
| **E45** | Gubernamental Electrónico | Obligatorio | Servicios legales o catastrales prestados a Ministerios o al Estado. |

### 7.2 Código de Seguridad Oficial y Resumen Criptográfico
- Cada e-CF emitido genera un resumen criptográfico mediante el algoritmo **RSA con SHA-256** sobre la firma XML-DSig canónica (C14N).
- El **Código de Seguridad** consiste en los primeros **6 caracteres alfanuméricos en mayúsculas** del digest hexadecimal de la firma (ej. `A79F2C`).
- Este código se imprime visiblemente en la Representación Impresa (RI) y forma parte del enlace oficial de validación.

### 7.3 Representación Impresa (RI) y Código QR Oficial
El botón **Ver RI / Imprimir e-CF** renderiza el formato reglamentario que incluye:
- Membrete con Razón Social, RNC emisor, Dirección Fiscal y Teléfono.
- RNC / Cédula y Razón Social del Comprador.
- Secuencia oficial de e-NCF (ej. `E3100000089`).
- Fecha de emisión y Fecha de vencimiento de la secuencia fiscal.
- Desglose de ítems, ITBIS Facturado (18%), Subtotal y Total en DOP o USD.
- **Código QR Bidimensional**: Genera la URL oficial de consulta ante la DGII:
  `https://ecf.dgii.gov.do/fe/consultatimbre?RncEmisor=131897452&RncComprador=101234567&ENCF=E3100000089&FechaEmision=22-09-2026&MontoTotal=118000.00&CodigoSeguridad=A79F2C`

### 7.4 Buzón B2B y Recepción Comercial de e-CF de Proveedores
En `/finanzas?tab=ecf-receptions`, la firma administra las facturas electrónicas recibidas de sus proveedores (notarías externas, suplidores de tecnología, peritos):
1. **Validación Automática de Firma**: Verifica la validez del certificado del emisor.
2. **Acuse de Recibo Comercial B2B**: Permite enviar a la DGII la conformidad comercial del comprobante:
   - `Aprobación Comercial B2B`: Acepta los bienes o servicios facturados.
   - `Rechazo Comercial B2B`: Rechaza la factura por discrepancias en precios o cantidades.

---

## 8. Agrimensura, Catastro Técnico y Trabajos de Campo (DNMC)

El módulo de Agrimensura (`/agrimensura`) está diseñado conforme a los reglamentos de la Ley No. 108-05 de Registro Inmobiliario de la República Dominicana.

### 8.1 Sistema Geodésico y Coordenadas Oficiales
- **Proyección Cartográfica**: Universal Transversa de Mercator (UTM), **Zona 19 Norte**.
- **Datum Geodésico**: **WGS84** (World Geodetic System 1984), el estándar obligatorio para levantamientos catastrales en la República Dominicana.
- **Puntos Coordenados**:
  - Coordenada Norte ($Y$): en metros con 3 decimales (milimétrico).
  - Coordenada Este ($X$): en metros con 3 decimales.
  - Cota Ortométrica ($Z$): elevación en metros sobre el nivel medio del mar (msnm).

### 8.2 Unidad Agraria Oficial: La Tarea Dominicana
En la República Dominicana, la superficie de terrenos rurales y suburbanos se expresa tradicionalmente en **Tareas**.
El sistema aplica la constante exacta de conversión legal:

$$\mathbf{1\text{ Tarea Dominicana} = 628.86\text{ m}^2}$$

$$\text{Superficie en Tareas} = \frac{\text{Superficie en Metros Cuadrados}}{628.86}$$

El visor de parcelas muestra de forma simultánea el área en $\text{m}^2$ y en $\text{Tareas}$ con dos cifras decimales (ej. $12,577.20\text{ m}^2 = 20.00\text{ Tareas}$).

### 8.3 Ficha de Parcela y Visor Interactivo de Polígonos
Al consultar una parcela catastral (`/agrimensura/parcelas`):
- **Identificación Catastral**: Distrito Catastral (ej. D.C. 03), Porción, Manzana, Solar, Parcela Matriz y Matrícula de Certificado de Título.
- **Visor SVG Interactivo**: Dibuja el polígono del terreno a escala automática, resaltando vértices con simbología técnica normalizada:
  - `HITO_CONCRETO`: Monumento de concreto con placa o varilla central.
  - `VARILLA`: Varilla de acero corrugado de 3/8" o 1/2".
  - `CLAVO`: Clavo de acero en asfalto o concreto.
  - `ESQ_MURO`: Esquina de muro de mampostería existente.
  - `PUNTO_GPS`: Vértice georreferenciado con receptor GNSS RTK de doble frecuencia.
- **Tabla de Derroteros y Linderos**: Lista ordenada de vértices ($P_1 \to P_2 \dots P_n$) con azimut, distancia en metros y colindancias norte, sur, este y oeste.

### 8.4 Importador Masivo de Coordenadas Topográficas
El módulo permite importar archivos exportados por colectores de campo (Trimble Access, Leica Captivate, Topcon Magnet Field):
- Formatos soportados: `.txt`, `.csv` delimitados por comas o tabuladores.
- Formato de columnas estándar: `Punto,Norte,Este,Elevacion,Codigo`.

### 8.5 Expedientes Catastrales ante la DNMC
Seguimiento reglamentario ante las 4 Direcciones Regionales de Mensuras Catastrales (Regional Central, Regional Norte, Regional Este, Regional Noreste):
- **Operaciones Catastrales**: Deslinde, Subdivisión, Refundición, Saneamiento, Mensura por Posesión, Actualización Parcelaria.
- **Plazo de Objeción de Avisos**: Contador regresivo de 30 días a partir de la publicación en el periódico de circulación nacional.
- **Control de Oficios de Observaciones**: Registro del número de oficio emitido por los revisores de la DNMC y cómputo del plazo fatal de 30 días para subsanar observaciones técnicas.

### 8.6 Brigadas de Campo y Acta Notarial de Linderos
Planificación operativa de cuadrillas:
- Asignación de personal: Agrimensor Líder (CODIA), Topógrafo, Cadeneros y Chofer de apoyo.
- Asignación de equipos con control de calibración vigente (Antenas GNSS RTK, Estación Total, Dron de fotogrametría).
- **Acta de Linderos**: Registro de testigos y colindantes presentes en el terreno, indicando nombres, cédula dominicana de 11 dígitos y condición de *Conforme*, *Ausente* u *Opositor*.

---

## 9. Inmobiliaria, Bienes Raíces y Liquidación de Comisiones con Retención ISR

El módulo de Bienes Raíces (`/inmobiliaria`) vincula de forma única la gestión comercial de propiedades con el respaldo jurídico y catastral de la firma.

### 9.1 Portafolio y Captación de Propiedades
- Registro de casas, apartamentos, villas turísticas, penthouses, locales comerciales y solares.
- Estado del inmueble: *Disponible, Reservada, Bajo Contrato, Alquilada, Vendida*.
- **Garantía de Debida Diligencia (Due Diligence)**: Cada inmueble puede vincularse a su Parcela Catastral y Expediente Legal de deslinde o verificación de título, asegurando que la propiedad esté libre de gravámenes, oposiciones o duplicidad registral.

### 9.2 Contratos de Arrendamiento: El Esquema Dominicano "2 + 1"
Para contratos de alquiler residencial y comercial, Emblema Nexus aplica el estándar de uso y costumbre dominicano:
- **Dos (2) meses de Depósito de Garantía**: Custodiados por la parte propietaria para responder por posibles deterioros en el inmueble al concluir el término.
- **Un (1) mes de Pago por Adelantado**: Correspondiente al canon del primer mes de ocupación.
- **Cláusulas de Cobro**: Definición del día del mes para el pago de la renta (ej. día 5), días de gracia (ej. 5 días calendario) y porcentaje de recargo por mora (ej. 5% acumulativo).

### 9.3 Promesas de Venta y Arras
- Registro de contratos de promesa sinalagmática de compraventa.
- Cronograma de desembolsos vinculado al avance físico de construcción o hitos legales (obtención de aprobación de planos en DNMC o régimen de condominio).

### 9.4 Muestra de Propiedades (Showings) y Feedback de Clientes
- Programación de citas de muestra de inmuebles con prospectos compradores o arrendatarios.
- Formulario digital de feedback: nivel de interés (*Alto, Medio, Bajo, Descartado*), comentarios sobre precio y registro formal de ofertas presentadas.

### 9.5 Liquidación de Comisiones de Corretaje y Retención del 10% de ISR
Conforme al Código Tributario de la República Dominicana (Ley No. 11-92 y Normas Generales de la DGII), cuando una persona jurídica (la firma) paga comisiones por servicios de corretaje inmobiliario a una persona física (asesor independiente), **debe retener obligatoriamente el 10% del Impuesto sobre la Renta (ISR)**.

#### Fórmulas de Cálculo Aplicadas:

$$\text{Comisión Bruta} = \text{Monto Transacción} \times \%\text{Comisión Acordada}$$

$$\text{Retención ISR 10\%} = \text{Comisión Bruta} \times 0.10$$

$$\text{Comisión Neta a Desembolsar} = \text{Comisión Bruta} - \text{Retención ISR 10\%}$$

#### Ejemplo Práctico:
- Venta de villa en Punta Cana por **USD \$300,000.00**.
- Comisión pactada del **5%**: Comisión Bruta = **USD \$15,000.00**.
- Retención de ISR del 10%: Retención = **USD \$1,500.00** (a ser declarada en el formato 606 y remitida a la DGII en el IR-17).
- Pago neto transferido al agente inmobiliario: **USD \$13,500.00**.

---

## 10. Portal de Clientes, Tracking TRK y Consulta Pública

El portal de autoservicio permite a los clientes corporativos y particulares consultar el avance de sus trámites sin necesidad de llamar al despacho o acudir a la oficina.

```
+-------------------------------------------------------------------------------------------------+
|                                 PORTAL PÚBLICO & PRIVADO DE CLIENTES                            |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   [ CONSULTA PÚBLICA ]                     [ INGRESO CLIENTE PRIVADO ]                          |
|   URL: /portal/tracking                    URL: /portal/login                                   |
|   Input: Código TRK-2026-00042             Método: Magic Link / Token PIN                       |
|                 |                                         |                                     |
|                 v                                         v                                     |
|   +----------------------------+           +-----------------------------------------------+    |
|   | TIMELINE PÚBLICA           |           | DASHBOARD PERSONALIZADO                       |    |
|   | * Recepción de Documentos  |           | * Todos sus expedientes legales               |    |
|   | * Mensura de Campo         |           | * Descarga de planos y actos notariales       |    |
|   | * Aprobación en la DNMC    |           | * Carga de Requerimientos (Cédulas, Títulos)  |    |
|   | * Título en Registro       |           | * Consulta de Facturas y e-CF con QR          |    |
|   +----------------------------+           +-----------------------------------------------+    |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
```

### 10.1 Seguimiento Público con Código de Tracking (`TRK-YYYY-XXXXX`)
- Cada expediente posee un código alfanumérico público único (ejemplo: `TRK-2026-00042`).
- En `/portal/tracking`, cualquier parte interesada puede ingresar el código y verificar en tiempo real:
  - Título y categoría del expediente.
  - Porcentaje de avance global (0% a 100%).
  - Línea de tiempo con hitos procesales completados, en progreso y pendientes.
  - Tribunal u órgano registral donde se encuentra radicado el expediente.

### 10.2 Acceso Seguro para Clientes (Magic Links y PIN)
Para consultar documentación confidencial o facturación, el cliente ingresa mediante:
- **Magic Link Cifrado**: Enlace seguro enviado por correo electrónico con token de un solo uso válido por 24 horas.
- **PIN de Seguridad**: Código de 6 dígitos configurado en la ficha del cliente.

### 10.3 Carga de Requerimientos Documentales
Cuando el abogado o agrimensor requiere un documento del cliente (ejemplo: "Copia de Cédula de los Herederos", "Recibo de IPI al día expedido por DGII"):
1. Se crea un requerimiento con fecha límite en el expediente.
2. El cliente recibe una notificación y visualiza el requerimiento en su portal privado.
3. El cliente arrastra el archivo (PDF, JPG, PNG de hasta 25 MB).
4. El archivo se sube automáticamente a la carpeta correspondiente en Nextcloud y notifica al abogado responsable.

---

## 11. Centro de Reportes Oficiales DGII (606, 607, 608) y Business Intelligence

El módulo de Reportes (`/reportes`) provee las herramientas impositivas obligatorias de la DGII y cuadros de mando gerenciales para los socios de la firma.

### 11.1 Generación de Formatos Oficiales para la DGII (Archivos Planos `.txt`)

#### 1. Formato 606 — Reporte de Compras de Bienes y Servicios
Reporta mensualmente a la DGII todas las compras y gastos devengados por la firma:
- Estructura delimitada por plecas (`|`) según la especificación técnica vigente de la DGII.
- Campos calculados:
  - RNC o Cédula del Proveedor y Tipo de Identificación (`1` = RNC, `2` = Cédula, `3` = Pasaporte).
  - Tipo de Bienes y Servicios comprados (Códigos `01` a `11`, ej. `02` Gastos por Trabajos y Servicios, `03` Arrendamientos).
  - NCF o e-CF del Comprobante.
  - Fecha del comprobante y Fecha de pago (`AAAAMMDD`).
  - Monto facturado en Servicios y Bienes.
  - ITBIS facturado, retenido y llevado al costo.
  - Retención de Impuesto sobre la Renta (ISR) practicada (ej. 10% por honorarios o comisiones).
  - Forma de Pago (`01` Efectivo, `02` Cheque/Transferencia, `03` Tarjeta, `04` Crédito).

#### 2. Formato 607 — Reporte de Ventas de Bienes y Servicios
Reporta todos los ingresos facturados por la firma a clientes:
- Detalle de facturas con crédito fiscal (E31/B01), consumo (E32/B02) y notas de crédito (E34/B04).
- Desglose de ingresos por operaciones no financieras (Código `01`).
- Desglose de medios de pago recibidos (Efectivo, Tarjeta, Transferencia o Venta a Crédito).

#### 3. Formato 608 — Reporte de Comprobantes Anulados
Reporta las secuencias de comprobantes cancelados o descartados:
- Número de comprobante NCF o e-CF anulado.
- Fecha de anulación (`AAAAMMDD`).
- Código oficial de motivo de anulación (`01` Deterioro, `02` Error de Impresión, `04` Duplicidad, `05` Corrección de Información, `09` Error en Secuencia).

> [!TIP]
> Los archivos generados pueden descargarse en formato `.txt` listo para ser validado directamente en el programa local oficial de la DGII (*Validador 606 / 607*) antes de su carga final en la Oficina Virtual (OFV).

### 11.2 Analítica de Rentabilidad por Expediente Judicial y Catastral
Permite a los directores evaluar el margen financiero real de cada caso:
$$\text{Margen Bruto del Expediente} = \text{Honorarios Facturados} - \text{Gastos Directos (Tasas, Viáticos, Notaría)}$$
$$\%\text{ Margen} = \left(\frac{\text{Margen Bruto}}{\text{Honorarios Facturados}}\right) \times 100$$
Visualización gráfica de los expedientes más rentables por tipología (*Deslindes, Saneamientos, Litigios Civiles*).

### 11.3 Métricas de Desempeño y Productividad del Personal
- Casos activos y expedientes cerrados por cada Abogado y Agrimensor.
- Tasa de cumplimiento de plazos legales (SLA de vencimientos).
- Total de honorarios facturados y comisiones generadas en el período.

### 11.4 Exportador Universal de Datos a Excel / CSV
Permite seleccionar cualquier módulo (Clientes, Facturas, Expedientes, Parcelas, Inmuebles, Contratos), elegir las columnas deseadas y exportar de forma instantánea a archivos compatibles con **Microsoft Excel** y formato JSON para auditorías contables externas.

---
*Manual redactado y certificado por el Equipo de Documentación Técnica & Operaciones de Emblema Nexus.*
