import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { buildBoletaPayload } from "./boleta"
import { boletaEmail } from "./email-templates"
import { getSimpleFacturaClient } from "./simplefactura"

export type BoletaMetadata = {
  folio: number
  tipo: 39
  fecha: string
  ambiente: 0 | 1
  total: number
  /** True once the customer received the PDF by email. */
  emailed?: boolean
}

export type InvoiceResult = "disabled" | "emitted" | "already_emitted"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "total",
  "shipping_total",
  "metadata",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.discount_total",
]

async function loadOrder(container: MedusaContainer, orderId: string): Promise<any> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: orderId } })
  return data[0]
}

async function saveBoleta(container: MedusaContainer, order: any, boleta: BoletaMetadata): Promise<void> {
  await container.resolve(Modules.ORDER).updateOrders(order.id, {
    metadata: { ...(order.metadata ?? {}), boleta },
  })
}

/** Sends the boleta PDF to the customer. Idempotent through boleta.emailed. */
export async function sendBoletaEmail(container: MedusaContainer, order: any, boleta: BoletaMetadata): Promise<void> {
  const sf = getSimpleFacturaClient()
  if (!sf || !order.email || boleta.emailed) return

  const pdf = await sf.client.obtenerPdf(boleta.folio, boleta.tipo)
  const { subject, html } = boletaEmail({ displayId: order.display_id, folio: boleta.folio, ambiente: boleta.ambiente })

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: order.email,
    channel: "email",
    content: { subject, html },
    attachments: [
      {
        content: pdf.toString("base64"),
        filename: `boleta-${boleta.folio}.pdf`,
        content_type: "application/pdf",
        disposition: "attachment",
      },
    ],
    data: { order_id: order.id, folio: boleta.folio },
    trigger_type: "boleta.issued",
    resource_id: order.id,
    resource_type: "order",
  })

  await saveBoleta(container, order, { ...boleta, emailed: true })
}

/**
 * Emits the boleta electrónica for an order (once) and emails it to the
 * customer. Throws if SimpleFactura rejects the emission, so callers (the
 * order.placed subscriber and the retry job) can report it and try again.
 */
export async function issueBoletaForOrder(container: MedusaContainer, orderId: string): Promise<InvoiceResult> {
  const sf = getSimpleFacturaClient()
  if (!sf) return "disabled"

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const order = await loadOrder(container, orderId)
  if (!order) throw new Error(`Orden ${orderId} no encontrada para emitir la boleta.`)

  const existing = order.metadata?.boleta as BoletaMetadata | undefined
  if (existing?.folio) {
    if (!existing.emailed) await sendBoletaEmail(container, order, existing)
    return "already_emitted"
  }

  const { payload, total } = buildBoletaPayload(order, sf.config)
  if (Math.round(order.total ?? 0) !== total) {
    logger.warn(
      `[boleta] Orden #${order.display_id}: el total de la boleta (${total}) no coincide con el cobrado (${order.total}).`
    )
  }

  const emitted = await sf.client.emitirBoleta(payload)
  const boleta: BoletaMetadata = {
    folio: emitted.folio,
    tipo: 39,
    fecha: emitted.fechaEmision,
    ambiente: sf.config.ambiente,
    total: emitted.total,
  }
  try {
    await saveBoleta(container, order, boleta)
  } catch (err) {
    // The DTE exists at the SII but we couldn't record it: surface the folio so
    // it can be linked by hand instead of being emitted twice.
    logger.error(`[boleta] Orden #${order.display_id}: boleta folio ${emitted.folio} emitida pero NO guardada: ${err}`)
    throw err
  }
  logger.info(`[boleta] Orden #${order.display_id}: boleta folio ${emitted.folio} emitida.`)

  try {
    await sendBoletaEmail(container, { ...order, metadata: { ...(order.metadata ?? {}), boleta } }, boleta)
  } catch (err) {
    // Not fatal: the retry job re-sends boletas whose email is still pending.
    logger.error(`[boleta] Orden #${order.display_id}: no se pudo enviar el correo de la boleta: ${err}`)
  }

  return "emitted"
}
