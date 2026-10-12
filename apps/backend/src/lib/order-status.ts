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

/**
 * What the customer is told, in ONE value, instead of the three technical
 * fields (order / payment / fulfillment status) that contradicted each other
 * ("Pendiente" + "Pago confirmado" + "Despachado" while Chilexpress hadn't
 * even received the package). The storefront owns the wording per code.
 */
export type CustomerStatus =
  | "payment_pending"
  | "payment_confirming"
  | "preparing"
  | "shipment_created"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "canceled"

/**
 * Chilexpress `code.eventCode` values from the sample response in the API
 * Envíos "Consulta Individual De Envío" docs. Only these four are
 * documented; any other code is ignored here (the event still shows in the
 * customer's history with its own text) and the status falls back to the
 * Medusa fulfillment state.
 */
const CHILEXPRESS_EVENT_STATUS: Record<string, CustomerStatus> = {
  "4": "shipped", // RECEPCIONADO
  "11": "in_transit", // PIEZA EN TRANSITO AL DESTINO
  "13": "out_for_delivery", // PIEZA EN RUTA
  "14": "delivered", // PIEZA ENTREGADA A DESTINATARIO
}

type TrackingEventLike = { at?: string | null; code?: string | null }

/**
 * True once any documented Chilexpress event exists — i.e. Chilexpress has the
 * package (4 = received, 11 = in transit, 13 = on its route, 14 = delivered).
 * The sync job uses this to mark the Medusa fulfillment as shipped by itself.
 */
export function chilexpressHasPackage(events: TrackingEventLike[] | undefined): boolean {
  return (events ?? []).some((event) => event.code != null && event.code in CHILEXPRESS_EVENT_STATUS)
}

export function deriveCustomerStatus(args: {
  orderStatus?: string | null
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  /** Chilexpress events from every fulfillment of the order, any order. */
  trackingEvents?: TrackingEventLike[]
}): CustomerStatus {
  const { orderStatus, paymentStatus, fulfillmentStatus } = args

  if (orderStatus === "canceled") return "canceled"
  if (fulfillmentStatus === "delivered") return "delivered"

  // Newest event wins. Chilexpress's own event is ahead of Medusa's
  // shipped/delivered flags, which only change when someone (or the sync job)
  // updates them.
  const newest = [...(args.trackingEvents ?? [])].sort((a, b) =>
    (b.at ?? "").localeCompare(a.at ?? "")
  )[0]
  const fromEvent = newest?.code ? CHILEXPRESS_EVENT_STATUS[newest.code] : undefined
  if (fromEvent) return fromEvent

  if (fulfillmentStatus === "shipped") return "shipped"
  if (fulfillmentStatus === "fulfilled") return "shipment_created"

  if (paymentStatus === "captured") return "preparing"
  if (paymentStatus === "authorized") return "payment_confirming"
  if (paymentStatus === "canceled") return "canceled"
  return "payment_pending"
}

export function deriveFulfillmentStatus(fulfillments: Fulfillment[] | undefined): FulfillmentStatus {
  const active = (fulfillments ?? []).filter((f) => !f.canceled_at)
  if (!active.length) return "not_fulfilled"
  if (active.every((f) => f.delivered_at)) return "delivered"
  if (active.every((f) => f.shipped_at || f.delivered_at)) return "shipped"
  return "fulfilled"
}
