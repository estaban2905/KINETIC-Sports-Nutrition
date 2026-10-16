import { MedusaService } from "@medusajs/framework/utils"
import Subscription from "./models/subscription"
import SubscriptionCycle from "./models/subscription-cycle"
import { assertTransition, type SubscriptionStatus } from "../../lib/subscription-state"
import { isDuplicateKeyError } from "../../lib/duplicate-error"

class SubscriptionModuleService extends MedusaService({
  Subscription,
  SubscriptionCycle,
}) {
  /**
   * Cambia el estado validando la transición. Al cancelar deja la fecha y borra
   * la fecha de próximo cobro para que ningún job la tome.
   */
  async transitionStatus(id: string, to: SubscriptionStatus) {
    const current = await this.retrieveSubscription(id)
    assertTransition(current.status as SubscriptionStatus, to)
    return this.updateSubscriptions({
      id,
      status: to,
      ...(to === "cancelled" ? { cancelled_at: new Date(), next_billing_date: null } : {}),
    })
  }

  /**
   * Reserva el cobro de un día. Devuelve el ciclo si este proceso lo logró, o
   * null si ya existía (otro proceso o una ejecución anterior): en ese caso NO
   * se debe cobrar.
   */
  async reserveCycle(subscriptionId: string, periodKey: string, attempt = 1) {
    try {
      return await this.createSubscriptionCycles({
        subscription_id: subscriptionId,
        period_key: periodKey,
        attempt,
        attempted_at: new Date(),
      })
    } catch (err) {
      if (isDuplicateKeyError(err)) return null
      throw err
    }
  }
}

export default SubscriptionModuleService
