# Módulo de facturación

Emisión de comprobantes fiscales, notas de crédito y débito, y cobros, sobre PostgreSQL (Supabase). Está en `/finanzas/facturas`.

El módulo guarda cada comprobante con los códigos del formato oficial e-CF de la DGII (*Formato e-CF v1.0, octubre 2025*). El comprobante no cambia según cómo se emita: solo cambia quién le da validez fiscal.

## Antes de usarlo: la fecha legal

Según la DGII:

| Contribuyente | Solo e-CF desde |
| --- | --- |
| Grandes y medianos | 1 de noviembre de 2026 |
| Pequeños, micro y no clasificados | 15 de noviembre de 2026 |

Después de esa fecha, los comprobantes no electrónicos (serie B) quedan solo para contingencia. Confirma tu categoría y fecha con tu contador o en la Oficina Virtual.

Por eso el modo por defecto es **e-CF emitido fuera del sistema**.

## Modos de emisión

Se elige en *Facturación → Configuración*.

| Modo | Cómo funciona | Estado |
| --- | --- | --- |
| `ecf_externo` | Emites en el Facturador Gratuito de la DGII o con un proveedor autorizado, y registras aquí el e-NCF, el código de seguridad y la fecha de firma. | Disponible |
| `ncf_interno` | El sistema asigna el NCF de los rangos autorizados que registres. | Disponible; uso legal limitado (ver arriba) |
| `ecf_proveedor` | El sistema asigna el e-NCF y MSeller lo firma y lo presenta a la DGII. Tipos 31, 32, 33, 34 y 45. | Disponible; [sin probar de punta a punta](#sin-verificar) |
| `ecf_directo` | Firma y envío desde este sistema. | Pendiente de implementar y certificar |

En `ecf_externo`, la representación impresa oficial es la que genera la plataforma donde se emitió; la de este sistema es una copia interna.

## Emisión por proveedor (MSeller)

### Puesta en marcha

1. Define en el servidor `BILLING_SECRETS_KEY` (`openssl rand -base64 32`) y `SUPABASE_SERVICE_ROLE_KEY`. La primera cifra las credenciales: si se pierde o cambia, hay que registrarlas de nuevo. La segunda permite aplicar lo que responde el proveedor; nunca debe llegar al navegador.
2. En *Facturación → Configuración*, elige el modo y el ambiente, y guarda. El ambiente no tiene valor por defecto en este modo.
3. Registra el correo, la contraseña y la API Key de ese ambiente, y usa *Probar conexión*. Solo comprueba correo y contraseña: la API Key se comprueba en el primer envío, porque hacerlo antes gasta cuota. Lo guardado no se puede volver a ver.
4. Registra los rangos e-NCF. Cada rango queda en el ambiente configurado y solo se usa en ese ambiente. En TesteCF: del 1 al 20,000 por tipo; E31, E33 y E45 vencen el 31-12-2028; E32 y E34 no llevan vencimiento.

**Haz las pruebas en una empresa separada.** Un e-CF de prueba que la DGII acepte cuenta en los ingresos y las cuentas por cobrar de esa empresa, y no se puede anular. Además, con e-CF vigentes (no rechazados) en un ambiente no se puede cambiar a otro, porque los números de prueba coinciden con los reales: esa empresa ya no podrá pasar a producción. El formulario lo advierte al elegir pruebas o certificación.

Todo e-CF que no sea de producción se muestra e imprime con la leyenda *Ambiente de pruebas: sin validez fiscal* y no entra al formato 607.

### Cómo emite

| Paso | Qué pasa | Estado |
| --- | --- | --- |
| Reserva (`billing_reserve_ecf`) | Valida como cualquier emisión, toma un número (primero los liberados) y fija los datos. Sin saldo ni efecto en la factura que una nota modifica. | `en_proceso` |
| Validación previa | `?validate=true`. Está en fase de pruebas: solo bloquea `ECF_VALIDATION_FAILED`. | |
| Envío | Se guardan los bytes exactos en `provider_payload_raw` antes de enviarlos. `provider_payload` (JSONB) es para consultar: reordena las claves, así que no sirve para reenviar. | `en_proceso` |
| Aceptado o Aceptado Condicional | Aparece el saldo y se aplica la nota, una sola vez. Las observaciones se muestran en el comprobante. | `emitida` o `pagada` |
| Rechazado | Vuelve a borrador sin rastro fiscal. El intento queda como historial con los mensajes de la DGII. Con `secuenciaUtilizada: false` el número se reutiliza; con `true` o sin el dato, se da por usado. | `borrador` |
| Error o No encontrado | No son finales. Sigue en proceso y se muestra tal cual. | `en_proceso` |

Mientras está en proceso no cuenta como ingreso ni por cobrar, no admite cobros ni notas, y no se puede editar ni anular. Una nota de crédito en proceso también limita lo que se puede cobrar de la factura que modifica.

**Quién puede qué.** El usuario solo reserva. Las demás fases (`billing_ecf_*`, `billing_release_ecf`, `billing_apply_ecf_status`) afirman qué respondió el proveedor, así que una sesión de usuario no las puede llamar: solo el servidor de Next, con service role, después de comprobar el permiso del usuario con su propia sesión. Reciben la empresa y el usuario, y los vuelven a comprobar. El documento se arma en el servidor; lo guardado no se lee con la sesión del usuario.

**Si el primer envío no entra:**

| Respuesta | Qué pasa |
| --- | --- |
| `ECF_VALIDATION_FAILED`, con cualquier código HTTP | Vuelve a borrador y el número vuelve a la bolsa. |
| 401, 403, 429 o sin conexión al autenticar | Vuelve a borrador y el número vuelve a la bolsa. |
| 400 sin ese código | Vuelve a borrador y **el número se aparta**: no regresa a la bolsa, porque la causa podría ser que ya se usó en esa cuenta. La próxima emisión toma otro. La configuración lista los números apartados. |

Solo el intento que sabe que su propio envío falló puede liberar un número en fase `enviando`; *Volver a borrador* exige `reservado`.

**Si el resultado es incierto** (tiempo agotado, error de red, 5xx u otra respuesta no documentada), **no se reenvía**: el API no tiene idempotencia. *Verificar* consulta el documento y, si hace falta, la consulta en lote. Solo `found: false`, o un documento anterior a este envío, a más de 5 minutos del último envío, permite reenviar lo guardado o devolverlo a borrador. Antes de hacer cualquiera de las dos cosas se consulta de nuevo: si la consulta falla, no se sigue, y si el documento apareció, se aplica su estado. Un reenvío que el proveedor rechaza no libera el número, porque lo guardado ya salió antes. Si al volver a borrador hay otro documento con ese número, el número se aparta.

**La consulta es por e-NCF**, y el proveedor conserva el documento anterior de un número reutilizado hasta que un POST lo reemplaza. Por eso una respuesta no surte efecto si no prueba ser de este envío:

- No trae fecha, o su `updateAt` es anterior a `last_sent_at`. Se admiten 2 minutos de margen por desfase de relojes, salvo en un número reutilizado sin POST confirmado: ahí esos minutos pueden ser del documento rechazado.
- Trae el `trackId` de un intento ya rechazado de ese e-NCF, o su `internalTrackId` sin un `trackId` distinto. Lo segundo no aplica con el POST confirmado y un `updateAt` posterior al envío: el proveedor ya reemplazó el documento, y una factura de consumo no trae otro dato que lo pruebe.
- En un envío sin confirmación del POST: no trae total para comparar, o su total o comprador difieren de lo guardado.

El estado se consulta a los 4 s, 30 s y 2 min con la página abierta, con *Actualizar estado*, y en lote al abrir la lista o con *Actualizar estados* (hasta 100, como máximo una vez por minuto por empresa). En la lista, un documento se revisa siempre durante la primera hora desde su envío, y después cada 15 min, el ritmo que recomienda el proveedor. Sin la página abierta nada se consulta: no hay cron ni webhooks.

Lo que se recupera por la consulta en lote puede llegar sin código de seguridad ni QR. La lista los pide a la consulta individual, y el comprobante ofrece *Actualizar* mientras falten.

### Sin verificar

Nada de esto se ha probado contra MSeller ni la DGII: no hay credenciales. Lo que ha corrido son pruebas unitarias con `fetch` simulado, pruebas SQL contra la base local y la validación del JSON contra los XSD oficiales.

También se recorrió en Chrome contra `scripts/mseller-stub.mjs`: configuración, credenciales, rangos, emisión de los tipos 31, 32, 34 y 45, validación fallida, API Key incorrecta, envío perdido y con 500, rechazo, nota de crédito e impresión a PDF. El simulador copia las formas documentadas, no el comportamiento real.

- **Documento desconocido:** la documentación no dice qué devuelve la consulta individual; solo la consulta en lote documenta `found: false`.
- **Envío duplicado:** no está documentado qué responde un POST con un e-NCF ya usado. Si es un 400 sin `ECF_VALIDATION_FAILED`, el número se aparta; si es otro código, queda incierto y *Verificar* compara lo que encuentra con lo guardado.
- **Reenvío de un número reutilizado:** no está documentado si conserva `internalTrackId`. Se supone que puede conservarlo y que un `trackId` nuevo o un POST confirmado prueban otro envío. Si el proveedor tampoco devuelve `updateAt`, el comprobante se queda en proceso: se prefiere eso a aplicar un estado ajeno. Con un POST sin confirmar, una factura de consumo sin `trackId` y un reloj del proveedor atrasado, la respuesta puede leerse como del documento anterior hasta que el proveedor la actualice.
- **Otro documento con el mismo número, actualizado después del envío:** el estado no se aplica y el comprobante queda en proceso hasta aclararlo con el proveedor. No hay una acción en pantalla para resolverlo.
- **Código HTTP de `ECF_VALIDATION_FAILED`:** la documentación solo muestra el cuerpo, así que manda el cuerpo.
- **`signedDate`:** los ejemplos parecen usar reloj de 12 horas sin AM o PM. Lo que se muestra e imprime es el texto del proveedor; `sign_date` toma la lectura más cercana al envío. Confírmalo en la primera emisión en TesteCF.
- **Fecha de firma recuperada por consulta:** ni la consulta ni el QR de una factura de consumo menor de RD$250,000 la traen. Si el POST no se confirmó, la pantalla avisa que no está disponible y la impresión omite esa línea. No se confirmó si el Informe Técnico la exige también en ese caso: si la exige, hay que pedírsela al proveedor antes de entregar el comprobante.
- **Versión del QR:** la Descripción Técnica de la DGII habla de la versión 8, y la biblioteca elige la menor que admite la URL (10 para un E31 del simulador de 208 caracteres, 7 para un E32 de 124). No se fuerza: según la tabla de capacidades, recordada y sin comprobar aquí, la versión 8 no alcanza para esa URL de E31. Falta preguntar al proveedor o a la DGII si es obligatoria, y probar con URLs reales.
- **Forma del JSON:** los ejemplos mezclan números y texto, y `TablaTelefonoEmisor` no aparece en ninguno. Se usó la estructura del XSD.
- **Tipo 32 anónimo:** el XSD exige el área `Comprador`, pero sus campos son opcionales. Se envía solo `RazonSocialComprador: "Consumidor Final"`, que el proveedor documenta, sin el RNC de ceros.
- **`IndicadorEnvioDiferido` y `TotalPaginas`:** no se envían, aunque los ejemplos los traen. El Formato los limita a ventas offline autorizadas, y el XSD rechaza `TotalPaginas: 1`.
- **`TablaFormasPago` en el tipo 33:** el proveedor la marca como sección del tipo, pero el Formato y el XSD la dejan opcional. No se envía porque el formulario no captura la forma de pago.
- **Reglas de la DGII:** el XSD solo valida la estructura. Las reglas de negocio se validan al enviar a TesteCF.

### Representación impresa

Sigue el Informe Técnico (18.2) en lo que los datos permiten:

- **Arriba a la derecha:** la denominación oficial del tipo en palabras (*Factura de Crédito Fiscal Electrónica*, etc.), el e-NCF, *Fecha Vencimiento*, el e-NCF modificado y el código en palabras.
- **Arriba a la izquierda:** nombre comercial, razón social, RNC, dirección y *Fecha de Emisión*.
- **Debajo, a la izquierda:** el comprador.
- **Parte central:** marca "E" en lo exento, unidad en palabras, ITBIS por línea y totales.
- **Abajo a la izquierda:** QR real con la URL del proveedor (26 mm, 3 mm de margen, a 2 cm del borde con el margen de hoja de 1 cm que fija la hoja de estilos), código de seguridad y fecha de firma. Un dato que el proveedor no devolvió se avisa en pantalla y no se imprime. Los cobros no se imprimen, para que el QR quede abajo. El QR y el enlace solo se muestran si la URL es de `ecf.dgii.gov.do` o `fc.dgii.gov.do`.

Falta: municipio, provincia y sucursal del emisor (no se capturan), unidades fuera de la selección del catálogo, y paginación con subtotales por página en comprobantes de más de una hoja. Se imprimió a PDF en Chrome en papel carta: el QR de 31, 32, 34 y 45 mide 26 mm y se decodifica. No se comparó con los modelos de la DGII, ni en otras impresoras o navegadores: si quien imprime pone otro margen o escala, cambia la medida. La DGII aprueba la representación impresa en la certificación: compárala con sus modelos antes.

### Probar en local

```bash
node scripts/mseller-stub.mjs
```

Con `MSELLER_BASE_URL_OVERRIDE=http://127.0.0.1:4010` y `SUPABASE_SERVICE_ROLE_KEY` (la `SERVICE_ROLE_KEY` de `npx supabase status`) en `.env.local`, y `next dev`. La variable del proveedor simulado se ignora en producción. Registra `stub-api-key` como API Key: otra recibe 403.

El simulador pasa por *En Cola*, *Enviado a la DGII* y *En Proceso* antes del resultado. Su cabecera explica cómo elegir la respuesta de la DGII, qué responder a un duplicado o a una validación, y cómo simular un envío perdido o sin respuesta.

## Puesta en marcha local

Requiere Docker.

```bash
npm install
```

```bash
npx supabase start
```

Copia `API_URL` y `ANON_KEY` del resultado a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

```bash
npm run dev
```

Inicia sesión con el usuario de `supabase/seeds/dev.sql`.

Ya no existe un acceso de demostración: sin Supabase no se puede iniciar sesión en la aplicación.

## Puesta en marcha en un servidor

1. Aplica todas las migraciones. **No ejecutes `supabase/seeds/dev.sql`**: crea un usuario con contraseña conocida.
2. Asigna a cada usuario su empresa y su rol:

```sql
INSERT INTO company_members (company_id, user_id) VALUES ('<empresa>', '<usuario>');

INSERT INTO user_roles (user_id, role_id, company_id)
SELECT '<usuario>', id, '<empresa>' FROM roles
WHERE name = 'Administrador' AND is_system;
```

Los roles con permisos de facturación son *Administrador* y *Contabilidad*. *Contabilidad* también puede crear y editar clientes, pero no archivarlos.

## Publicar para pruebas (Vercel + Supabase)

Aplica las migraciones solo con `db push`. **Nunca uses `--include-seed` ni `supabase db reset --linked`**: cargarían `seeds/dev.sql`, con un administrador de contraseña conocida.

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <PROJECT_REF>
```

```bash
npx supabase db push
```

En Vercel define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, antes del primer build: se fijan al compilar y, sin ellas, el build pasa pero nadie puede entrar. Agrega `BILLING_SECRETS_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo si usarás el modo de proveedor; la segunda, sin el prefijo `NEXT_PUBLIC_`. No pegues `.env.production.example`. Deja sin definir `NEXTCLOUD_*`.

```bash
npx vercel --prod
```

Comparte solo el dominio de producción `<proyecto>.vercel.app`: las demás URL piden iniciar sesión en Vercel.

En Supabase: crea los usuarios en *Authentication → Users* con contraseña, sin invitación, porque la app no tiene pantalla para definirla. Después desactiva los registros públicos: la clave pública permite crear cuentas aunque la app no tenga esa pantalla.

Primera empresa y administrador, una sola vez, en el editor SQL:

```sql
DO $$
DECLARE v_company uuid; v_user uuid; v_role uuid;
BEGIN
  SELECT id INTO STRICT v_user FROM auth.users WHERE email = '<ADMIN_EMAIL>';
  SELECT id INTO STRICT v_role FROM public.roles WHERE name = 'Administrador' AND is_system AND company_id IS NULL;
  INSERT INTO public.companies (name, rnc, address) VALUES ('<EMPRESA_DE_PRUEBA>', '<RNC_DE_PRUEBA>', '<DIRECCION>') RETURNING id INTO v_company;
  INSERT INTO public.company_members (company_id, user_id) VALUES (v_company, v_user);
  INSERT INTO public.user_roles (user_id, role_id, company_id) VALUES (v_user, v_role, v_company);
END $$;
```

Cada colega, con rol `Administrador` o `Contabilidad` (los demás roles no tienen permisos):

```sql
INSERT INTO public.company_members (company_id, user_id)
SELECT c.id, u.id FROM public.companies c, auth.users u
WHERE c.name = '<EMPRESA_DE_PRUEBA>' AND u.email = '<COLEGA_EMAIL>';

INSERT INTO public.user_roles (user_id, role_id, company_id)
SELECT u.id, r.id, c.id FROM auth.users u, public.roles r, public.companies c
WHERE u.email = '<COLEGA_EMAIL>' AND r.name = '<ROL>' AND r.is_system AND r.company_id IS NULL AND c.name = '<EMPRESA_DE_PRUEBA>';
```

Comprueba que el usuario de desarrollo no llegó a la nube; el resultado debe ser 0:

```sql
SELECT count(*) FROM auth.users WHERE email LIKE '%@emblema.test';
```

Solo Clientes, Facturación, CxC y Cobros se comparten entre usuarios; lo demás se queda en cada navegador. Los documentos no funcionan sin Nextcloud. Supabase Free pausa el proyecto tras 7 días sin actividad y no hace copias de seguridad automáticas.

## Uso

1. **Configuración:** RNC, razón social, dirección y modo de emisión. Con NCF tradicional, registra también los rangos autorizados.
2. **Nueva factura:** se guarda como borrador, sin valor fiscal. El formulario indica lo que falta para poder emitir.
3. **Emitir:** valida y fija los datos. Desde ahí el comprobante es inmutable. En modo proveedor queda en proceso hasta que la DGII responda; si la rechaza, o si no llegó al proveedor, vuelve a un borrador corregible.
4. **Cobrar:** admite cobros parciales. Un cobro anulado devuelve el saldo y conserva el recibo.
5. **Corregir:** con nota de crédito o débito. Un e-CF no se anula: se emite una nota de crédito con código 1. Solo un NCF tradicional se puede anular directamente.

## Arquitectura

```
src/domain/billing/      Reglas fiscales puras y probadas, sin base de datos
  catalogs.ts            Códigos oficiales de la DGII
  calculate.ts           Totales con aritmética exacta
  rules.ts               Validaciones para emitir
  ecf-mapper.ts          Comprobante → estructura e-CF y URL del timbre
src/services/billing/    Acceso a datos y emisión
  issuers.ts             Frontera con quien da la validez fiscal
  mseller/client.ts      API del proveedor; distingue lo que no llegó de lo ambiguo
  mseller/secrets.ts     Cifrado de credenciales (AES-256-GCM)
  mseller/EcfProviderService.ts  Reserva, envío, estado y credenciales
src/features/billing/    Acciones del servidor, esquemas y pantallas
supabase/migrations/00020_modulo_facturacion.sql
supabase/migrations/00021_clientes_y_cartera.sql
supabase/migrations/00024_ecf_proveedor.sql
```

Clientes, CxC, cobros, el resumen de finanzas y la ficha del cliente leen de las mismas tablas (`src/services/clients/`, `BillingService`), con el usuario y la empresa activa que resuelve `src/services/tenant/context.ts`.

Decisiones que conviene conservar:

- **Lo emitido no se toca.** Dos candados: RLS sin políticas de escritura, y triggers que rechazan cambios incluso a los administradores de la base.
- **La base de datos no confía en la aplicación.** Al emitir recalcula el cuadre, toma el comprador del cliente y la referencia de la nota del comprobante original.
- **Una sesión de usuario no prueba lo que respondió el proveedor.** Esas fases solo corren con service role, desde el servidor (`src/lib/supabase/admin.ts`, que no puede llegar a un bundle de cliente).
- **El número fiscal se asigna al emitir, en una sola transacción.** Si algo falla, el número no se consume. En modo proveedor se reserva antes de enviar: un rechazo con `secuenciaUtilizada` en `true` o sin el dato lo da por usado, y un 400 sin motivo lo aparta.
- **El ITBIS se calcula sobre el total por tasa**, como dicta el formato, y se reparte entre las líneas sin descuadre.
- **Fechas en hora de RD (GMT-4).**
- **Los totales de cartera se calculan en la base**, para no depender del límite de filas de la API. Están en pesos a la tasa de cada comprobante.
- **Solo una venta a crédito vence.** Al contado, `due_date` es la fecha de emisión y no indica mora.
- **Un cliente no se borra, se archiva.** Sus facturas y cobros lo referencian. Editarlo no cambia lo ya emitido.

## Pruebas

```bash
npm test
```

Con Supabase corriendo, esta prueba verifica aislamiento entre empresas, permisos, inmutabilidad, cuadre, rangos y notas. Corre en una transacción que se revierte:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/billing_integration.sql
```

Esta verifica los permisos de clientes y los saldos de cartera y cobros:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/clients_receivables_integration.sql
```

Para accesos abiertos entre empresas y de visitantes sin sesión, usa también `supabase/tests/security_integration.sql`. La emisión por proveedor se verifica con `supabase/tests/mseller_integration.sql`, incluido que un usuario de Contabilidad no pueda llamar sus fases, y `npm test` valida el JSON contra los XSD oficiales con `xmllint`; esa prueba se omite si no está instalado.

## Cómo activar la emisión directa con la DGII

Lo que ya existe y sirve: los datos capturados, `toEcfDocument` (estructura y nombres oficiales), `buildTimbreUrl`, la tabla `fiscal_sequences` y la interfaz `FiscalIssuer`.

Lo que falta:

1. **Obtener lo externo:** certificado digital de una entidad acreditada, secuencias e-NCF autorizadas y alta como emisor electrónico en la DGII.
2. **XML:** serializar `toEcfDocument`, ya validado contra los XSD de los tipos 31, 32, 33, 34 y 45; faltan 44 y 46.
3. **Firma:** XML-DSig real con una biblioteca probada. El código de seguridad son los primeros 6 caracteres del hash del `SignatureValue`.
4. **Cliente DGII:** semilla y token, recepción de e-CF, recepción de resumen (RFCE) para consumo menor de RD$250,000, consulta por TrackId. Las URL oficiales usan `testecf`, `certecf` y `ecf`.
5. **Rechazos:** usar `secuenciaUtilizada` de la respuesta para saber si la secuencia se puede reutilizar.
6. **Recepción:** el acuse y la aprobación comercial de lo que te envían otros emisores.
7. **Certificarse** en el ambiente de pruebas de la DGII, e implementar `DirectEcfIssuer` en `issuers.ts`.

**No reutilices `src/services/dgii/` sin rehacerlo:** contradice el formato oficial en puntos de fondo. El detalle está en [REVISION_PROYECTO.md](REVISION_PROYECTO.md).

## Limitaciones actuales

- **Bancos, Caja y Gastos** siguen en el navegador. Los cobros no mueven esos saldos; el resumen los muestra aparte y rotulados.
- **Expedientes** siguen en el navegador, así que una factura todavía no se vincula a un expediente: su pestaña de finanzas enlaza a la factura y al estado de cuenta del cliente.
- **Cotizaciones** siguen en el navegador. Convertir una abre una factura nueva con el cliente y las líneas precargados, y al guardar el borrador queda enlazada a él. La pantalla de e-CF (`/finanzas/ecf`) solo muestra registros simulados: ya no emite.
- **Formatos 606/607/608:** `DgiiReportService` no se ha adaptado a las notas ni a las retenciones de este módulo.
- **Saldo a favor:** una nota de crédito puede llegar al total de la factura aunque ya tenga cobros. Lo cobrado de más se muestra como *Saldo a favor del cliente* en la factura y en CxC, pero no se puede aplicar a otro comprobante ni registrar su devolución.
- **Unidades de medida y provincias:** solo una selección de la tabla oficial de unidades; los códigos de provincia y municipio no se capturan.
- **Datos anteriores:** lo guardado en el navegador no se migra. Los clientes y facturas antiguos del navegador dejan de verse en estas pantallas.
- **Antes del módulo:** `InvoiceService` sigue en el código, pero estas pantallas no lo usan. Las escrituras directas a `invoices` que hace ese servicio ahora las bloquea la base de datos.
