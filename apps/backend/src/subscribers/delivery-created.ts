import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { FulfillmentWorkflowEvents } from "@medusajs/framework/utils"
import { escapeHtml, sendFulfillmentEmail } from "../lib/fulfillment-email"

export default async function deliveryCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  await sendFulfillmentEmail(container, {
    fulfillmentId: event.data.id,
    noNotification: event.data.no_notification,
    trigger: "delivery.created",
    subject: (displayId) => `Tu pedido #${displayId} fue entregado — KINETIC Sports Nutrition`,
    body: ({ displayId, certificateUrl }) => `
      <h2>Tu pedido fue entregado</h2>
      <p>Tu pedido <strong>#${displayId}</strong> fue entregado.</p>
      ${
        certificateUrl
          ? `<p><a href="${escapeHtml(certificateUrl)}">Ver certificado de entrega</a></p>`
          : ""
      }
    `,
  })
}

export const config: SubscriberConfig = {
  event: FulfillmentWorkflowEvents.DELIVERY_CREATED,
}
