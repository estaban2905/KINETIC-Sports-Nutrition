import { nextBillingDate, addDays, chileToday } from "./billing-period"

/** Intentos de cobro seguidos antes de pasar la suscripción a past_due. */
export const MAX_CHARGE_ATTEMPTS = 3
/** Días entre un cobro rechazado y su reintento. */
export const RETRY_DELAY_DAYS = 1

/**
 * Precio unitario con el descuento de la suscripción, en pesos enteros. El
 * precio de lista sale siempre de la variante vigente, nunca de la suscripción.
 */
export function discountedUnitPrice(listPrice: number, discountPercent: number): number {
  if (!Number.isFinite(listPrice) || listPrice < 0) {
    throw new Error(`Precio inválido: ${listPrice}`)
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error(`Descuento inválido: ${discountPercent}`)
  }
  return Math.round((listPrice * (100 - discountPercent)) / 100)
}

export type RejectionDecision =
  | { action: "retry"; failedAttempts: number; nextBillingDate: string }
  | { action: "past_due"; failedAttempts: number }

/**
 * Qué hacer con la suscripción tras un cobro rechazado: reintentar mañana, o
 * pasarla a past_due si ya se agotaron los intentos. `failedAttemptsBefore` son
 * los rechazos seguidos previos a este.
 */
export function decideAfterRejection(failedAttemptsBefore: number, now: Date = new Date()): RejectionDecision {
  const failedAttempts = failedAttemptsBefore + 1
  if (failedAttempts >= MAX_CHARGE_ATTEMPTS) return { action: "past_due", failedAttempts }
  return {
    action: "retry",
    failedAttempts,
    nextBillingDate: addDays(chileToday(now), RETRY_DELAY_DAYS),
  }
}

/**
 * Campos a actualizar tras un ciclo cobrado: sin rechazos pendientes, regalo de
 * bienvenida ya entregado y próximo cobro. `scheduledFor` es el día de cobro del
 * ciclo (no el de hoy), para que un atraso no corra el día de cobro.
 */
export function successUpdate(
  sub: { frequency_days: number },
  scheduledFor: string,
  now: Date = new Date()
) {
  return {
    failed_attempts: 0,
    welcome_gift_given: true,
    next_billing_date: nextBillingDate(scheduledFor, sub.frequency_days, now),
  }
}

/** Fecha del próximo ciclo cuando se SALTA uno (p. ej. sin stock): sin cobrar y sin contar rechazo. */
export function skipUpdate(sub: { frequency_days: number }, scheduledFor: string, now: Date = new Date()) {
  return { next_billing_date: nextBillingDate(scheduledFor, sub.frequency_days, now) }
}
