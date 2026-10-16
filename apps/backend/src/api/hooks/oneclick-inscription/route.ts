import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import type SubscriptionModuleService from "../../../modules/subscription/service"
import { OneclickClient } from "../../../lib/oneclick"
import { cardReturnUrl, completeCardEnrollment } from "../../../lib/subscription-card"

/**
 * A esta URL vuelve el navegador del cliente desde Transbank al terminar (o
 * abandonar) la inscripción de la tarjeta. Llega sin sesión ni cabeceras de la
 * tienda, solo con TBK_TOKEN, por eso vive en /hooks y no en /store. No se
 * confía en nada de lo que traiga: la inscripción se confirma contra Transbank.
 * Termina siempre con una redirección (303) de vuelta al storefront.
 */
async function handle(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const raw = body.TBK_TOKEN ?? (req.query as Record<string, unknown>).TBK_TOKEN
  const token = typeof raw === "string" ? raw : ""
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  let outcome: Awaited<ReturnType<typeof completeCardEnrollment>>["outcome"] = "unknown"
  try {
    const result = await completeCardEnrollment(
      {
        subscriptions: req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE) as any,
        oneclick: OneclickClient.fromEnv(),
        logger,
      },
      token
    )
    outcome = result.outcome
  } catch (err) {
    logger.error(`[oneclick] error al completar la inscripción: ${err instanceof Error ? err.message : err}`)
  }

  res.redirect(303, cardReturnUrl(process.env.STOREFRONT_URL, outcome))
}

export const GET = handle
export const POST = handle
