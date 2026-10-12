import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { FulfillmentWorkflowEvents } from "@medusajs/framework/utils"
import {
  CHILEXPRESS_TRACKING_PAGE,
  escapeHtml,
  sendFulfillmentEmail,
} from "../lib/fulfillment-email"

export default async function shipmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  await sendFulfillmentEmail(container, {
    fulfillmentId: event.data.id,
    noNotification: event.data.no_notification,
    trigger: "shipment.created",
    subject: (displayId) => `Tu pedido #${displayId} fue enviado — KINETIC Sports Nutrition`,
    body: ({ displayId, trackingNumbers, isChilexpress }) => `
      <h2>Tu pedido va en camino</h2>
      <p>Tu pedido <strong>#${displayId}</strong> fue enviado.</p>
      ${
        trackingNumbers.length
          ? `<p>N° de seguimiento: <strong>${trackingNumbers.map(escapeHtml).join(", ")}</strong></p>`
          : ""
      }
      ${
        isChilexpress && trackingNumbers.length
          ? `<p>Pega ese número en <a href="${CHILEXPRESS_TRACKING_PAGE}">el sitio de Chilexpress</a> para ver el detalle de tu envío.</p>`
          : ""
      }
    `,
  })
}

export const config: SubscriberConfig = {
  event: FulfillmentWorkflowEvents.SHIPMENT_CREATED,
}
