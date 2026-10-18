import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { buildBoletaPayload } from "./boleta"
import { documentoEmail, storefrontUrl } from "./email-templates"
import { buildFacturaPayload, type BillingData } from "./factura"
import { INVOICING_MODULE } from "../modules/invoicing"
import { decideClaim, isDefinitiveFailure } from "./invoice-claim"
import { withLock } from "./order-lock"
import { isOrderPaid } from "./order-status"
import { isValidRut } from "./rut"
import { Sentry } from "./sentry"
import { getSimpleFacturaClient } from "./simplefactura"

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
/**
 * "needs_review": quedó una reserva sin resolver tras un fallo ambiguo (no se
 * sabe si SimpleFactura emitió); no se reemite sola. "in_progress": otro proceso
 * reservó el pedido justo antes; se reintenta en el siguiente ciclo.
 */
export type InvoiceResult = "disabled" | "emitted" | "already_emitted" | "unpaid" | "needs_review" | "in_progress"

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
  // Un solo emisor por pedido a la vez. El pedido se vuelve a leer ADENTRO del
  // candado: quien llega segundo ve el documento que el primero ya guardó y no
  // emite otro (así se evita la boleta duplicada).
  return withLock(container, `order-docs:${orderId}`, () => issueDocumentUnlocked(container, orderId))
}

async function issueDocumentUnlocked(container: MedusaContainer, orderId: string): Promise<InvoiceResult> {
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
  // --- Reserva atómica -----------------------------------------------------
  // La fila de invoice_document (índice único por pedido) es la fuente de verdad:
  // se reserva ANTES de llamar a SimpleFactura. El candado de arriba ya serializa
  // los procesos; esto cubre además corridas sin candado compartido y los cortes
  // a mitad de emisión.
  const invoicing = container.resolve(INVOICING_MODULE) as any
  const [row] = await invoicing.listInvoiceDocuments({ order_id: order.id }, { take: 1 })
  const decision = decideClaim(row)

  if (decision.action === "already_emitted") {
    // Emitida y registrada, pero el metadata del pedido no la tiene (corte entre pasos): se reconstruye.
    const r = decision.row
    const data: DteMetadata = {
      folio: r.folio!,
      tipo: (r.codigo_tipo ?? CODIGO_TIPO[r.tipo]) as 39 | 33,
      fecha: r.fecha ?? "",
      ambiente: (r.ambiente ?? sf.config.ambiente) as 0 | 1,
      total: r.total ?? 0,
    }
    await saveDocument(container, order, r.tipo, data)
    await sendDocumentEmail(container, { ...order, metadata: { ...(order.metadata ?? {}), [r.tipo]: data } }, r.tipo, data)
    return "already_emitted"
  }

  if (decision.action === "review") {
    // Solo se avisa una vez (al pasar a "review"); los reintentos posteriores son silenciosos.
    if (decision.row.status !== "review") {
      await invoicing.updateInvoiceDocuments({ id: decision.row.id, status: "review" })
      const message =
        `[dte] Orden #${order.display_id} (${order.id}): hay una reserva de ${decision.row.tipo} sin resolver. ` +
        `No se sabe si SimpleFactura llegó a emitirla. Revisa el portal de SimpleFactura: si existe el documento, ` +
        `completa folio/estado en invoice_document; si no, borra esa fila para que se emita de nuevo.`
      logger.error(message)
      Sentry.captureMessage(message, { level: "error", extra: { orderId: order.id } })
    }
    return "needs_review"
  }

  let claim: { id: string }
  try {
    claim = await invoicing.createInvoiceDocuments({ order_id: order.id, tipo, status: "emitting" })
  } catch (err) {
    // Índice único: otro proceso reservó primero. Medusa lo traduce a un error de tipo
    // "duplicate_error" ("... already exists"). Cualquier otro error sí se propaga.
    const message = err instanceof Error ? err.message : String(err)
    if ((err as { type?: string })?.type === "duplicate_error" || /already exists|unique|duplicate/i.test(message)) {
      logger.warn(`[dte] Orden #${order.display_id}: otro proceso ya reservó la emisión; se reintenta después.`)
      return "in_progress"
    }
    throw err
  }

  let emitted: Awaited<ReturnType<typeof sf.client.emitirDte>>
  try {
    // validaMontos is not supported together with MntBruto, which the factura uses.
    emitted = await sf.client.emitirDte(payload, { validaMontos: tipo === "boleta" })
  } catch (err) {
    if (isDefinitiveFailure(err)) {
      // SimpleFactura rechazó: seguro que no se emitió, se libera la reserva para reintentar.
      await invoicing.deleteInvoiceDocuments(claim.id)
    } else {
      // Corte de red o 5xx: pudo haberse emitido. La reserva se conserva (queda para revisión).
      await invoicing
        .updateInvoiceDocuments({ id: claim.id, last_error: String(err instanceof Error ? err.message : err).slice(0, 500) })
        .catch(() => undefined)
      logger.error(`[dte] Orden #${order.display_id}: fallo ambiguo al emitir; la reserva queda para revisión. ${err}`)
    }
    throw err
  }

  const data: DteMetadata = {
    folio: emitted.folio,
    tipo: CODIGO_TIPO[tipo],
    fecha: emitted.fechaEmision,
    ambiente: sf.config.ambiente,
    total: emitted.total,
  }
  try {
    await invoicing.updateInvoiceDocuments({
      id: claim.id,
      status: "emitted",
      folio: data.folio,
      codigo_tipo: data.tipo,
      fecha: data.fecha,
      ambiente: data.ambiente,
      total: data.total,
    })
  } catch (err) {
    // Emitida en SimpleFactura pero sin registrar: el folio queda en el log y en la reserva.
    logger.error(`[dte] Orden #${order.display_id}: ${tipo} folio ${emitted.folio} emitida pero NO registrada: ${err}`)
    await invoicing.updateInvoiceDocuments({ id: claim.id, last_error: `emitida con folio ${emitted.folio}` }).catch(() => undefined)
    throw err
  }

  try {
    await saveDocument(container, order, tipo, data)
  } catch (err) {
    // Ya está registrada en invoice_document: el próximo ciclo reconstruye el metadata y envía el correo.
    logger.error(`[dte] Orden #${order.display_id}: ${tipo} folio ${emitted.folio} emitida pero no se guardó en el pedido: ${err}`)
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
