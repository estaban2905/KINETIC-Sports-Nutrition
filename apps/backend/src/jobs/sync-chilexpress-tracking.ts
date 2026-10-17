import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createOrderShipmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import { chilexpressHasPackage } from "../lib/order-status"
import { fetchTracking } from "../modules/fulfillment-chilexpress/tracking"
import { Sentry } from "../lib/sentry"

const LOOKBACK_DAYS = 30

/**
 * Marks Chilexpress shipments as shipped (once Chilexpress has the package)
 * and delivered (once Chilexpress says so) in Medusa. The transport order is created in the provider's
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
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const options = {
    apiKey,
    rut,
    customerCardNumber: process.env.CHILEXPRESS_TCC ?? "",
    baseUrl: process.env.CHILEXPRESS_ENVIOS_BASE_URL,
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "provider_id", "shipped_at", "items.line_item_id", "items.quantity"],
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
      if (!tracking) continue

      // Keep the customer-facing timeline current. Only written when
      // Chilexpress reported something new, so quiet runs touch nothing.
      const knownEvents: { code?: string | null }[] = Array.isArray(fulfillment.data.tracking_events)
        ? fulfillment.data.tracking_events
        : []
      // Events stored before `code` existed lack it; rewrite them once so the
      // customer-facing status can be derived from the eventCode.
      const missingCodes = knownEvents.some((event) => event.code === undefined)
      if (
        tracking.events.length !== knownEvents.length ||
        missingCodes ||
        (tracking.status ?? null) !== (fulfillment.data.tracking_status ?? null) ||
        (tracking.certificateUrl ?? null) !== (fulfillment.data.tracking_certificate_url ?? null)
      ) {
        await fulfillmentModule.updateFulfillment(fulfillment.id, {
          data: {
            ...fulfillment.data,
            tracking_events: tracking.events,
            tracking_status: tracking.status,
            tracking_certificate_url: tracking.certificateUrl,
          },
        })
      }

      const needsShipment = !fulfillment.shipped_at && chilexpressHasPackage(tracking.events)
      if (!needsShipment && !tracking.delivered) continue

      const { data: links } = await query.graph({
        entity: "order_fulfillment",
        fields: ["order_id"],
        filters: { fulfillment_id: fulfillment.id } as any,
      })
      const orderId = (links[0] as any)?.order_id
      if (!orderId) continue

      // Chilexpress has the package: mark the fulfillment as shipped without
      // waiting for someone to do it in the admin. Same workflow as the
      // admin's "Mark as shipped" (it also emits shipment.created, which
      // sends the customer's email). It runs before the delivery below, so a
      // package first seen as already delivered still goes through both steps.
      // labels stays empty: the tracking number was stored at createFulfillment
      // and an empty list leaves existing labels untouched.
      if (needsShipment) {
        await createOrderShipmentWorkflow(container).run({
          input: {
            order_id: orderId,
            fulfillment_id: fulfillment.id,
            items: (fulfillment.items ?? []).map((item: any) => ({
              id: item.line_item_id,
              quantity: item.quantity,
            })),
          },
        })
        logger.info(
          `[chilexpress-tracking] OT ${fulfillment.data.transport_order_number} recibida por Chilexpress: ` +
            `despacho ${fulfillment.id} (orden ${orderId}) marcado como enviado.`
        )
      }

      if (!tracking.delivered) continue

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
