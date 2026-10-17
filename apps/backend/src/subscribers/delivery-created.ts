import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { FulfillmentWorkflowEvents } from "@medusajs/framework/utils"
import { sendFulfillmentEmail } from "../lib/fulfillment-email"
import { deliveryEmail } from "../lib/email-templates"

export default async function deliveryCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  await sendFulfillmentEmail(container, {
    fulfillmentId: event.data.id,
    noNotification: event.data.no_notification,
    trigger: "delivery.created",
    build: ({ displayId, certificateUrl }) => deliveryEmail({ displayId, certificateUrl }),
  })
}

export const config: SubscriberConfig = {
  event: FulfillmentWorkflowEvents.DELIVERY_CREATED,
}
