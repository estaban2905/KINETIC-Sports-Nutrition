import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { sendOrderStatusEmail } from "../lib/order-notifications"
import { Sentry } from "../lib/sentry"

/**
 * Al crearse el pedido: si ya está pagado se envía la confirmación; si el pago
 * sigue pendiente (transferencia sin acreditar) solo se avisa que lo estamos
 * esperando. La confirmación sale después, al capturarse el pago
 * (subscribers/payment-captured.ts).
 */
export default async function orderPlacedHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await sendOrderStatusEmail(container, event.data.id)
  } catch (err) {
    logger.error(
      `No se pudo enviar el email del pedido ${event.data.id}: ${err instanceof Error ? err.message : err}`
    )
    Sentry.captureException(err)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
