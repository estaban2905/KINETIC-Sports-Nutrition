# Suscripciones con cobro recurrente

Cobro mensual automático con **Webpay Oneclick Mall** (Transbank). El cliente inscribe su tarjeta una vez en
Transbank y cada ciclo se cobra solo; KINETIC nunca ve ni guarda el número de la tarjeta, solo el `tbk_user` que
entrega Transbank.

## Cómo funciona

1. El cliente elige producto y "Membresía Mensual" → **modal** con dirección y aceptación de términos
   (`SubscribeModal`). Se crea la suscripción en `pending_card` (todavía no se cobra).
2. `POST /store/subscriptions/card/start` → el navegador envía un formulario POST a Transbank con `TBK_TOKEN`.
3. Transbank vuelve a `GET|POST /hooks/oneclick-inscription`. El backend **confirma con Transbank**
   (`finish`), guarda la tarjeta, activa la suscripción y **cobra el primer ciclo**; luego redirige a
   `/cuenta?tab=membership&card=ok|error`.
4. Cada día corre `renew-subscriptions` (12:00 UTC) y cobra las activas con `next_billing_date <= hoy` (calendario de Chile).
5. Cada cobro es un **pedido normal** (carrito → pago → completar), así que impuestos, inventario, boleta,
   confirmación por correo y envío Chilexpress funcionan igual que en una compra.

El precio no se guarda: sale de la variante vigente menos `discount_percent` (15%) en cada ciclo. El envío es
gratis. El regalo de bienvenida (opcional) va solo en el primer ciclo.

## Piezas

| Pieza | Dónde |
|---|---|
| Modelos `subscription` y `subscription_cycle` | `apps/backend/src/modules/subscription` |
| Proveedor de pago `pp_oneclick_oneclick` | `apps/backend/src/modules/payment-oneclick` |
| Orquestación de un ciclo | `src/lib/subscription-cycle.ts` (política) y `subscription-order.ts` (Medusa) |
| Jobs | `src/jobs/renew-subscriptions.ts`, `reconcile-subscription-cycles.ts`, `remind-subscriptions.ts` |
| API del cliente | `src/api/store/subscriptions/*` |
| Callback de Transbank | `src/api/hooks/oneclick-inscription` |
| Admin (solo lectura) | `src/admin/routes/subscriptions` y `src/api/admin/subscriptions` |
| Correos | `src/lib/subscription-emails.ts` |
| Storefront | `SubscribeModal.tsx`, `MembershipTab.tsx`, `lib/subscriptions.ts` |

## Garantías (y dónde viven)

- **Nunca se cobra dos veces el mismo día**: índice único `(subscription_id, period_key)` en `subscription_cycle`; el
  día se *reserva* antes de cobrar. Además el cobro corre bajo un candado por suscripción.
- **Un cobro repetido no se repite en Transbank**: las órdenes de compra son deterministas por ciclo e intento, y antes
  de cobrar el proveedor pregunta a Transbank si esa orden ya figura cobrada.
- **Sin pedido si el cobro falla**: el cargo ocurre dentro de `authorizePayment`. Si falla algo *después* del cargo,
  `cancelPayment` lo reversa.
- **El proveedor no sirve para el checkout**: su sesión exige un token cifrado y autenticado (AES-GCM) que solo el
  servidor puede fabricar; el storefront tampoco lo ofrece. La tarjeta no queda en las tablas de pago.

## Qué pasa en cada caso

| Caso | Resultado |
|---|---|
| Cobro exitoso | Pedido creado, ciclo `completed`, próximo cobro +30 días desde el día programado |
| Tarjeta rechazada | Reintento al día siguiente; al 3.er rechazo seguido → `past_due` y correo para actualizar la tarjeta |
| Sin stock | Se salta el ciclo **sin cobrar** y se avisa por correo |
| Falla del sistema antes de cobrar | Reintenta mañana, **no** cuenta como rechazo del cliente |
| Resultado ambiguo (corte de red) o cobrado sin pedido | Ciclo `charged_pending_order`: lo cierra `reconcile-subscription-cycles` consultando a Transbank; no se reintenta a ciegas |
| Proceso caído a mitad de un ciclo | Ciclo `reserved` > 15 min: lo concilia el mismo job |

## Variables de entorno

Backend (`apps/backend/.env.example`): `ONECLICK_ENVIRONMENT`, `ONECLICK_COMMERCE_CODE`,
`ONECLICK_CHILD_COMMERCE_CODE`, `ONECLICK_API_KEY`, `ONECLICK_RESPONSE_URL` (URL **pública** del backend para el callback),
`SUBSCRIPTION_TOKEN_SECRET`, `SUBSCRIPTION_GIFT_VARIANT_ID`, además de `STOREFRONT_URL`.

Storefront: `VITE_ENABLE_SUBSCRIPTIONS`, `VITE_ENABLE_SUBSCRIPTION_GIFT` (solo si el backend tiene el regalo configurado).

Sin variables, Oneclick usa las credenciales **públicas de integración** de Transbank (sirve para desarrollo y pruebas).
En producción el proveedor solo se registra si están las tres credenciales.

## Lanzamiento a producción: lista de verificación

1. **Contratar Oneclick Mall con Transbank** (código de comercio propio y código hijo, distintos de Webpay Plus) y
   completar su certificación. Es lo que más tarda: pedirlo con anticipación.
2. Configurar en el backend `ONECLICK_ENVIRONMENT=production` y las tres credenciales; `ONECLICK_RESPONSE_URL` pública;
   `SUBSCRIPTION_TOKEN_SECRET` propio.
3. Aplicar migraciones (`npx medusa db:migrate`) y **correr `seed-chile`** (`npx medusa exec ./src/scripts/seed-chile.ts`)
   para sumar `pp_oneclick_oneclick` a la región de Chile.
