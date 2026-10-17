import { chileToday } from "./billing-period"
import { describeError } from "./describe-error"
import type { CycleResult } from "./subscription-cycle"

/**
 * Recorrido diario de renovaciones: cobra, una por una, las suscripciones activas
 * cuyo día de cobro ya llegó. Cada una corre bajo su propio candado (si dos
 * instancias del job se cruzan, la segunda espera y luego encuentra el día ya
 * reservado) y un error en una no detiene a las demás.
 */

/** Cuántas suscripciones vencidas en `past_due` se toleran antes de dar la alarma. */
export const PAST_DUE_ALERT_THRESHOLD = 5

export type RenewalDeps = {
  /** Suscripciones activas con cobro vencido a `today` (inclusive). */
  listDue(today: string, limit: number): Promise<Array<{ id: string }>>
  countPastDue(): Promise<number>
  withLock<T>(key: string, job: () => Promise<T>): Promise<T>
  runCycle(subscriptionId: string): Promise<CycleResult>
  alert(message: string, extra: Record<string, unknown>): void
  logger: { info(msg: string): void; error(msg: string): void }
  now?: () => Date
  /** Pausa entre cobros para no saturar Transbank / Chilexpress. */
  pause?: () => Promise<void>
}

export type RenewalSummary = {
  due: number
  completed: number
  rejected: number
  skipped: number
  needsReconciliation: number
  errors: number
}

const MAX_PER_RUN = 100

export async function renewDueSubscriptions(deps: RenewalDeps): Promise<RenewalSummary> {
  const today = chileToday(deps.now?.())
  const due = await deps.listDue(today, MAX_PER_RUN)
  const summary: RenewalSummary = {
    due: due.length,
    completed: 0,
    rejected: 0,
    skipped: 0,
    needsReconciliation: 0,
    errors: 0,
  }

  for (const { id } of due) {
    try {
      const result = await deps.withLock(`subscription:${id}`, () => deps.runCycle(id))
      switch (result.result) {
        case "completed":
          summary.completed++
          break
        case "rejected":
          summary.rejected++
          break
        case "needs_reconciliation":
          summary.needsReconciliation++
          break
        case "error":
          summary.errors++
          break
        default:
          summary.skipped++
      }
    } catch (err) {
      summary.errors++
      deps.logger.error(`[renew-subscriptions] ${id}: ${describeError(err)}`)
      deps.alert(`Falló la renovación de la suscripción ${id}`, { subscriptionId: id, error: describeError(err) })
    }
    await deps.pause?.()
  }

  if (due.length) {
    deps.logger.info(
      `[renew-subscriptions] ${due.length} vencida(s): ${summary.completed} cobrada(s), ${summary.rejected} rechazada(s), ` +
        `${summary.skipped} omitida(s), ${summary.needsReconciliation} a conciliar, ${summary.errors} con error.`
    )
  }

  if (summary.needsReconciliation > 0 || summary.errors > 0) {
    deps.alert("Renovaciones de suscripción con problemas", { ...summary })
  }

  const pastDue = await deps.countPastDue()
  if (pastDue >= PAST_DUE_ALERT_THRESHOLD) {
    deps.alert(`Hay ${pastDue} suscripciones en past_due`, { pastDue })
  }

  return summary
}
