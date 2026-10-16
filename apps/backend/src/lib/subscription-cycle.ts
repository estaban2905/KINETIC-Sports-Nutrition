import { chileToday, addDays, isDue } from "./billing-period"
import { describeError } from "./describe-error"
import { takeChargeOutcome, type ChargeOutcome } from "./charge-outcomes"
import { buildBuyOrders } from "./oneclick"
import { decideAfterRejection, skipUpdate, successUpdate } from "./subscription-billing"
import type { SubscriptionStatus } from "./subscription-state"

/**
 * Un ciclo de cobro de una suscripción: reservar el día, crear el pedido y
 * cobrar (el cargo ocurre dentro de la autorización del pago, ver
 * modules/payment-oneclick), y dejar la suscripción lista para el próximo ciclo.
 *
 * Orden de las garantías:
 *  1. Antes de cualquier efecto se RESERVA el ciclo (índice único por suscripción
 *     y día): dos ejecuciones simultáneas no pueden cobrar dos veces.
 *  2. Si no hay stock se SALTA el ciclo sin cobrar ni castigar al cliente.
 *  3. Un rechazo del banco cuenta como intento fallido (reintento mañana, y tras
 *     MAX_CHARGE_ATTEMPTS pasa a past_due).
 *  4. Un resultado ambiguo o un fallo tras el cargo NO se reintenta a ciegas: el
 *     ciclo queda marcado para conciliar contra Transbank.
 *  5. Un fallo del sistema antes de cobrar reintenta mañana SIN contar como
 *     rechazo del cliente.
 */

export type CycleSubscription = {
  id: string
  customer_id: string
  variant_id: string
  quantity: number
  status: SubscriptionStatus
  frequency_days: number
  discount_percent: number
  next_billing_date: string | null
  payment_token_ref: string | null
  welcome_gift_given: boolean
  failed_attempts: number
}

export type CycleRow = { id: string; subscription_id: string; period_key: string; attempt: number }

export type PlaceOrderInput = {
  subscription: CycleSubscription
  cycleId: string
  periodKey: string
  parentBuyOrder: string
  childBuyOrder: string
  includeGift: boolean
}

export type CycleEvent =
  | { type: "charged"; subscriptionId: string; orderId: string; amount: number }
  | { type: "rejected"; subscriptionId: string; willRetryOn: string | null; pastDue: boolean }
  | { type: "skipped_no_stock"; subscriptionId: string }

export type CycleDeps = {
  subscriptions: {
    retrieveSubscription(id: string): Promise<CycleSubscription>
    updateSubscriptions(data: Record<string, unknown>): Promise<unknown>
    transitionStatus(id: string, to: SubscriptionStatus): Promise<unknown>
    reserveCycle(subscriptionId: string, periodKey: string, attempt: number): Promise<CycleRow | null>
    updateSubscriptionCycles(data: Record<string, unknown>): Promise<unknown>
  }
  /** Hay stock de la variante para la cantidad pedida. */
  hasStock(input: { variantId: string; quantity: number }): Promise<boolean>
  /** Crea el pedido y lo cobra. Lanza si no se pudo. */
  placeOrder(input: PlaceOrderInput): Promise<{ orderId: string; total: number }>
  /** El id de la variante del regalo de bienvenida, si hay uno configurado. */
  giftVariantId?: string | null
  /** Aviso al cliente (correos). Nunca debe romper el ciclo. */
  notify?(event: CycleEvent): Promise<void>
  report?(err: unknown, context: Record<string, unknown>): void
  logger?: { warn(msg: string): void; error(msg: string): void }
  takeOutcome?: (cycleId: string) => ChargeOutcome | undefined
  now?: () => Date
}

export type CycleResult =
  | { result: "completed"; orderId: string; amount: number }
  | { result: "skipped"; reason: "not_active" | "not_due" | "no_card" | "already_reserved" }
  | { result: "skipped_no_stock" }
  | { result: "rejected"; pastDue: boolean }
  | { result: "needs_reconciliation"; cycleId: string }
  | { result: "error"; cycleId: string }

const msg = describeError

async function safeNotify(deps: CycleDeps, event: CycleEvent) {
  try {
    await deps.notify?.(event)
  } catch (err) {
    deps.logger?.warn(`[subscription] no se pudo avisar (${event.type}): ${msg(err)}`)
  }
}

