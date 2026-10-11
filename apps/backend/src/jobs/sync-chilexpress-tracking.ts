import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/medusa/core-flows"
import { fetchTracking } from "../modules/fulfillment-chilexpress/tracking"
import { Sentry } from "../lib/sentry"

const LOOKBACK_DAYS = 30

/**
 * Marks Chilexpress shipments as delivered in Medusa once Chilexpress says
 * they were. The transport order is created in the provider's
 * createFulfillment (see fulfillment-chilexpress/service.ts), which stores its
 * number on the fulfillment; this job asks Chilexpress about every such
 * fulfillment that isn't delivered yet, and when it was, runs Medusa's own
 * delivery workflow — the same thing "Mark as delivered" does in the admin,
 * which is what the storefront's order lookup reads.
 */
export default async function syncChilexpressTracking(container: MedusaContainer) {
  const apiKey = process.env.CHILEXPRESS_ENVIOS_API_KEY
  const rut = process.env.CHILEXPRESS_RUT
  if (!apiKey || !rut) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const options = {
    apiKey,
    rut,
    customerCardNumber: process.env.CHILEXPRESS_TCC ?? "",
    baseUrl: process.env.CHILEXPRESS_ENVIOS_BASE_URL,
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "provider_id"],
    filters: {
      provider_id: "chilexpress_chilexpress",
      delivered_at: null,
      canceled_at: null,
      created_at: { $gte: since },
    } as any,
  })

  const pending = fulfillments.filter((f: any) => f.data?.transport_order_number)
  if (!pending.length) return

  for (const fulfillment of pending as any[]) {
    try {
      const tracking = await fetchTracking(options, {
        transportOrderNumber: fulfillment.data.transport_order_number,
        reference: String(fulfillment.data.reference ?? ""),
      })
      if (!tracking?.delivered) continue

      const { data: links } = await query.graph({
        entity: "order_fulfillment",
        fields: ["order_id"],
        filters: { fulfillment_id: fulfillment.id } as any,
      })
      const orderId = (links[0] as any)?.order_id
      if (!orderId) continue

      await markOrderFulfillmentAsDeliveredWorkflow(container).run({
        input: { orderId, fulfillmentId: fulfillment.id },
      })
      logger.info(
        `[chilexpress-tracking] OT ${fulfillment.data.transport_order_number} entregada: ` +
          `despacho ${fulfillment.id} (orden ${orderId}) marcado como entregado.`
      )
    } catch (err) {
      logger.error(
        `[chilexpress-tracking] Error con el despacho ${fulfillment.id}: ${
          err instanceof Error ? err.message : err
        }`
      )
      Sentry.captureException(err)
    }
  }
}

export const config = {
  name: "sync-chilexpress-tracking",
  schedule: "*/30 * * * *",
}
