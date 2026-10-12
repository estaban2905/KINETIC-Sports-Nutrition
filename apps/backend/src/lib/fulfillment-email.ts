import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/** Chilexpress's public tracking page; the OT number is typed into its form (no deep link). */
export const CHILEXPRESS_TRACKING_PAGE = "https://centrodeayuda.chilexpress.cl/seguimiento"

export type FulfillmentEmailContext = {
  displayId: number
  trackingNumbers: string[]
  isChilexpress: boolean
  certificateUrl: string | null
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Same layout as the order-placed email (subscribers/order-placed.ts). */
export function wrapEmailHtml(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      ${content}
      <p>Puedes seguir tu pedido en cualquier momento con tu número de orden y tu correo.</p>
    </div>
  `
}

/**
 * Emails the customer when one of their fulfillments changes stage
 * (shipment.created / delivery.created). Those events fire for both the admin's
 * buttons and the Chilexpress sync job, so both paths notify the same way.
 * Never throws: a failed email must not break shipping the order.
 */
export async function sendFulfillmentEmail(
  container: MedusaContainer,
  args: {
    fulfillmentId: string
    noNotification?: boolean
    trigger: "shipment.created" | "delivery.created"
    subject: (displayId: number) => string
    body: (context: FulfillmentEmailContext) => string
  }
): Promise<void> {
  if (args.noNotification) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: links } = await query.graph({
      entity: "order_fulfillment",
      fields: ["order_id"],
      filters: { fulfillment_id: args.fulfillmentId } as any,
    })
    const orderId = (links[0] as any)?.order_id
    if (!orderId) return

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "fulfillments.id",
        "fulfillments.provider_id",
        "fulfillments.data",
        "fulfillments.labels.tracking_number",
      ],
      filters: { id: orderId },
    })
    const order = orders[0] as any
    if (!order?.email) {
      logger.warn(`${args.trigger}: orden ${orderId} no tiene email, se omite notificación.`)
      return
    }

    const fulfillment = (order.fulfillments ?? []).find((f: any) => f.id === args.fulfillmentId)
    const certificateUrl =
      typeof fulfillment?.data?.tracking_certificate_url === "string" &&
      fulfillment.data.tracking_certificate_url.startsWith("https://")
        ? fulfillment.data.tracking_certificate_url
        : null

    const context: FulfillmentEmailContext = {
      displayId: order.display_id,
      trackingNumbers: (fulfillment?.labels ?? [])
        .map((label: any) => label.tracking_number)
        .filter(Boolean),
      isChilexpress: fulfillment?.provider_id === "chilexpress_chilexpress",
      certificateUrl,
    }

    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: order.email,
      channel: "email",
      content: {
        subject: args.subject(order.display_id),
        html: wrapEmailHtml(args.body(context)),
      },
      data: { order_id: order.id, fulfillment_id: args.fulfillmentId },
      trigger_type: args.trigger,
      resource_id: order.id,
      resource_type: "order",
    })
  } catch (err) {
    logger.error(
      `No se pudo enviar el email ${args.trigger} del despacho ${args.fulfillmentId}: ${
        err instanceof Error ? err.message : err
      }`
    )
  }
}
