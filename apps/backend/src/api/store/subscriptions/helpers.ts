import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import type SubscriptionModuleService from "../../../modules/subscription/service"
import { OneclickClient } from "../../../lib/oneclick"
import { resolveCountyCode } from "../../../modules/fulfillment-chilexpress/coverage"
import { serializeSubscription, type ActionDeps, type SubscriptionRow } from "../../../lib/subscription-actions"
import { estimateCycleAmount } from "../../../lib/subscription-order"
import { sendSubscriptionEmail } from "../../../lib/subscription-notify"

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
    notify: (kind, subscriptionId) => sendSubscriptionEmail(req.scope, { kind, subscriptionId }),
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

/**
 * Suscripciones listas para la respuesta: con el nombre del producto y de la
 * variante y el monto estimado del próximo cobro. Esos datos son un adorno: si
 * no se pueden calcular, la suscripción igual se devuelve.
 */
export async function presentSubscriptions(req: AuthenticatedMedusaRequest, rows: SubscriptionRow[]) {
  if (!rows.length) return []
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const labels = new Map<string, { product_title: string | null; product_handle: string | null; variant_title: string | null }>()
  try {
    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "title", "product.title", "product.handle"],
      filters: { id: [...new Set(rows.map((r) => r.variant_id))] },
    })
    for (const v of data as any[]) {
      labels.set(v.id, {
        product_title: v.product?.title ?? null,
        product_handle: v.product?.handle ?? null,
        variant_title: v.title ?? null,
      })
    }
  } catch (err) {
    logger.warn(`[subscription] no se pudieron leer los nombres de producto: ${err instanceof Error ? err.message : err}`)
  }

  return Promise.all(
    rows.map(async (row) => {
      let next_amount: number | null = null
      if (row.status !== "cancelled") {
        try {
          next_amount = await estimateCycleAmount(req.scope as any, row.id)
        } catch {
          next_amount = null
        }
      }
      return serializeSubscription(row, { ...labels.get(row.variant_id), next_amount })
    })
  )
}
