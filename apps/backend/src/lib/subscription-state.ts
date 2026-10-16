import { MedusaError } from "@medusajs/framework/utils"

/**
 * Estados de una suscripción y las únicas transiciones permitidas entre ellos.
 *
 * - pending_card: creada, falta inscribir la tarjeta. No se cobra.
 * - active: cobrándose cada ciclo.
 * - paused: el cliente la pausó. No se cobra hasta reanudar.
 * - past_due: se agotaron los reintentos de cobro. No se cobra hasta que el
 *   cliente actualice la tarjeta (o soporte la reactive).
 * - cancelled: terminal. Para volver a suscribirse se crea otra.
 */
export const SUBSCRIPTION_STATUSES = [
  "pending_card",
  "active",
  "paused",
  "past_due",
  "cancelled",
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

const TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  pending_card: ["active", "cancelled"],
  active: ["paused", "past_due", "cancelled"],
  paused: ["active", "cancelled"],
  past_due: ["active", "paused", "cancelled"],
  cancelled: [],
}

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** Lanza un error 400 si la transición no está permitida. */
export function assertTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!canTransition(from, to)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `No se puede pasar una suscripción de "${from}" a "${to}".`
    )
  }
}

/** Solo las activas se cobran. */
export function isBillable(status: SubscriptionStatus): boolean {
  return status === "active"
}
