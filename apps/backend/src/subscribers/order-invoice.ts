import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { issueDocumentForOrder } from "../lib/invoice-order"
import { Sentry } from "../lib/sentry"

/**
 * Emits the boleta/factura electrónica when an order is placed. A failure never blocks
 * the order: it is reported and the retry-boletas job tries again.
 */
export default async function orderInvoiceHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await issueDocumentForOrder(container, event.data.id)
  } catch (err) {
    logger.error(
      `[dte] No se pudo emitir el documento de la orden ${event.data.id}: ${err instanceof Error ? err.message : err}`
    )
    Sentry.captureException(err, { extra: { orderId: event.data.id } })
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
