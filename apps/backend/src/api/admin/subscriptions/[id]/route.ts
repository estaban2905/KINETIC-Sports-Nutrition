import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../../modules/subscription"
import type SubscriptionModuleService from "../../../../modules/subscription/service"
import { serializeAdminCycle, serializeAdminSubscription } from "../../../../lib/subscription-actions"

/** Detalle para soporte: la suscripción y el historial técnico de sus ciclos. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const subscriptions = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

  let sub: any
  try {
    sub = await subscriptions.retrieveSubscription(req.params.id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Suscripción no encontrada.")
  }

  let email: string | null = null
  try {
    email = (await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(sub.customer_id)).email
  } catch {
    email = null
  }

  const cycles = await subscriptions.listSubscriptionCycles(
    { subscription_id: sub.id },
    { order: { period_key: "DESC", attempt: "DESC" }, take: 100 }
  )

  res.json({
    subscription: serializeAdminSubscription(sub, email),
    cycles: (cycles as any[]).map(serializeAdminCycle),
  })
}
