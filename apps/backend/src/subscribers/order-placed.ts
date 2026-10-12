import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import { orderPlacedEmail } from "../lib/email-templates"
import { Sentry } from "../lib/sentry"

export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "item_subtotal",
      "discount_total",
      "shipping_total",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.total",
      "items.thumbnail",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
    ],
    filters: { id: event.data.id },
  })
  const order = orders[0] as any

  if (!order?.email) {
    logger.warn(`order.placed: orden ${event.data.id} no tiene email, se omite notificación.`)
    return
  }

  const { subject, html } = orderPlacedEmail(order)

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      content: {
        subject,
        html,
      },
      data: { order_id: order.id },
      trigger_type: "order.placed",
      resource_id: order.id,
      resource_type: "order",
    })
  } catch (err) {
    logger.error(
      `No se pudo enviar el email de confirmación para la orden ${order.id}: ${
        err instanceof Error ? err.message : err
      }`
    )
    Sentry.captureException(err)
  }

  // TODO: Integrar boleta/factura electrónica (SII) acá.
  // Pendiente por decisión de negocio — evaluar proveedor certificado
  // (OpenFactura, SimpleFactura, Bsale) vs. integración directa con el SII
  // (requiere certificado digital de la empresa y folios CAF).
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
