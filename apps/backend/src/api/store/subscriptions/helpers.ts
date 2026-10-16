import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import type SubscriptionModuleService from "../../../modules/subscription/service"
import { OneclickClient } from "../../../lib/oneclick"
import { resolveCountyCode } from "../../../modules/fulfillment-chilexpress/coverage"
import type { ActionDeps } from "../../../lib/subscription-actions"

/** El cliente sale del token, nunca de un parámetro o del cuerpo. */
export function customerIdOf(req: AuthenticatedMedusaRequest): string {
  const id = req.auth_context?.actor_id
  if (!id) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Debes iniciar sesión.")
  return id
}

export function buildActionDeps(req: AuthenticatedMedusaRequest): ActionDeps {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  return {
    subscriptions: req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE) as any,
    oneclick: OneclickClient.fromEnv(),
    logger,
    async variantIsPurchasable(variantId) {
      const { data } = await query.graph({
        entity: "product_variant",
        fields: ["id", "product.status"],
        filters: { id: variantId },
      })
      return (data[0] as any)?.product?.status === "published"
    },
    async comunaIsCovered(city) {
      const apiKey = process.env.CHILEXPRESS_COBERTURA_API_KEY
      // Sin API de cobertura no se puede validar: se acepta y el cobro lo verificará.
      if (!apiKey) return true
      try {
        return (
          (await resolveCountyCode(city, {
            apiKey,
            baseUrl: process.env.CHILEXPRESS_COBERTURA_BASE_URL,
          })) !== null
        )
      } catch (err) {
        logger.warn(`[subscription] no se pudo validar la comuna "${city}": ${err instanceof Error ? err.message : err}`)
        return true
      }
    },
  }
}
