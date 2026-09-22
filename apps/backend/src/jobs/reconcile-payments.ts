import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} from "transbank-sdk"
import { MercadoPagoConfig, Payment as MercadoPagoPayment } from "mercadopago"
import { Sentry } from "../lib/sentry"

const STALE_AFTER_MINUTES = 15
const LOOKBACK_HOURS = 48

export function isWebpayAuthorized(
  result: { status?: string; response_code?: number } | null | undefined
): boolean {
  return result?.status === "AUTHORIZED" && result?.response_code === 0
}

export function isMercadoPagoApproved(
  payment: { status?: string } | null | undefined
): boolean {
  return payment?.status === "approved"
}

/**
 * Catches carts whose payment actually succeeded at the provider but never
 * turned into an order — because the customer's browser never came back to
 * /checkout/confirmar (Webpay has no webhook, see payment-webpay/service.ts)
 * or because our webhook-driven completion (Mercado Pago) never fired or
 * failed. It re-verifies the TRUE status against the provider directly and,
 * only if genuinely paid, re-runs the same completeCartWorkflow the
 * storefront would have triggered — reusing Medusa's own order creation,
 * inventory reservation and idempotent payment authorization instead of
 * reimplementing any of it here. If the provider says it was never actually
 * paid, nothing is captured and nothing needs to happen.
 */
export default async function reconcilePayments(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const staleBefore = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000)
  const lookbackAfter = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  const { data: sessions } = await query.graph({
    entity: "payment_session",
    fields: ["id", "provider_id", "status", "data", "created_at", "payment_collection_id"],
    filters: {
      provider_id: ["pp_webpay_webpay", "pp_mercadopago_mercadopago"],
      status: ["pending", "error"],
      created_at: { $gte: lookbackAfter, $lte: staleBefore },
    } as any,
  })

  if (!sessions.length) return

  logger.info(`[reconcile-payments] Revisando ${sessions.length} sesión(es) de pago sin resolver.`)

  let webpayTransaction: InstanceType<typeof WebpayPlus.Transaction> | null = null
  const getWebpayTransaction = () => {
    if (webpayTransaction) return webpayTransaction
    webpayTransaction =
      process.env.TRANSBANK_ENVIRONMENT === "production"
        ? new WebpayPlus.Transaction(
            new Options(
              process.env.TRANSBANK_COMMERCE_CODE!,
              process.env.TRANSBANK_API_KEY!,
              Environment.Production
            )
          )
        : WebpayPlus.Transaction.buildForIntegration(
            process.env.TRANSBANK_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS,
            process.env.TRANSBANK_API_KEY || IntegrationApiKeys.WEBPAY
          )
    return webpayTransaction
  }
  const mercadopagoClient = process.env.MERCADOPAGO_ACCESS_TOKEN
    ? new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
    : null

  for (const session of sessions) {
    try {
      await reconcileSession(session)
    } catch (err) {
      logger.error(
        `[reconcile-payments] Error revisando la sesión ${session.id}: ${
          err instanceof Error ? err.message : err
        }`
      )
    }
  }

  async function reconcileSession(session: (typeof sessions)[number]) {
    const { data: cartLinks } = await query.graph({
      entity: "cart_payment_collection",
      fields: ["cart_id"],
      filters: { payment_collection_id: session.payment_collection_id } as any,
    })
    const cartId = cartLinks[0]?.cart_id
    if (!cartId) return

    const { data: orderLinks } = await query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id: cartId } as any,
    })
    if ((orderLinks[0] as any)?.order_id) return // already completed, nothing to reconcile

    const data = session.data as Record<string, unknown>
    let trulyPaid = false

    if (session.provider_id === "pp_webpay_webpay") {
      const token = data?.token as string | undefined
      if (!token) return
      const result = await getWebpayTransaction().status(token)
      trulyPaid = isWebpayAuthorized(result)
    } else if (session.provider_id === "pp_mercadopago_mercadopago") {
      if (!mercadopagoClient) return
      const sessionId = data?.session_id as string | undefined
      if (!sessionId) return
      const { results } = await new MercadoPagoPayment(mercadopagoClient).search({
        options: { external_reference: sessionId, sort: "date_created", criteria: "desc" },
      })
      trulyPaid = isMercadoPagoApproved(results?.[0])
    } else {
      return
    }

    // Genuinely not paid (declined, expired, still waiting) — nothing was
    // captured, so there's nothing to reconcile. The customer's cart just
    // stays open for them to retry.
    if (!trulyPaid) return

    logger.warn(
      `[reconcile-payments] Sesión ${session.id} (${session.provider_id}) está pagada en el ` +
      `proveedor pero el carrito ${cartId} nunca se completó. Completando ahora.`
    )

    const { errors } = await completeCartWorkflow(container).run({
      input: { id: cartId },
      throwOnError: false,
    })

    if (errors?.length) {
      // The payment is confirmed at the provider but the cart still couldn't
      // be completed (e.g. the stock reserved for it is gone). This is the
      // one case that needs a human: the customer paid and has no order.
      const reason = errors.map((e) => e.error?.message ?? e.error).join("; ")
      logger.error(
        `[reconcile-payments] PAGO CONFIRMADO SIN ORDEN — requiere revisión manual. ` +
        `session=${session.id} provider=${session.provider_id} cart=${cartId}. Motivo: ${reason}`
      )
      Sentry.captureMessage(
        `PAGO CONFIRMADO SIN ORDEN: session=${session.id} provider=${session.provider_id} cart=${cartId}`,
        { level: "error", extra: { sessionId: session.id, cartId, providerId: session.provider_id, reason } }
      )
    } else {
      logger.info(`[reconcile-payments] Carrito ${cartId} completado por reconciliación (session ${session.id}).`)
    }
  }
}

export const config = {
  name: "reconcile-pending-payments",
  schedule: "*/10 * * * *",
}
