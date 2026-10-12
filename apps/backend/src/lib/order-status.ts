// payment_status / fulfillment_status are computed fields the admin API adds
// to an order; query.graph({ entity: "order" }) doesn't return them (they
// came back undefined, leaving the storefront's tracking page blank). These
// derive the same information from the underlying records.

type PaymentCollection = {
  status?: string | null
  amount?: number | string | null
  captured_amount?: number | string | null
}

type Fulfillment = {
  shipped_at?: string | Date | null
  delivered_at?: string | Date | null
  canceled_at?: string | Date | null
}

export type PaymentStatus = "captured" | "authorized" | "awaiting" | "canceled"
export type FulfillmentStatus = "not_fulfilled" | "fulfilled" | "shipped" | "delivered"

export function derivePaymentStatus(collections: PaymentCollection[] | undefined): PaymentStatus {
  const list = collections ?? []
  if (!list.length) return "awaiting"

  const fullyCaptured = list.every((c) => {
    const amount = Number(c.amount ?? 0)
    return amount > 0 && Number(c.captured_amount ?? 0) >= amount
  })
  if (fullyCaptured) return "captured"
  if (list.every((c) => c.status === "canceled")) return "canceled"
  if (list.some((c) => c.status === "authorized" || c.status === "partially_authorized")) {
    return "authorized"
  }
  return "awaiting"
}

export function deriveFulfillmentStatus(fulfillments: Fulfillment[] | undefined): FulfillmentStatus {
  const active = (fulfillments ?? []).filter((f) => !f.canceled_at)
  if (!active.length) return "not_fulfilled"
  if (active.every((f) => f.delivered_at)) return "delivered"
  if (active.every((f) => f.shipped_at || f.delivered_at)) return "shipped"
  return "fulfilled"
}
