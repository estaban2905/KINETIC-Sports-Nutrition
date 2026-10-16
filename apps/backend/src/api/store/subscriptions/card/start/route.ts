import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../../../modules/subscription"
import type SubscriptionModuleService from "../../../../../modules/subscription/service"
import { OneclickClient } from "../../../../../lib/oneclick"
import { startCardEnrollment } from "../../../../../lib/subscription-card"

/**
 * Inicia la inscripción de la tarjeta de una suscripción del cliente. Devuelve
 * { url, token }: el storefront debe enviar un formulario POST a `url` con el
 * campo TBK_TOKEN = token, y Transbank devuelve al cliente al callback de
 * /hooks/oneclick-inscription.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  const subscriptionId = (req.body as { subscription_id?: unknown } | undefined)?.subscription_id
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Debes iniciar sesión.")
  }
  if (typeof subscriptionId !== "string" || !subscriptionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Falta subscription_id.")
  }

  const responseUrl = process.env.ONECLICK_RESPONSE_URL?.trim()
  if (!responseUrl) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Oneclick no está configurado.")
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)

  const started = await startCardEnrollment(
    {
      subscriptions: req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE) as any,
      oneclick: OneclickClient.fromEnv(),
    },
    { subscriptionId, customerId, email: customer.email, responseUrl }
  )

  res.json({ url: started.url, token: started.token })
}
