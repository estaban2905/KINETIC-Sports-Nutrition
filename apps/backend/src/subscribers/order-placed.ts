import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

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
      "shipping_total",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.total",
      "shipping_address.address_1",
      "shipping_address.city",
    ],
    filters: { id: event.data.id },
  })
  const order = orders[0] as any

  if (!order?.email) {
    logger.warn(`order.placed: orden ${event.data.id} no tiene email, se omite notificación.`)
    return
  }

  const itemsHtml = (order.items ?? [])
    .map((item: any) => {
      const variant =
        item.variant_title && item.variant_title !== "Único" ? ` (${item.variant_title})` : ""
      return `<tr>
        <td style="padding:6px 0;">${item.product_title}${variant} × ${item.quantity}</td>
        <td style="padding:6px 0; text-align:right;">${currency.format(item.total ?? 0)}</td>
      </tr>`
    })
    .join("")

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2>¡Gracias por tu compra!</h2>
      <p>Tu pedido <strong>#${order.display_id}</strong> fue confirmado.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        ${itemsHtml}
      </table>
      <p>Subtotal: ${currency.format(order.item_subtotal ?? 0)}</p>
      <p>Envío: ${currency.format(order.shipping_total ?? 0)}</p>
      <p style="font-size: 18px;"><strong>Total: ${currency.format(order.total ?? 0)}</strong></p>
      ${
        order.shipping_address
          ? `<p>Dirección de envío: ${order.shipping_address.address_1}, ${order.shipping_address.city}</p>`
          : ""
      }
      <p>Puedes seguir tu pedido en cualquier momento con tu número de orden y tu correo.</p>
    </div>
  `

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      content: {
        subject: `Confirmación de tu pedido #${order.display_id} — KINETIC Sports Nutrition`,
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
  }

  // TODO: Integrar boleta/factura electrónica (SII) acá.
  // Pendiente por decisión de negocio — evaluar proveedor certificado
  // (OpenFactura, SimpleFactura, Bsale) vs. integración directa con el SII
  // (requiere certificado digital de la empresa y folios CAF).
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