export async function runSubscriptionCycle(deps: CycleDeps, subscriptionId: string): Promise<CycleResult> {
  const now = deps.now?.() ?? new Date()
  const sub = await deps.subscriptions.retrieveSubscription(subscriptionId)

  if (sub.status !== "active") return { result: "skipped", reason: "not_active" }
  if (!sub.next_billing_date || !isDue(sub.next_billing_date, now)) return { result: "skipped", reason: "not_due" }
  if (!sub.payment_token_ref) return { result: "skipped", reason: "no_card" }

  const periodKey = sub.next_billing_date
  const attempt = sub.failed_attempts + 1

  // 1) Reserva: solo un proceso puede seguir adelante para este día.
  const cycle = await deps.subscriptions.reserveCycle(sub.id, periodKey, attempt)
  if (!cycle) return { result: "skipped", reason: "already_reserved" }

  const fail = (status: string, error: string, extra: Record<string, unknown> = {}) =>
    deps.subscriptions.updateSubscriptionCycles({ id: cycle.id, status, error, ...extra })

  // 2) Sin stock: se salta el ciclo, sin cobrar.
  if (!(await deps.hasStock({ variantId: sub.variant_id, quantity: sub.quantity }))) {
    await fail("failed", "sin_stock")
    await deps.subscriptions.updateSubscriptions({ id: sub.id, ...skipUpdate(sub, periodKey, now) })
    await safeNotify(deps, { type: "skipped_no_stock", subscriptionId: sub.id })
    return { result: "skipped_no_stock" }
  }

  const includeGift = !sub.welcome_gift_given && !!deps.giftVariantId
  const buyOrders = buildBuyOrders(sub.id, periodKey, attempt)

  let placed: { orderId: string; total: number }
  try {
    placed = await deps.placeOrder({
      subscription: sub,
      cycleId: cycle.id,
      periodKey,
      parentBuyOrder: buyOrders.parent,
      childBuyOrder: buyOrders.child,
      includeGift,
    })
  } catch (err) {
    const outcome = (deps.takeOutcome ?? takeChargeOutcome)(cycle.id)

    // 3) Rechazo del banco.
    if (outcome?.kind === "rejected") {
      await fail("failed", `rechazado: ${outcome.detail}`)
      const decision = decideAfterRejection(sub.failed_attempts, now)
      if (decision.action === "retry") {
        await deps.subscriptions.updateSubscriptions({
          id: sub.id,
          failed_attempts: decision.failedAttempts,
          next_billing_date: decision.nextBillingDate,
        })
        await safeNotify(deps, {
          type: "rejected",
          subscriptionId: sub.id,
          willRetryOn: decision.nextBillingDate,
          pastDue: false,
        })
        return { result: "rejected", pastDue: false }
      }
      await deps.subscriptions.transitionStatus(sub.id, "past_due")
      await deps.subscriptions.updateSubscriptions({
        id: sub.id,
        failed_attempts: decision.failedAttempts,
        next_billing_date: null,
      })
      await safeNotify(deps, { type: "rejected", subscriptionId: sub.id, willRetryOn: null, pastDue: true })
      return { result: "rejected", pastDue: true }
    }

    // 4) Ambiguo, o se cobró y falló un paso posterior: a conciliar, nunca a reintentar.
    if (outcome?.kind === "ambiguous" || outcome?.kind === "authorized") {
      const reason =
        outcome.kind === "ambiguous"
          ? `ambiguo: ${outcome.detail}`
          : `cobrado pero el pedido falló: ${msg(err)}`
      await fail("charged_pending_order", reason)
      deps.logger?.error(`[subscription] ciclo ${cycle.id} requiere conciliación: ${reason}`)
      deps.report?.(err, { cycleId: cycle.id, subscriptionId: sub.id, outcome: outcome.kind })
      return { result: "needs_reconciliation", cycleId: cycle.id }
    }

    // 5) Falló algo antes de cobrar: no es culpa del cliente. Mañana de nuevo, sin contar rechazo.
    await fail("failed", `error del sistema: ${msg(err)}`)
    await deps.subscriptions.updateSubscriptions({ id: sub.id, next_billing_date: addDays(chileToday(now), 1) })
    deps.logger?.error(`[subscription] ciclo ${cycle.id} falló antes de cobrar: ${msg(err)}`)
    deps.report?.(err, { cycleId: cycle.id, subscriptionId: sub.id })
    return { result: "error", cycleId: cycle.id }
  }

  // Cobrado y con pedido: se cierra el ciclo y se agenda el siguiente.
  await deps.subscriptions.updateSubscriptionCycles({
    id: cycle.id,
    status: "completed",
    order_id: placed.orderId,
    amount: placed.total,
    error: null,
  })
  await deps.subscriptions.updateSubscriptions({ id: sub.id, ...successUpdate(sub, periodKey, now) })
  await safeNotify(deps, { type: "charged", subscriptionId: sub.id, orderId: placed.orderId, amount: placed.total })
  return { result: "completed", orderId: placed.orderId, amount: placed.total }
}

/**
 * Pone en marcha una suscripción cuya tarjeta quedó inscrita: la pendiente de
 * tarjeta o la vencida (past_due) pasan a activas con cobro para hoy y se cobra
 * ya. Si estaba activa o pausada (solo cambió de tarjeta) no hace nada más.
 */
export async function activateAndCharge(deps: CycleDeps, subscriptionId: string): Promise<CycleResult | null> {
  const sub = await deps.subscriptions.retrieveSubscription(subscriptionId)
  if (sub.status !== "pending_card" && sub.status !== "past_due") return null
  if (!sub.payment_token_ref) return null

  await deps.subscriptions.transitionStatus(sub.id, "active")
  await deps.subscriptions.updateSubscriptions({
    id: sub.id,
    failed_attempts: 0,
    next_billing_date: chileToday(deps.now?.() ?? new Date()),
  })
  return runSubscriptionCycle(deps, sub.id)
}
