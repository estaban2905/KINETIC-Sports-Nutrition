import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isDocumentPending, issueDocumentForOrder } from "../lib/invoice-order"
import { sendOrderStatusEmail } from "../lib/order-notifications"
import { isOrderPaid } from "../lib/order-status"
import { getSimpleFacturaConfig } from "../lib/simplefactura"
import { Sentry } from "../lib/sentry"

const LOOKBACK_HOURS = 72
const MAX_PER_RUN = 20
// SimpleFactura allows 2 requests/second per IP.
const PAUSE_MS = 700

/**
 * Safety net for boletas and facturas: emits those that failed at order time (SimpleFactura
 * down, out of folios, rate limited...) and re-sends the PDF email when it
 * failed. issueDocumentForOrder is idempotent, so running it on every recent
 * order is safe.
 */
export default async function retryBoletas(container: MedusaContainer) {
  if (!getSimpleFacturaConfig()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "metadata",
      "payment_collections.status",
      "payment_collections.amount",
      "payment_collections.captured_amount",
    ],
    filters: {
      created_at: { $gte: new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000) },
      status: ["pending", "completed"],
    } as any,
  })

  const pending = (orders as any[])
    // Un pedido sin pagar no tiene boleta pendiente: espera a que se capture el pago.
    .filter((o) => isDocumentPending(o.metadata) && isOrderPaid(o.payment_collections))
    .slice(0, MAX_PER_RUN)
  if (!pending.length) return

  logger.info(`[retry-boletas] ${pending.length} orden(es) con boleta pendiente.`)
  for (const order of pending) {
    try {
      // Pagos que se autorizan sin evento payment.captured (p. ej. Mercado Pago):
      // la confirmación del pedido también se envía desde acá (idempotente).
      await sendOrderStatusEmail(container, order.id).catch((err) =>
        logger.error(`[retry-boletas] Orden #${order.display_id}: email de confirmación: ${err instanceof Error ? err.message : err}`)
      )
      const result = await issueDocumentForOrder(container, order.id)
      if (result === "needs_review") {
        logger.warn(`[retry-boletas] Orden #${order.display_id}: reserva de documento sin resolver (revisión manual).`)
      }
    } catch (err) {
      logger.error(`[retry-boletas] Orden #${order.display_id}: ${err instanceof Error ? err.message : err}`)
      Sentry.captureException(err, { extra: { orderId: order.id } })
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
  }
}

export const config = {
  name: "retry-boletas",
  schedule: "*/15 * * * *",
}
