import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { estimateCycleAmount } from "../lib/subscription-order"
import { sendSubscriptionEmail } from "../lib/subscription-notify"
import { sendBillingReminders } from "../lib/subscription-reminder"

/** Avisa a los clientes unos días antes de cobrarles la suscripción. */
export default async function remindSubscriptions(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

  await sendBillingReminders({
    async listAhead(billingDate) {
      return (await subscriptions.listSubscriptions(
        { status: "active", next_billing_date: billingDate },
        { select: ["id", "next_billing_date", "reminder_sent_for"] }
      )) as any
    },
    estimateAmount: (id) => estimateCycleAmount(container, id),
    send: ({ subscriptionId, amount }) => sendSubscriptionEmail(container, { kind: "reminder", subscriptionId, amount }),
    async markSent(subscriptionId, billingDate) {
      await subscriptions.updateSubscriptions({ id: subscriptionId, reminder_sent_for: billingDate })
    },
    logger,
  })
}

export const config = {
  name: "remind-subscriptions",
  // 13:00 UTC = 09:00 o 10:00 en Chile según el horario de verano.
  schedule: "0 13 * * *",
}
