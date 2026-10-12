import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deriveFulfillmentStatus, derivePaymentStatus } from "../../../lib/order-status"

/**
 * Guest order tracking: no customer-account system exists yet, so the
 * customer proves ownership of the order with display_id + email instead of
 * logging in. Only status/tracking fields are returned — never the address
 * or line items of someone else's order.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { display_id, email } = (req.body ?? {}) as {
    display_id?: string
    email?: string
  }

  if (!display_id || !email) {
    res.status(400).json({ message: "Debes indicar el número de pedido y el email." })
    return
  }

  const displayIdNumber = Number(display_id)
  if (!Number.isInteger(displayIdNumber)) {
    res.status(400).json({ message: "Número de pedido inválido." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "status",
      "created_at",
      "total",
      "currency_code",
      "payment_collections.status",
      "payment_collections.amount",
      "payment_collections.captured_amount",
      "fulfillments.id",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "fulfillments.data",
      "fulfillments.labels.tracking_number",
      "fulfillments.labels.tracking_url",
    ],
    // display_id filter typings lag behind the real Order entity fields in
    // this Medusa version.
    filters: { display_id: displayIdNumber } as any,
    pagination: { take: 1 },
  })

  const order = orders[0] as any
  if (!order || order.email?.toLowerCase() !== email.trim().toLowerCase()) {
    res.status(404).json({ message: "No encontramos un pedido con esos datos." })
    return
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      fulfillment_status: deriveFulfillmentStatus(order.fulfillments),
      payment_status: derivePaymentStatus(order.payment_collections),
      created_at: order.created_at,
      total: order.total,
      currency_code: order.currency_code,
      // Whitelisted field by field: fulfillment.data also holds the shipping
      // label and other provider internals that must never reach a guest.
      fulfillments: (order.fulfillments ?? []).map((f: any) => ({
        id: f.id,
        shipped_at: f.shipped_at,
        delivered_at: f.delivered_at,
        labels: f.labels,
        tracking_events: Array.isArray(f.data?.tracking_events) ? f.data.tracking_events : [],
        tracking_status: typeof f.data?.tracking_status === "string" ? f.data.tracking_status : null,
      })),
    },
  })
}
