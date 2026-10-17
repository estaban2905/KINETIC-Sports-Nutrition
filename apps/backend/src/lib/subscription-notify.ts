import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { maskedCard } from "./oneclick"
import { buildSubscriptionEmail, type SubscriptionEmailKind } from "./subscription-emails"
import type { CycleEvent } from "./subscription-cycle"

/**
 * Envía los correos de la suscripción por el módulo de notificaciones (Resend en
 * producción). Es de mejor esfuerzo: quien llama debe tratar un fallo como un
 * aviso perdido, nunca como un fallo del cobro.
 */

export type SendSubscriptionEmail = {
  kind: SubscriptionEmailKind
  subscriptionId: string
  amount?: number | null
  retryOn?: string | null
  pastDue?: boolean
}

export async function sendSubscriptionEmail(container: MedusaContainer, input: SendSubscriptionEmail) {
  const subscriptions = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const sub: any = await subscriptions.retrieveSubscription(input.subscriptionId)
  const customer = await container.resolve(Modules.CUSTOMER).retrieveCustomer(sub.customer_id)
  if (!customer.email) return

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "title", "product.title"],
    filters: { id: sub.variant_id },
  })
  const variant = variants[0] as { title?: string; product?: { title?: string } } | undefined
  const productLabel = [variant?.product?.title, variant?.title].filter(Boolean).join(" · ") || "tu producto"

  const { subject, html } = buildSubscriptionEmail(input.kind, {
    firstName: customer.first_name,
    productLabel,
    quantity: sub.quantity,
    discountPercent: sub.discount_percent,
    frequencyDays: sub.frequency_days,
    amount: input.amount,
    billingDate: sub.next_billing_date,
    cardLabel: maskedCard(sub.card_brand, sub.card_last4),
    retryOn: input.retryOn,
    pastDue: input.pastDue,
  })

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: customer.email,
    channel: "email",
    content: { subject, html },
    data: { subscription_id: sub.id },
    trigger_type: `subscription.${input.kind}`,
    resource_id: sub.id,
    resource_type: "subscription",
  })
}

/** Qué correo corresponde a cada evento del ciclo, o null si no lleva uno propio. */
export function emailForCycleEvent(event: CycleEvent): SendSubscriptionEmail | null {
  switch (event.type) {
    case "charged":
      // Las renovaciones ya reciben la confirmación del pedido; solo el primer
      // cobro lleva además el "tu suscripción está activa".
      return event.firstCycle
        ? { kind: "active", subscriptionId: event.subscriptionId, amount: event.amount }
        : null
    case "rejected":
      return {
        kind: "payment_failed",
        subscriptionId: event.subscriptionId,
        retryOn: event.willRetryOn,
        pastDue: event.pastDue,
      }
    case "skipped_no_stock":
      return { kind: "skipped_no_stock", subscriptionId: event.subscriptionId }
  }
}
