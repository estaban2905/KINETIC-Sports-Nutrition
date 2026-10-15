import {
  deriveCustomerStatus,
  deriveFulfillmentStatus,
  derivePaymentStatus,
} from "./order-status"

/** Campos del pedido que hacen falta para armar el resumen de estado/seguimiento. */
export const ORDER_SUMMARY_FIELDS = [
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
]

/**
 * Arma el resumen de estado y seguimiento de un pedido (customer_status,
 * fulfillments con tracking). Lo comparten el seguimiento de invitados
 * (/store/order-lookup) y el historial del cliente (/store/customers/me/orders).
 *
 * Los campos se copian uno por uno: fulfillment.data también guarda la
 * etiqueta de envío y otros internos del proveedor que nunca deben salir.
 */
export function buildOrderSummary(order: any) {
  const fulfillmentStatus = deriveFulfillmentStatus(order.fulfillments)
  const paymentStatus = derivePaymentStatus(order.payment_collections)
  const trackingEvents = (order.fulfillments ?? [])
    .filter((f: any) => !f.canceled_at)
    .flatMap((f: any) => (Array.isArray(f.data?.tracking_events) ? f.data.tracking_events : []))

  return {
    id: order.id,
    display_id: order.display_id,
    status: order.status,
    customer_status: deriveCustomerStatus({
      orderStatus: order.status,
      paymentStatus,
      fulfillmentStatus,
      trackingEvents,
    }),
    fulfillment_status: fulfillmentStatus,
    payment_status: paymentStatus,
    created_at: order.created_at,
    total: order.total,
    currency_code: order.currency_code,
    fulfillments: (order.fulfillments ?? []).map((f: any) => ({
      id: f.id,
      shipped_at: f.shipped_at,
      delivered_at: f.delivered_at,
      labels: f.labels,
      tracking_events: Array.isArray(f.data?.tracking_events) ? f.data.tracking_events : [],
      tracking_status: typeof f.data?.tracking_status === "string" ? f.data.tracking_status : null,
      // Chilexpress's delivery certificate PDF; only a plain https link is passed on.
      tracking_certificate_url:
        typeof f.data?.tracking_certificate_url === "string" &&
        f.data.tracking_certificate_url.startsWith("https://")
          ? f.data.tracking_certificate_url
          : null,
    })),
  }
}
