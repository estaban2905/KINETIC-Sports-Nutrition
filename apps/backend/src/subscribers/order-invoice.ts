import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { issueBoletaForOrder } from "../lib/invoice-order"
import { Sentry } from "../lib/sentry"

/**
 * Emits the boleta electrónica when an order is placed. A failure never blocks
 * the order: it is reported and the retry-boletas job tries again.
 */
export default async function orderInvoiceHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await issueBoletaForOrder(container, event.data.id)
  } catch (err) {
    logger.error(
      `[boleta] No se pudo emitir la boleta de la orden ${event.data.id}: ${err instanceof Error ? err.message : err}`
    )
    Sentry.captureException(err, { extra: { orderId: event.data.id } })
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
