import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { buildBoletaPayload } from "./boleta"
import { documentoEmail } from "./email-templates"
import { buildFacturaPayload, type BillingData } from "./factura"
import { isOrderPaid } from "./order-status"
import { isValidRut } from "./rut"
import { getSimpleFacturaClient } from "./simplefactura"
import { storefrontUrl } from "./email-templates"

export type DteTipo = "boleta" | "factura"

/** Stored at order.metadata.boleta (tipo 39) or order.metadata.factura (tipo 33). */
export type DteMetadata = {
  folio: number
  tipo: 39 | 33
  fecha: string
  ambiente: 0 | 1
  total: number
  /** True once the customer received the PDF by email. */
  emailed?: boolean
}

/** "unpaid": el pago aún no está capturado/autorizado, no se emite nada. */
export type InvoiceResult = "disabled" | "emitted" | "already_emitted" | "unpaid"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "total",
  "shipping_total",
  "metadata",
  "payment_collections.status",
  "payment_collections.amount",
  "payment_collections.captured_amount",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.discount_total",
]

const METADATA_KEY: Record<DteTipo, "boleta" | "factura"> = { boleta: "boleta", factura: "factura" }
const CODIGO_TIPO: Record<DteTipo, 39 | 33> = { boleta: 39, factura: 33 }

/** What the customer asked for at checkout. Invalid factura data falls back to a boleta. */
export function resolveDocumentType(metadata: Record<string, any> | null | undefined): {
  tipo: DteTipo
  billing?: BillingData
} {
  const billing = metadata?.billing as BillingData | undefined
  if (billing?.tipo === "factura" && isValidRut(billing.rut) && billing.razon_social?.trim() && billing.giro?.trim()) {
    return { tipo: "factura", billing }
  }
  return { tipo: "boleta" }
}

/** The boleta/factura already issued for this order, if any. */
export function existingDocument(
  metadata: Record<string, any> | null | undefined
): { tipo: DteTipo; data: DteMetadata } | null {
  for (const tipo of ["factura", "boleta"] as DteTipo[]) {
    const data = metadata?.[METADATA_KEY[tipo]] as DteMetadata | undefined
    if (data?.folio) return { tipo, data }
  }
  return null
}

/** True while the order still needs its document emitted or emailed (used by the retry job). */
export function isDocumentPending(metadata: Record<string, any> | null | undefined): boolean {
  const existing = existingDocument(metadata)
  return !existing || !existing.data.emailed
}

const PAYMENT_LABELS: [string, string][] = [
  ["khipu", "Transferencia (Khipu)"],
  ["webpay", "Tarjeta (Webpay)"],
  ["mercadopago", "Mercado Pago"],
  ["stripe", "Tarjeta (Stripe)"],
]

/** Human label for the document's "Tipo de pago" line, from the payment provider id. */
export function paymentLabel(providerId: string | null | undefined): string {
  const id = (providerId ?? "").toLowerCase()
  return PAYMENT_LABELS.find(([key]) => id.includes(key))?.[1] ?? "Contado"
}

/** Footer text printed at the bottom of the PDF (max 500 chars). */
export function buildObservaciones(displayId: number): string {
  const site = storefrontUrl()
  return [
    `Pedido #${displayId}`,
    "Gracias por entrenar con KINETIC Sports Nutrition.",
    site ? `Sigue tu pedido en ${site}/seguimiento` : "",
    "Cambios y devoluciones: responde al correo de tu pedido.",
  ]
    .filter(Boolean)
    .join(" · ")
}

async function loadOrder(container: MedusaContainer, orderId: string): Promise<any> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: orderId } })
  const order: any = data[0]
  if (!order) return order

  // The payment method is only cosmetic (printed on the document), so a failure here
  // must never block the emission.
  try {
    const { data: withPayments } = await query.graph({
      entity: "order",
      fields: ["id", "payment_collections.payments.provider_id"],
      filters: { id: orderId },
    })
    order.payment_provider_id =
      (withPayments[0] as any)?.payment_collections?.[0]?.payments?.[0]?.provider_id ?? null
  } catch {
    order.payment_provider_id = null
  }
  return order
}

async function saveDocument(container: MedusaContainer, order: any, tipo: DteTipo, data: DteMetadata): Promise<void> {
  await container.resolve(Modules.ORDER).updateOrders(order.id, {
    metadata: { ...(order.metadata ?? {}), [METADATA_KEY[tipo]]: data },
  })
}

