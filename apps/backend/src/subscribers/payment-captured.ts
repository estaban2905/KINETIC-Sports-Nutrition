import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, PaymentEvents } from "@medusajs/framework/utils"
import { issueDocumentForOrder } from "../lib/invoice-order"
import { sendOrderStatusEmail } from "../lib/order-notifications"
import { Sentry } from "../lib/sentry"

/**
 * Cuando el pago se captura (p. ej. llegó la transferencia de Khipu) se envía la
 * confirmación del pedido y se emite la boleta/factura: ninguna de las dos sale
 * mientras el pago está pendiente. Cada paso falla por separado; el job
 * retry-boletas reintenta lo que quede pendiente.
 */
export default async function paymentCapturedHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  let orderId: string | undefined
  try {
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection_id"],
      filters: { id: event.data.id },
    })
    const collectionId = (payments[0] as any)?.payment_collection_id
    if (!collectionId) return

    const { data: links } = await query.graph({
      entity: "order_payment_collection",
      fields: ["order_id"],
      filters: { payment_collection_id: collectionId } as any,
    })
    orderId = (links[0] as any)?.order_id
  } catch (err) {
    logger.error(`payment.captured: no se pudo ubicar el pedido del pago ${event.data.id}: ${err instanceof Error ? err.message : err}`)
    Sentry.captureException(err)
    return
  }
  // Pagos que no pertenecen a un pedido (carrito aún sin completar): nada que hacer.
  if (!orderId) return

  try {
    await sendOrderStatusEmail(container, orderId)
  } catch (err) {
    logger.error(`payment.captured: no se pudo enviar el email del pedido ${orderId}: ${err instanceof Error ? err.message : err}`)
    Sentry.captureException(err)
  }

  try {
    await issueDocumentForOrder(container, orderId)
  } catch (err) {
    logger.error(`[dte] payment.captured: no se pudo emitir el documento del pedido ${orderId}: ${err instanceof Error ? err.message : err}`)
    Sentry.captureException(err, { extra: { orderId } })
  }
}

export const config: SubscriberConfig = {
  event: PaymentEvents.CAPTURED,
}
