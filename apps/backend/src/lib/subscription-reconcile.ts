import { addDays, chileToday } from "./billing-period"
import { describeError } from "./describe-error"
import { buildBuyOrders, isDefinitiveChargeFailure, type ChargeResult } from "./oneclick"
import { successUpdate } from "./subscription-billing"
import type { CycleSubscription, PlaceOrderInput } from "./subscription-cycle"

/**
 * Conciliación de ciclos que quedaron a medias. Un ciclo queda así cuando:
 *  - `reserved` por mucho rato: el proceso murió después de reservar el día;
 *  - `charged_pending_order`: el resultado del cobro fue ambiguo, o se cobró y
 *    falló un paso posterior.
 * La verdad está en Transbank: se le pregunta por la orden de compra del ciclo
 * (son deterministas) y según la respuesta se cierra el ciclo o se reintenta
 * SOLO la creación del pedido, que reutiliza el cobro ya hecho. Nunca se cobra
 * de nuevo desde aquí.
 */

/** Un ciclo `reserved` más viejo que esto se considera abandonado. */
export const STALE_RESERVED_MINUTES = 15

export type StuckCycle = {
  id: string
  subscription_id: string
  period_key: string
  attempt: number
  status: "reserved" | "charged_pending_order"
}

export type ReconcileDeps = {
  listStuck(staleBefore: Date): Promise<StuckCycle[]>
  /** Estado actual del ciclo (puede haber cambiado mientras se esperaba el candado). */
  cycleStatus(cycleId: string): Promise<string | null>
  retrieveSubscription(id: string): Promise<CycleSubscription>
  updateSubscriptions(data: Record<string, unknown>): Promise<unknown>
  updateCycle(data: Record<string, unknown>): Promise<unknown>
  /** Pedido ya creado para el ciclo, si existe. */
  findOrderForCycle(cycleId: string): Promise<{ id: string; total: number } | null>
  chargeStatus(parentBuyOrder: string): Promise<ChargeResult>
  placeOrder(input: PlaceOrderInput): Promise<{ orderId: string; total: number }>
  withLock<T>(key: string, job: () => Promise<T>): Promise<T>
  alert(message: string, extra: Record<string, unknown>): void
  logger: { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
  giftVariantId?: string | null
  now?: () => Date
}

export type ReconcileOutcome =
  | "completed" // cobro confirmado y pedido existente o recién creado
  | "released" // Transbank no tiene cobro: se libera el ciclo
  | "still_stuck" // se cobró pero no se pudo crear el pedido todavía
  | "unknown" // no se pudo consultar a Transbank; se reintenta en la próxima corrida
  | "skipped" // otro proceso ya lo resolvió mientras se esperaba el candado

export type ReconcileSummary = Record<ReconcileOutcome, number>

async function reconcileOne(deps: ReconcileDeps, cycle: StuckCycle): Promise<ReconcileOutcome> {
  const now = deps.now?.() ?? new Date()
  if ((await deps.cycleStatus(cycle.id)) !== cycle.status) return "skipped"
  const sub = await deps.retrieveSubscription(cycle.subscription_id)
  const orders = buildBuyOrders(sub.id, cycle.period_key, cycle.attempt)

  let charge: ChargeResult
  try {
    charge = await deps.chargeStatus(orders.parent)
  } catch (err) {
    if (!isDefinitiveChargeFailure(err)) {
      deps.logger.warn(`[reconcile-subscriptions] ${cycle.id}: no se pudo consultar a Transbank: ${describeError(err)}`)
      return "unknown"
    }
    // Transbank no conoce la orden: nunca se cobró.
    charge = { ok: false, code: null, status: null }
  }

  // --- No hay cobro: se libera el ciclo; si aún era el vigente, reintenta mañana sin castigo.
  if (!charge.ok) {
    await deps.updateCycle({
      id: cycle.id,
      status: "failed",
      error:
        cycle.status === "reserved"
          ? "interrumpido antes de cobrar (conciliado)"
          : "sin cobro en Transbank (conciliado)",
    })
    if (sub.status === "active" && sub.next_billing_date === cycle.period_key) {
      await deps.updateSubscriptions({ id: sub.id, next_billing_date: addDays(chileToday(now), 1) })
    }
    return "released"
  }

  // --- Hay cobro: tiene que existir un pedido.
  const existing = await deps.findOrderForCycle(cycle.id)
  let orderId = existing?.id
  let total = existing?.total ?? charge.amount

  if (!orderId) {
    try {
      const placed = await deps.placeOrder({
        subscription: sub,
        cycleId: cycle.id,
        periodKey: cycle.period_key,
        parentBuyOrder: orders.parent,
        childBuyOrder: orders.child,
        includeGift: !sub.welcome_gift_given && !!deps.giftVariantId,
      })
      orderId = placed.orderId
      total = placed.total
    } catch (err) {
      deps.logger.error(
        `[reconcile-subscriptions] ${cycle.id}: cobrado (${orders.parent}) pero no se pudo crear el pedido: ${describeError(err)}`
      )
      deps.alert("Cliente cobrado sin pedido de suscripción", {
        cycleId: cycle.id,
        subscriptionId: sub.id,
        parentBuyOrder: orders.parent,
        amount: charge.amount,
        error: describeError(err),
      })
      return "still_stuck"
    }
  }

  await deps.updateCycle({ id: cycle.id, status: "completed", order_id: orderId, amount: total, error: null })
  // Solo se avanza la fecha si la suscripción seguía esperando este mismo ciclo.
  if (sub.status === "active" && sub.next_billing_date === cycle.period_key) {
    await deps.updateSubscriptions({ id: sub.id, ...successUpdate(sub, cycle.period_key, now) })
  } else if (!sub.welcome_gift_given) {
    await deps.updateSubscriptions({ id: sub.id, welcome_gift_given: true })
  }
  return "completed"
}

export async function reconcileSubscriptionCycles(deps: ReconcileDeps): Promise<ReconcileSummary> {
  const now = deps.now?.() ?? new Date()
  const stuck = await deps.listStuck(new Date(now.getTime() - STALE_RESERVED_MINUTES * 60 * 1000))
  const summary: ReconcileSummary = { completed: 0, released: 0, still_stuck: 0, unknown: 0, skipped: 0 }

  for (const cycle of stuck) {
    try {
      // El mismo candado que usa la renovación: no se pisan.
      const outcome = await deps.withLock(`subscription:${cycle.subscription_id}`, () => reconcileOne(deps, cycle))
      summary[outcome]++
    } catch (err) {
      summary.unknown++
      deps.logger.error(`[reconcile-subscriptions] ${cycle.id}: ${describeError(err)}`)
    }
  }

  if (stuck.length) {
    deps.logger.info(
      `[reconcile-subscriptions] ${stuck.length} ciclo(s): ${summary.completed} cerrado(s), ${summary.released} liberado(s), ` +
        `${summary.still_stuck} sin resolver, ${summary.unknown} sin poder consultar.`
    )
  }
  return summary
}