/** Sends the document's PDF to the customer. Idempotent through emailed. */
export async function sendDocumentEmail(
  container: MedusaContainer,
  order: any,
  tipo: DteTipo,
  data: DteMetadata
): Promise<void> {
  const sf = getSimpleFacturaClient()
  const billing = order.metadata?.billing as BillingData | undefined
  const to = (tipo === "factura" && billing?.email) || order.email
  if (!sf || !to || data.emailed) return

  const pdf = await sf.client.obtenerPdf(data.folio, data.tipo)
  const { subject, html } = documentoEmail({
    tipo,
    displayId: order.display_id,
    folio: data.folio,
    ambiente: data.ambiente,
  })

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to,
    channel: "email",
    content: { subject, html },
    attachments: [
      {
        content: pdf.toString("base64"),
        filename: `${tipo}-${data.folio}.pdf`,
        content_type: "application/pdf",
        disposition: "attachment",
      },
    ],
    data: { order_id: order.id, folio: data.folio },
    trigger_type: `${tipo}.issued`,
    resource_id: order.id,
    resource_type: "order",
  })

  await saveDocument(container, order, tipo, { ...data, emailed: true })
}

/**
 * Emits the document the customer asked for (boleta by default, factura when
 * they entered valid billing data) once, and emails it. Throws if SimpleFactura
 * rejects the emission, so the order.placed subscriber and the retry job can
 * report it and try again.
 */
export async function issueDocumentForOrder(container: MedusaContainer, orderId: string): Promise<InvoiceResult> {
  const sf = getSimpleFacturaClient()
  if (!sf) return "disabled"

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const order = await loadOrder(container, orderId)
  if (!order) throw new Error(`Orden ${orderId} no encontrada para emitir el documento.`)

  const existing = existingDocument(order.metadata)
  if (existing) {
    if (!existing.data.emailed) await sendDocumentEmail(container, order, existing.tipo, existing.data)
    return "already_emitted"
  }

  // La boleta es un documento tributario: solo se emite cuando el pago está
  // confirmado. Con una transferencia pendiente se espera a payment.captured.
  if (!isOrderPaid(order.payment_collections)) return "unpaid"

  const { tipo, billing } = resolveDocumentType(order.metadata)
  if ((order.metadata?.billing as BillingData | undefined)?.tipo === "factura" && tipo === "boleta") {
    logger.warn(`[dte] Orden #${order.display_id}: pidió factura pero los datos son inválidos; se emite boleta.`)
  }

  const extras = { observaciones: buildObservaciones(order.display_id), tipoPago: paymentLabel(order.payment_provider_id) }
  const { payload, total } =
    tipo === "factura"
      ? buildFacturaPayload(order, billing!, sf.config, extras)
      : buildBoletaPayload(order, sf.config, extras)

  if (Math.round(order.total ?? 0) !== total) {
    logger.warn(
      `[dte] Orden #${order.display_id}: el total del documento (${total}) no coincide con el cobrado (${order.total}).`
    )
  }

  // validaMontos is not supported together with MntBruto, which the factura uses.
  const emitted = await sf.client.emitirDte(payload, { validaMontos: tipo === "boleta" })
  const data: DteMetadata = {
    folio: emitted.folio,
    tipo: CODIGO_TIPO[tipo],
    fecha: emitted.fechaEmision,
    ambiente: sf.config.ambiente,
    total: emitted.total,
  }
  try {
    await saveDocument(container, order, tipo, data)
  } catch (err) {
    // The DTE exists at the SII but we couldn't record it: surface the folio so
    // it can be linked by hand instead of being emitted twice.
    logger.error(`[dte] Orden #${order.display_id}: ${tipo} folio ${emitted.folio} emitida pero NO guardada: ${err}`)
    throw err
  }
  logger.info(`[dte] Orden #${order.display_id}: ${tipo} folio ${emitted.folio} emitida.`)

  try {
    await sendDocumentEmail(container, { ...order, metadata: { ...(order.metadata ?? {}), [tipo]: data } }, tipo, data)
  } catch (err) {
    // Not fatal: the retry job re-sends documents whose email is still pending.
    logger.error(`[dte] Orden #${order.display_id}: no se pudo enviar el correo de la ${tipo}: ${err}`)
  }

  return "emitted"
}
