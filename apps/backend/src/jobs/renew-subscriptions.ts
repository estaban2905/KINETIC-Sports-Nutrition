import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { withLock } from "../lib/order-lock"
import { Sentry } from "../lib/sentry"
import { renewDueSubscriptions } from "../lib/subscription-renewal"
import { buildCycleDeps, runSubscriptionCycle } from "../lib/subscription-order"

// Transbank y Chilexpress no son para ráfagas: una renovación cada medio segundo.
const PAUSE_MS = 500

/**
 * Cobra cada día las suscripciones activas cuyo día de cobro ya llegó. El
 * detalle de qué hacer con cada resultado (rechazo, sin stock, ambiguo) vive en
 * lib/subscription-cycle.ts; lo que quede a medias lo cierra
 * reconcile-subscription-cycles.
 */
export default async function renewSubscriptions(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)
  const cycleDeps = buildCycleDeps(container)

  await renewDueSubscriptions({
    async listDue(today, limit) {
      return subscriptions.listSubscriptions(
        { status: "active", next_billing_date: { $lte: today } } as any,
        { select: ["id"], take: limit, order: { next_billing_date: "ASC" } }
      )
    },
    async countPastDue() {
      const [, count] = await subscriptions.listAndCountSubscriptions({ status: "past_due" }, { take: 1 })
      return count
    },
    withLock: (key, job) => withLock(container, key, job),
    runCycle: (id) => runSubscriptionCycle(cycleDeps, id),
    alert: (message, extra) => Sentry.captureMessage(message, { level: "error", extra }),
    logger,
    pause: () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS)),
  })
}

export const config = {
  name: "renew-subscriptions",
  // 12:00 UTC = 08:00 o 09:00 en Chile según el horario de verano.
  schedule: "0 12 * * *",
}
