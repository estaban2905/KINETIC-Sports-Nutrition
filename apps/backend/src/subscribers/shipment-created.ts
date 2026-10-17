import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { FulfillmentWorkflowEvents } from "@medusajs/framework/utils"
import { CHILEXPRESS_TRACKING_PAGE, sendFulfillmentEmail } from "../lib/fulfillment-email"
import { shipmentEmail } from "../lib/email-templates"

export default async function shipmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  await sendFulfillmentEmail(container, {
    fulfillmentId: event.data.id,
    noNotification: event.data.no_notification,
    trigger: "shipment.created",
    build: ({ displayId, trackingNumbers, isChilexpress }) =>
      shipmentEmail({
        displayId,
        trackingNumbers,
        trackingPageUrl: isChilexpress ? CHILEXPRESS_TRACKING_PAGE : null,
      }),
  })
}

export const config: SubscriberConfig = {
  event: FulfillmentWorkflowEvents.SHIPMENT_CREATED,
}
