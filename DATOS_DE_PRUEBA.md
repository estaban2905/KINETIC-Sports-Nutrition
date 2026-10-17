# Datos de prueba (solo ambientes de integración / certificación)

Todo lo de este archivo es para **pruebas**. No contiene secretos: las claves reales
están en `apps/backend/.env` (que git ignora). **No uses estos datos en producción.**

Leyenda: ✅ verificado contra la documentación · ⚠️ sin verificar (confírmalo en el enlace).

---

## 1. Factura electrónica (SimpleFactura, ambiente de certificación)

Se prueba desde el checkout eligiendo **Factura**. El ambiente es `SIMPLEFACTURA_AMBIENTE=0`
(sin validez tributaria). Los RUT tienen dígito verificador válido (calculado con la regla
de `apps/backend/src/lib/rut.ts`), pero no son de empresas reales.

### Receptor (la empresa a la que se le factura)

| Campo | Valor |
|---|---|
| RUT | `77.654.321-7` |
| Razón social | Comercial Andes Spa |
| Giro | Venta al por menor de artículos deportivos |
| Dirección | Av. Apoquindo 3000 |
| Comuna | Las Condes |

RUT alternativos válidos: `76.123.456-0`, `76.543.210-3`.
No uses `78.181.331-1` como receptor: es el RUT del **emisor** de la cuenta demo.

### Emisor (nuestra empresa en la cuenta demo de SimpleFactura)

| Variable | Valor |
|---|---|
| `SIMPLEFACTURA_RUT_EMISOR` | `78181331-1` |
| `SIMPLEFACTURA_RAZON_SOCIAL` | CHILESYSTEMS SPA |
| `SIMPLEFACTURA_GIRO` | Desarrollo de software |
| `SIMPLEFACTURA_DIR_ORIGEN` / `COMUNA_ORIGEN` | Calle 7 numero 3 / Santiago |
| `SIMPLEFACTURA_SUCURSAL` | Casa Matriz |
| `SIMPLEFACTURA_AMBIENTE` | `0` |

Usuario y clave de la cuenta demo: variables `SIMPLEFACTURA_EMAIL` y `SIMPLEFACTURA_PASSWORD`
de `apps/backend/.env`. Límites de la API: 10 tokens por hora; 2 peticiones por segundo.

- ⚠️ Documentación: https://documentacion.simplefactura.cl (no pude verificar la URL; si no abre, pídela a ChileSystems)
- ✅ SDK de referencia (muestra la URL base `https://api.simplefactura.cl`): https://packagist.org/packages/simplefactura/sdk

---

## 2. Webpay Plus (Transbank, ambiente de integración)

Credenciales públicas de integración (ya están en `apps/backend/.env.example`):
`TRANSBANK_COMMERCE_CODE=597055555532` y la API key de integración.

| Dato | Valor | Estado |
|---|---|---|
| Tarjeta VISA (aprueba) | `4051 8856 0044 6623` | ⚠️ solo la vi en una fuente de terceros |
| CVV / vencimiento | `123` / cualquier fecha futura | ⚠️ |
| Mastercard (rechaza) | `5186 0595 5959 0568` | ⚠️ |
| Redcompra (débito, aprueba) | `4051 8842 3993 7763` | ⚠️ |
| Autenticación del banco simulado | RUT `11.111.111-1`, clave `123` | ⚠️ no encontré confirmación |

- Documentación oficial (tarjetas de prueba): https://www.transbankdevelopers.cl/documentacion/como_empezar#tarjetas-de-prueba
- Webpay no tiene webhook: el pago se confirma cuando el cliente vuelve a `/checkout/confirmar`.

---

## 3. Mercado Pago (Chile, modo pruebas)

Usa credenciales de **prueba** (usuario de prueba), no las de producción.
Para elegir el resultado se cambia el **nombre del titular** de la tarjeta:

| Nombre del titular | Resultado |
|---|---|
| `APRO` | Pago aprobado ✅ |
| `OTHE` | Rechazo por error general ✅ |
| `CONT` | Pago pendiente ✅ |

Documento del titular para APRO y OTHE: tipo "otro", número `123456789` ✅.
Los **números de tarjeta** (Mastercard, Visa y Amex de prueba para Chile, con su CVV y
vencimiento) están en la página oficial; no los copio aquí para no desactualizarlos:

- ✅ Tarjetas de prueba: https://www.mercadopago.cl/developers/es/docs/your-integrations/test/cards
- Notificaciones (webhook) hacia `MERCADOPAGO_NOTIFICATION_URL`: solo funcionan con una URL pública (Railway o un túnel), no con `localhost`.

---

## 4. Khipu (transferencia)

Los pagos de una cuenta en modo desarrollo no son reales: Khipu envía el comprobante con la
leyenda "AMBIENTE DE DESARROLLO: la transacción descrita no es real".
La confirmación llega por webhook a `KHIPU_NOTIFY_URL` (`.../hooks/payment/khipu_khipu`), que
**debe ser una URL pública**. En local, déjala vacía o usa un túnel; si no, el pago queda
"Awaiting" en Medusa aunque Khipu lo haya cobrado.

- ✅ Documentación: https://docs.khipu.com/en/payment-solutions/instant-payments/payment-auth.md
- ⚠️ No encontré una página oficial con datos de prueba específicos de Khipu.

---

## 5. Stripe (opcional, hoy sin configurar)

Tarjeta de prueba estándar: `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.

- Documentación: https://docs.stripe.com/testing

---

## 6. Medusa / Resend

- Admin local: http://localhost:9000/app (usuario creado con `npx medusa user -e ... -p ...`).
- Resend con `onboarding@resend.dev` **solo entrega al correo dueño de la cuenta de Resend**.
  Para enviar a otros destinatarios hay que verificar un dominio propio.
- Documentación de Medusa: https://docs.medusajs.com
