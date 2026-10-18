import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { orderPaymentPendingEmail, orderPlacedEmail } from "./email-templates"
import { withLock } from "./order-lock"
import { derivePaymentStatus, isOrderPaid } from "./order-status"

/** Marcas en order.metadata para no repetir el mismo correo si llegan varios eventos. */
export const CONFIRMATION_FLAG = "confirmation_emailed"
export const PENDING_PAYMENT_FLAG = "payment_pending_emailed"

export type OrderEmailKind = "confirmation" | "payment_pending" | "skip"

/**
 * Qué correo corresponde según el estado del pago:
 * - pagado: confirmación (una sola vez);
 * - esperando pago (transferencia sin acreditar): aviso de "te esperamos" (una sola vez,
 *   y nunca si la confirmación ya salió);
 * - cancelado: nada.
 */
export function decideOrderEmail(order: {
  metadata?: Record<string, any> | null
  payment_collections?: any[]
}): OrderEmailKind {
  const flags = order.metadata ?? {}
  if (isOrderPaid(order.payment_collections)) {
    return flags[CONFIRMATION_FLAG] ? "skip" : "confirmation"
  }
  if (derivePaymentStatus(order.payment_collections) === "canceled") return "skip"
  return flags[PENDING_PAYMENT_FLAG] || flags[CONFIRMATION_FLAG] ? "skip" : "payment_pending"
}

const EMAIL_ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "metadata",
  "total",
  "item_subtotal",
  "discount_total",
  "shipping_total",
  "payment_collections.status",
  "payment_collections.amount",
  "payment_collections.captured_amount",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.total",
  "items.thumbnail",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
]

/**
 * Envía el correo que corresponde al estado actual del pedido (ver decideOrderEmail).
 * Se llama al crearse el pedido y de nuevo cuando se captura el pago; las marcas
 * en metadata evitan duplicados. Lanza si falla el envío (el que llama lo reporta).
 */
export async function sendOrderStatusEmail(container: MedusaContainer, orderId: string): Promise<OrderEmailKind> {
  // Misma clave que la boleta: los dos reescriben order.metadata, así que no pueden correr a la vez
  // (y dos eventos casi simultáneos no deben mandar el correo dos veces).
  return withLock(container, `order-docs:${orderId}`, () => sendOrderStatusEmailUnlocked(container, orderId))
}

async function sendOrderStatusEmailUnlocked(container: MedusaContainer, orderId: string): Promise<OrderEmailKind> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({ entity: "order", fields: EMAIL_ORDER_FIELDS, filters: { id: orderId } })
  const order = data[0] as any
  if (!order) return "skip"
  if (!order.email) {
    logger.warn(`Orden ${orderId} no tiene email, se omite notificación.`)
    return "skip"
  }

  const kind = decideOrderEmail(order)
  if (kind === "skip") return kind

  const { subject, html } = kind === "confirmation" ? orderPlacedEmail(order) : orderPaymentPendingEmail(order)
  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: order.email,
    channel: "email",
    content: { subject, html },
    data: { order_id: order.id },
    trigger_type: kind === "confirmation" ? "order.placed" : "order.payment_pending",
    resource_id: order.id,
    resource_type: "order",
  })

  const flag = kind === "confirmation" ? CONFIRMATION_FLAG : PENDING_PAYMENT_FLAG
  await container.resolve(Modules.ORDER).updateOrders(order.id, {
    metadata: { ...order.metadata, [flag]: true },
  })
  return kind
}
