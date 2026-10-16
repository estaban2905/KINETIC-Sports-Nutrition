import { addDays, chileToday } from "./billing-period"
import { describeError } from "./describe-error"

/**
 * Aviso previo al cobro: unos días antes del día de cobro se le dice al cliente
 * cuánto y cuándo se le cobrará, para que pueda cambiar, pausar o cancelar a
 * tiempo. `reminder_sent_for` guarda el día de cobro ya avisado, así un job que
 * corre dos veces (o se reintenta) no avisa dos veces.
 */

export const REMINDER_DAYS_BEFORE = 3

export type ReminderCandidate = {
  id: string
  next_billing_date: string | null
  reminder_sent_for: string | null
}

export type ReminderDeps = {
  /** Suscripciones activas cuyo día de cobro es `billingDate`. */
  listAhead(billingDate: string): Promise<ReminderCandidate[]>
  /** Monto estimado del próximo cobro, en pesos. */
  estimateAmount(subscriptionId: string): Promise<number>
  send(input: { subscriptionId: string; amount: number }): Promise<void>
  markSent(subscriptionId: string, billingDate: string): Promise<void>
  logger: { info(msg: string): void; error(msg: string): void }
  now?: () => Date
}

export type ReminderSummary = { candidates: number; sent: number; skipped: number; failed: number }

export async function sendBillingReminders(deps: ReminderDeps): Promise<ReminderSummary> {
  const target = addDays(chileToday(deps.now?.()), REMINDER_DAYS_BEFORE)
  const candidates = await deps.listAhead(target)
  const summary: ReminderSummary = { candidates: candidates.length, sent: 0, skipped: 0, failed: 0 }

  for (const sub of candidates) {
    // Nunca dos avisos para el mismo día de cobro.
    if (sub.next_billing_date !== target || sub.reminder_sent_for === target) {
      summary.skipped++
      continue
    }
    try {
      const amount = await deps.estimateAmount(sub.id)
      await deps.send({ subscriptionId: sub.id, amount })
      // Se marca solo si el aviso salió: si falló, la próxima corrida lo reintenta.
      await deps.markSent(sub.id, target)
      summary.sent++
    } catch (err) {
      summary.failed++
      deps.logger.error(`[remind-subscriptions] ${sub.id}: ${describeError(err)}`)
    }
  }

  if (candidates.length) {
    deps.logger.info(
      `[remind-subscriptions] ${summary.sent} aviso(s) enviado(s), ${summary.skipped} omitido(s), ${summary.failed} con error.`
    )
  }
  return summary
}
