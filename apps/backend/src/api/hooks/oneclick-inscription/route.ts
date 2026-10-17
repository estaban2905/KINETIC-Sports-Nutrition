import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import type SubscriptionModuleService from "../../../modules/subscription/service"
import { OneclickClient } from "../../../lib/oneclick"
import { cardReturnUrl, completeCardEnrollment } from "../../../lib/subscription-card"
import { activateAndCharge, buildCycleDeps } from "../../../lib/subscription-order"
import { describeError } from "../../../lib/describe-error"
import { Sentry } from "../../../lib/sentry"

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

    // Tarjeta lista: una suscripción pendiente (o vencida) se activa y cobra su
    // primer ciclo ya. Un fallo aquí no cambia el resultado de la inscripción: la
    // tarjeta quedó guardada y el estado real se ve en la suscripción.
    if (result.outcome === "ok") {
      try {
        await activateAndCharge(buildCycleDeps(req.scope), result.subscriptionId)
      } catch (err) {
        logger.error(
          `[subscription] no se pudo cobrar el primer ciclo de ${result.subscriptionId}: ${describeError(err)}`
        )
        Sentry.captureException(err, { extra: { subscriptionId: result.subscriptionId } })
      }
    }
  } catch (err) {
    logger.error(`[oneclick] error al completar la inscripción: ${describeError(err)}`)
  }

  res.redirect(303, cardReturnUrl(process.env.STOREFRONT_URL, outcome))
}

export const GET = handle
export const POST = handle
