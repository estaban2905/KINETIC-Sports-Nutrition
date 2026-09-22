import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
      "fulfillment_status",
      "payment_status",
      "created_at",
      "total",
      "currency_code",
      "fulfillments.id",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.labels.tracking_number",
      "fulfillments.labels.tracking_url",
    ],
    // display_id filter/fulfillment_status/payment_status typings lag behind
    // the real Order entity fields in this Medusa version.
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
      fulfillment_status: order.fulfillment_status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      total: order.total,
      currency_code: order.currency_code,
      fulfillments: order.fulfillments ?? [],
    },
  })
}
