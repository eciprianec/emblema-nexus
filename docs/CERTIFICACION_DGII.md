# Plan de certificación como emisor electrónico

Fecha: 3 de noviembre de 2026. Basado en *Proceso de Certificación para ser Emisor Electrónico* (DGII, julio 2025), la documentación técnica publicada por la DGII y una revisión del código. Nada se ha probado aún contra los servicios de la DGII.

Las duraciones son estimaciones, no mediciones. La DGII no publica plazos para los pasos que revisa a mano.

## Conclusión

- **La DGII autoriza a la empresa (por RNC), no al programa.** Valida el sistema durante el proceso, pero no hay una certificación separada del software. Solo un proveedor certifica su software como tal.
- **Hoy el sistema no puede pasar del paso 1.** No genera XML, no firma, no se comunica con la DGII y no recibe comprobantes.
- **Tiempo probable: 10 a 16 semanas** con un desarrollador senior. Mejor caso, unas 8. Con rechazos repetidos o colas largas, 6 meses o más.
- **No llega al plazo legal.** Hace falta una vía para emitir mientras tanto (fase 0).

## Alcance de esta empresa

Hoy emite serie B a mano y ya tiene usuario de la Oficina Virtual. El responsable la indica como pequeña o micro, así que su fecha límite es el **15 de noviembre de 2026**.

| Necesidad | Tipo e-CF | Estado en el sistema |
| --- | --- | --- |
| Valor fiscal | E31 | Modelado |
| Consumidor final | E32 (y RFCE si es menor de RD$250,000) | Modelado, sin RFCE |
| Gubernamental | E45 | Modelado |
| Notas de crédito y devoluciones | E34 | Modelado |
| Notas de débito | E33 | Modelado |
| Facturas de proveedores con valor fiscal | Las emite el proveedor | **No existe de forma real** |

**Facturas de proveedores.** Gastos guarda solo en el navegador, y `DgiiReportService` inventa un NCF cuando falta. Hace falta un módulo real con dos entradas:
- **Registro manual:** para comprobantes en papel o serie B de proveedores que aún los usen, con validación de RNC y NCF.
- **Recepción electrónica:** los e-CF que lleguen a `/fe/recepcion`, que deberían aparecer en esa misma lista y poder aprobarse o rechazarse.

Con esa base, el formato 606 sale de datos reales. Este módulo no lo exige la certificación, pero las compras con crédito de ITBIS dependen de que esté bien hecho. Estimado: 1.5 a 2.5 persona-semanas, aparte del total de abajo.

**Otros tipos.** Aunque la empresa use pocos, los indicios apuntan a que el set de pruebas incluye todos los tipos. El generador debe cubrirlos, aunque la emisión diaria muestre solo los anteriores. Si compra a informales o tiene pagos al exterior, necesitará también E41 o E47: confírmalo con el contador.

## Dónde estamos, paso a paso

| Paso DGII | Quién | Hoy | Falta |
| --- | --- | --- | --- |
| Requisitos y formulario FI-GDF-016 | Empresa | Sin confirmar | Ver requisitos |
| 1. Postulación | Empresa + sistema | Sin URL públicas | Servicios `/fe/*`; firmar el XML que genera el portal |
| 2. Set de e-CF | Sistema | Nada | Leer el Excel, generar XML, firmar, enviar, consultar estado |
| 3. Set de aprobaciones comerciales | Sistema | Nada | Generar, firmar y enviar ACECF |
| 4. Simulación | Sistema | Datos parciales | Completar el mapeo, resúmenes de consumo (RFCE) |
| 5 y 6. Representación impresa | Sistema + DGII | No califica; el QR es falso | Formato oficial con QR real en PDF |
| 7 y 8. URL de prueba | Empresa | Nada | Dominio propio y servicios activos |
| 9. Recibir e-CF y dar acuse | Sistema | Nada | Recepción con acuse firmado al instante |
| 10 y 11. Recibir aprobaciones | Sistema | Nada | Recepción y respuesta |
| 12. URL de producción | Empresa | Nada | Registrarlas en el portal |
| 13. Declaración jurada | Representante | Nada | Firmarla; es bajo juramento |
| 14. Verificación de estatus | Empresa | Sin confirmar | Estar al día en impuestos |

**Se puede aprovechar:** el comprobante neutro, los cálculos con sus pruebas, los catálogos, `toEcfDocument` como punto de partida y `buildTimbreUrl`.

**No se debe usar:**
- `src/services/dgii/`: contradice el formato oficial.
- `QrCodeSvg`: no se puede escanear.
- `ecf_configs.certificate_data`: el certificado no debe guardarse ahí.
- La tabla `invoices` para pruebas: un número de prueba bloquearía para siempre el número real, y una factura emitida no se puede borrar.

## Requisitos de la empresa, en orden

