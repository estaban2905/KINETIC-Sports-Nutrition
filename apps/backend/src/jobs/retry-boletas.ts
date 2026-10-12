import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isDocumentPending, issueDocumentForOrder } from "../lib/invoice-order"
import { getSimpleFacturaConfig } from "../lib/simplefactura"
import { Sentry } from "../lib/sentry"

const LOOKBACK_HOURS = 72
const MAX_PER_RUN = 20
// SimpleFactura allows 2 requests/second per IP.
const PAUSE_MS = 700

/**
 * Safety net for boletas and facturas: emits those that failed at order time (SimpleFactura
 * down, out of folios, rate limited...) and re-sends the PDF email when it
 * failed. issueDocumentForOrder is idempotent, so running it on every recent
 * order is safe.
 */
export default async function retryBoletas(container: MedusaContainer) {
  if (!getSimpleFacturaConfig()) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "status", "metadata"],
    filters: {
      created_at: { $gte: new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000) },
      status: ["pending", "completed"],
    } as any,
  })

  const pending = (orders as any[])
    .filter((o) => isDocumentPending(o.metadata))
    .slice(0, MAX_PER_RUN)
  if (!pending.length) return

  logger.info(`[retry-boletas] ${pending.length} orden(es) con boleta pendiente.`)
  for (const order of pending) {
    try {
      await issueDocumentForOrder(container, order.id)
    } catch (err) {
      logger.error(`[retry-boletas] Orden #${order.display_id}: ${err instanceof Error ? err.message : err}`)
      Sentry.captureException(err, { extra: { orderId: order.id } })
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
  }
}

export const config = {
  name: "retry-boletas",
  schedule: "*/15 * * * *",
}