4. Crear el producto del regalo y poner su variante en `SUBSCRIPTION_GIFT_VARIANT_ID` (opcional).
5. Revisar los **términos** (monto, frecuencia, cómo cancelar, aviso 3 días antes) con quien corresponda legalmente.
6. Hacer una suscripción real con una tarjeta propia de monto bajo y reembolsarla; comprobar pedido, boleta, correos y envío.
7. Encender `VITE_ENABLE_SUBSCRIPTIONS` (con cuentas ya activas) y volver a construir el storefront.

## Probar en integración (sin contratar nada)

Las credenciales de integración permiten el ciclo completo. En el formulario de Transbank se usa la tarjeta de prueba
que publica Transbank en su documentación para desarrolladores. Lo único que **no** está cubierto por pruebas
automáticas es el paso en que el cliente escribe la tarjeta en la página de Transbank (`finish` con éxito real): hay que
recorrerlo a mano una vez.

## Operación y soporte

- **Admin → Suscripciones**: listado con filtro por estado (ver `past_due` primero) y, al seleccionar una, el historial
  de ciclos con el error técnico y el pedido.
- **Alertas en Sentry**: renovaciones con problemas, "Cliente cobrado sin pedido de suscripción" (hay que revisar a
  mano), ≥ 5 suscripciones en `past_due`.
- **Cobrado sin pedido que no se resuelve solo**: buscar el ciclo `charged_pending_order` en el admin; el job reintenta
  crear el pedido reutilizando el cobro. Si la causa es de fondo (p. ej. variante sin stock o sin precio), corregirla y el
  siguiente ciclo del job lo cierra; si no se puede entregar, reembolsar desde Transbank.
- **Tarjeta vencida o rechazada**: el cliente la cambia desde *Mi suscripción → Cambiar tarjeta*; al registrarla una
  suscripción `past_due` se reactiva y cobra de inmediato.

## Pendiente conocido

- El admin es de solo lectura: reactivar, cancelar o reintentar por un cliente se hace hoy desde la base de datos.
- Frecuencia fija de 30 días (el modelo ya soporta `frequency_days`, falta exponerlo en la interfaz).
- Un solo medio de pago (Oneclick). Mercado Pago Preapproval sería la alternativa si la contratación se demora.

## Documentación oficial de referencia

**Transbank (Webpay Oneclick Mall)**

| Tema | Enlace |
|---|---|
| Cómo funciona Oneclick (inscripción, cobros, mall, reversas) | https://www.transbankdevelopers.cl/documentacion/oneclick |
| Referencia de la API REST (inscripción, autorizar, estado, reembolso) | https://www.transbankdevelopers.cl/referencia/oneclick |
| Autorizar una transacción | https://www.transbankdevelopers.cl/referencia/oneclick#autorizar-una-transaccion |
| Estado de una transacción | https://www.transbankdevelopers.cl/referencia/oneclick#obtener-estado-de-una-transaccion |
| Ambiente de integración, códigos de comercio y tarjetas de prueba | https://www.transbankdevelopers.cl/documentacion/como_empezar#ambiente-de-integracion |
| Puesta en producción y proceso de validación | https://www.transbankdevelopers.cl/documentacion/como_empezar#puesta-en-produccion |
| SDK de Node (`transbank-sdk`) | https://github.com/TransbankDevelopers/transbank-sdk-nodejs |

Códigos de integración que usa el proyecto: mall `597055555541`, tienda `597055555542`; la llave es la pública de integración
(la misma de Webpay Plus). Hosts: integración `webpay3gint.transbank.cl`, producción `webpay3g.transbank.cl`.

**Medusa**

| Tema | Enlace |
|---|---|
| Proveedor de pago (`AbstractPaymentProvider`) | https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider |
| Sesión de pago y flujo de checkout | https://docs.medusajs.com/resources/commerce-modules/payment/payment-flow |
| Receta de suscripciones de Medusa (referencia, no es Oneclick) | https://docs.medusajs.com/resources/recipes/subscriptions/examples/standard |

### Pruebas en integración (datos publicados por Transbank)

- Tarjeta **aprobada**: VISA `4051 8856 0044 6623`, CVV `123`, cualquier vencimiento.
- Tarjeta **rechazada**: MASTERCARD `5186 0595 5959 0568`, CVV `123`.
- Si pide autenticación bancaria: RUT `11.111.111-1`, clave `123`.
- Durante la inscripción Transbank hace un cargo de $50 que **no se captura**. El formulario dura 10 min en integración
  (4 en producción) y la inscripción debe confirmarse dentro de 60 s (el callback lo hace al instante).

### Reglas de Transbank que el diseño respeta (y una que no)

- Una transacción es aprobada solo si **cada** detalle trae `response_code = 0` y `status = AUTHORIZED` → `parseChargeResult`.
- El retorno de la inscripción puede llegar por **GET o POST** y, si se aborta o vence, **sin `TBK_TOKEN`** → el callback acepta ambos
  y trata la falta de token como error sin cobrar.
- `finish` va con cuerpo vacío y el comercio debe confirmar rápido → lo hace el callback antes de cualquier otra cosa.
- El estado se consulta por la orden de compra padre (`status`) → base de la idempotencia del cobro y de la conciliación.
- ⚠️ **Una tarjeta por usuario y comercio**: si el mismo `username` inscribe otra tarjeta, el `tbkUser` anterior queda inválido.
  Hoy el `username` es el id del **cliente**, así que un cliente con dos suscripciones comparte tarjeta entre ellas: cambiarla en
  una, o cancelar una (que da de baja la inscripción), deja sin tarjeta válida a la otra. Mejora pendiente: usar el id de la
  **suscripción** como `username` (cabe en los 40 caracteres).