| # | Requisito | Plazo conocido |
| --- | --- | --- |
| 1 | Confirmar la categoría fiscal del RNC y estar al día en impuestos. Se valida al postular y otra vez en el paso 14 | Desconocido si hay deudas |
| 2 | Decidir cómo emitir mientras tanto (fase 0) | Desconocido |
| 3 | Clave de Oficina Virtual y Alta NCF | Desconocido |
| 4 | Designar al Usuario Administrador e-CF, antes de la solicitud de emisor: figura en el RNC con una relación permitida y tiene su propia clave de Oficina Virtual. Se hace en la Oficina Virtual (*Solicitudes → Actualización al RNC*) o presencial con carta. Cambiarlo durante la postulación obliga a cancelarla | Sin plazo publicado |
| 5 | Comprar su certificado digital para Procedimiento Tributario. La guía de mayo de 2026 nombra a Viafirma, Digifirma y Novofirma. El gratuito del Facturador Gratuito no sirve | Un vendedor habla de 48 a 72 horas; no es oficial |
| 6 | Presentar el formulario FI-GDF-016 en la Oficina Virtual | 1 día laborable, según una respuesta de la DGII de hace unos 2 años |
| 7 | Dominio propio y planes de pago de Vercel y Supabase | Horas; precios sin revisar |
| 8 | Elegir datos reales representativos para la simulación, y confirmar que la razón social coincida letra por letra con el RNC | Interno |
| 9 | Firmar la declaración jurada | Al final |

**Por qué cambiar de plan:** la DGII puede llamar a tus servicios en cualquier momento. Supabase Free pausa el proyecto tras 7 días sin actividad y no hace copias automáticas, y Vercel Hobby no permite uso comercial.

## Plan

### Fase 0: emitir legalmente mientras tanto (esta semana)

1. Confirmar la categoría con tu contador. Según la DGII, Grandes Locales y Medianos emiten solo e-CF desde el 1 de noviembre, y Pequeños, Micro y No Clasificados desde el 15 de noviembre.
2. Elegir una vía temporal:
   - **Facturador Gratuito:** hasta unas 150 facturas al mes, no siendo Gran Contribuyente Nacional, y con límites en moneda e impuestos. Desde un sistema propio no se puede volver a él. Confirma los límites vigentes.
   - **Proveedor certificado:** si no cabes en el gratuito. Pasar luego a sistema propio exige certificarte de nuevo.
3. Preguntar por escrito a facturacionelectronica@dgii.gov.do si se puede usar esa vía mientras corre una postulación con sistema propio. No está documentado. **Espera la respuesta antes de postular:** una postulación abierta podría tener que cancelarse para pedir el Facturador Gratuito.

### Fase 1: requisitos y prueba de firma (semanas 1 y 2)

4. Cumplir los requisitos 3 a 7 y presentar el FI-GDF-016. Sin solicitud aprobada no se puede probar nada contra la DGII.
5. Probar la firma con el certificado real en el ambiente de pruebas: semilla, token y un e-CF tipo 31. Es el mayor riesgo técnico, así que va primero.

### Fase 2: construir sin riesgo de reinicio (semanas 2 a 8)

6. Generar XML en el orden de los XSD oficiales, firmar con XML-DSig y conectar con la DGII.
7. Crear el apartado **Certificación** (ver abajo).
8. Publicar los servicios de recepción y aprobación en `/fe/*`, sin distinguir mayúsculas, con acuse firmado al instante.
9. Hacer la representación impresa con QR real.
10. Ensayar todo en el ambiente de pruebas: los 10 tipos (31 a 34, 41, 43 a 47), resúmenes de consumo y aprobaciones.

### Fase 3: certificación, con revisión humana

11. **Paso 1:** postular solo con el representante, el certificado y el dominio ya definidos. Declarar el software como "desarrollado de manera interna".
12. **Pasos 2 y 3:** terminar el lector al ver el Excel real. Descargarlo una sola vez, porque un tercero dice que los datos cambian en cada descarga (sin verificar).
13. **Al enviar:**
    - Validar cada documento antes de mandarlo.
    - Enviar uno a la vez, con aprobación humana del lote y sin reintentos automáticos.
    - Si hay un timeout, consultar antes de reenviar: duplicar puede causar un rechazo.
    - Detenerse en el primer Rechazado o Aceptado Condicional. Un Rechazado obliga a reiniciar el set.
14. **Pasos 4 a 6:** simulación y PDF. La revisión de la DGII es manual; algunos usuarios reportan varios días por ronda.
15. **Pasos 7 a 11:** antes de declararse listo, probar los servicios y evitar arranques lentos. Terceros reportan que un timeout puede reiniciar estas pruebas.
16. **Pasos 12 a 14:** URL de producción, declaración jurada y estatus.

### Fase 4: emisión real (1.5 a 2.5 semanas de desarrollo)

