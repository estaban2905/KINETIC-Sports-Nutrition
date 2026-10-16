import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { OneclickClient } from "../lib/oneclick"
import { withLock } from "../lib/order-lock"
import { Sentry } from "../lib/sentry"
import { buildCycleDeps } from "../lib/subscription-order"
import { reconcileSubscriptionCycles } from "../lib/subscription-reconcile"

/**
 * Cierra los ciclos de suscripción que quedaron a medias (proceso caído a mitad
 * de un cobro, resultado ambiguo de Transbank, cobrado sin pedido). Pregunta a
 * Transbank por la verdad y nunca cobra de nuevo: ver lib/subscription-reconcile.ts.
 */
export default async function reconcileSubscriptionCyclesJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const subscriptions = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)
  const cycleDeps = buildCycleDeps(container)
  const oneclick = OneclickClient.fromEnv()

  await reconcileSubscriptionCycles({
    async listStuck(staleBefore) {
      const rows = await subscriptions.listSubscriptionCycles({
        $or: [
          { status: "charged_pending_order" },
          { status: "reserved", attempted_at: { $lt: staleBefore } },
        ],
      } as any)
      return rows as any
    },
    async cycleStatus(cycleId) {
      try {
        return (await subscriptions.retrieveSubscriptionCycle(cycleId)).status as string
      } catch {
        return null
      }
    },
    retrieveSubscription: (id) => subscriptions.retrieveSubscription(id) as any,
    updateSubscriptions: (data) => subscriptions.updateSubscriptions(data as any),
    updateCycle: (data) => subscriptions.updateSubscriptionCycles(data as any),
    async findOrderForCycle(cycleId) {
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "total"],
        filters: { metadata: { subscription_cycle_id: cycleId } } as any,
      })
      const order = data[0] as { id: string; total: number } | undefined
      return order ? { id: order.id, total: Number(order.total) } : null
    },
    chargeStatus: (parent) => oneclick.chargeStatus(parent),
    placeOrder: (input) => cycleDeps.placeOrder(input),
    withLock: (key, job) => withLock(container, key, job),
    alert: (message, extra) => Sentry.captureMessage(message, { level: "error", extra }),
    logger,
    giftVariantId: cycleDeps.giftVariantId,
  })
}

export const config = {
  name: "reconcile-subscription-cycles",
  schedule: "*/15 * * * *",
}