Certificarse no activa la emisión. Hace falta:
- Solicitar las secuencias de producción en la Oficina Virtual.
- Cambiar el flujo a estados asíncronos: enviada, aceptada o rechazada, con la regla `secuenciaUtilizada`.
- Implementar `DirectEcfIssuer` y los resúmenes de consumo en producción.

### Fase 5: vender a otras empresas

"Desarrollado de manera interna" certifica a tu empresa; no te autoriza como proveedor. Para vender hace falta una autorización aparte (formulario FI-GDF-017). Según respuestas de la DGII, pide:
- Ser emisor electrónico.
- Tener actividad económica de venta o desarrollo de software.
- Tener al menos 3 contribuyentes certificados con el software, distintos de ti.
- Contar con políticas de seguridad y continuidad, bitácora y respaldos.

Custodiar certificados de clientes añade requisitos relacionados con INDOTEL. Con un proveedor certificado, cada cliente omite las pruebas de datos y de comunicación; hasta entonces, cada uno hace el proceso completo.

## El apartado Certificación

Propuesta para este repositorio, para una sola empresa:

- **Rutas:** `src/app/(app)/finanzas/certificacion/` para las pantallas y `src/app/fe/` para los servicios públicos. `src/middleware.ts` pasa a `src/proxy.ts`, porque hoy `/fe/*` redirige al login.
- **Pantallas:**
  - Seguimiento de los 14 pasos, con evidencia.
  - Datos del software y URL para copiar al portal.
  - Carga del Excel, lista de documentos, envío y estado.
  - Simulación y representación impresa.
  - Comprobantes recibidos y bitácora.
- **Tablas `cert_*`, separadas de `invoices`:** proceso, pasos, sets, documentos, recibidos y bitácora de solo adición. RLS en todas.
- **Código:** `src/domain/ecf/` (XML, Excel, RFCE, ACECF, ARECF), `src/services/ecf/` (certificado, firma, cliente DGII) y `src/services/certification/`.
- **El Excel genera el XML directamente, sin pasar por los cálculos ni por `invoices`.** Respeta la regla de "mismos campos, mismo orden", cubre los tipos 41, 43 y 47 que el módulo no maneja, y es lo que más tiempo ahorra.
- **Certificado:** solo en variables sensibles del servidor, nunca en la base de datos ni en una pantalla. Pertenece a una persona: si se filtra, se puede firmar en su nombre.
- **Límite:** el portal de la DGII sigue siendo manual. El apartado prepara, envía y registra, pero no sustituye tu entrada al portal ni la declaración jurada.

## Esfuerzo estimado

| Trabajo | Persona-semanas |
| --- | --- |
| XML en orden oficial y pruebas | 0.75 |
| Certificado, firma y código de seguridad | 0.75 |
| Cliente DGII y bitácora | 0.5 |
| Tablas, seguimiento y pantallas | 0.75 |
| Excel y envío del set | 0.75 |
| Servicios públicos y acuses | 1 |
| Mapeo, RFCE y simulación | 1 |
| Representación impresa y QR | 0.5 |
| Hospedaje | 0.25 |
| Iteración por rechazos de la DGII | 1 a 3 |
| **Total hasta certificar** | **7 a 11** (según el revisor; incluye margen) |
| Emisión real después | 1.5 a 2.5 |

Dos desarrolladores acortan la construcción, pero no las esperas de la DGII.

## Riesgos

1. **Sanciones durante la construcción**, si no hay vía temporal. Consulta montos con tu contador.
2. **Cerrarse caminos:** el regreso al Facturador Gratuito no es posible, y no está claro si convive con una postulación abierta.
3. **Reinicio del set** por un error, un reenvío o un proceso automático.
4. **El Excel no es como se supone:** habría que ajustar el lector y el estimado. Las cifras públicas (11, 25 o 29 comprobantes) vienen de terceros y se contradicen.
5. **Firma mal hecha:** la canonicalización y el código de seguridad. Hoy `upper()` en la base puede corromper ese código.
6. **Fallos en los pasos 8 a 11** por arranques lentos o base pausada.
7. **Cola manual de la DGII:** es lo que menos se puede acelerar.
8. **Filtración de la clave privada.**
9. **Usar bibliotecas de terceros de e-CF:** pregunta si afecta la declaración de software interno.

## Sin verificar

- Contenido real del Excel y si los tipos 41, 43 y 47 son obligatorios. Los indicios dicen que sí; no hay texto oficial.
- Cantidades de la simulación y secuencias que se usan en ella.
- Qué reinicia exactamente un Rechazado y qué efecto tiene un Aceptado Condicional.
- Si la URL de autenticación es obligatoria en el paso 1. La documentación técnica la llama opcional.
- Vigencia de la prórroga individual de 120 días y del requisito de 3 clientes.
- Contenido literal de los Avisos 06-26 y 14-26.
- Comportamiento de los servicios de la DGII: no se ha observado en vivo.
