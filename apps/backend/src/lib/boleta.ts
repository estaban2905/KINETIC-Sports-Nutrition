import type { SimpleFacturaConfig } from "./simplefactura"

/** Chile's IVA rate. Store prices are tax-inclusive, and boleta lines are gross by default. */
const IVA_RATE = 0.19
/** RUT SimpleFactura expects for a boleta without receptor data. */
export const RUT_SIN_RECEPTOR = "66666666-6"
const MAX_NAME_LENGTH = 80

export type BoletaOrderItem = {
  product_title?: string | null
  variant_title?: string | null
  variant_sku?: string | null
  quantity?: number | null
  unit_price?: number | null
  discount_total?: number | null
}

export type BoletaOrder = {
  items?: BoletaOrderItem[] | null
  shipping_total?: number | null
}

/** YYYY-MM-DD in Chile's timezone (the tax date), regardless of the server's clock. */
export function fechaChile(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function itemName(item: BoletaOrderItem): string {
  const variant = item.variant_title && item.variant_title !== "Único" ? ` - ${item.variant_title}` : ""
  const name = `${item.product_title ?? "Producto"}${variant}`
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…` : name
}

/**
 * Builds the invoiceV2 body for a boleta electrónica (tipo 39) with no receptor
 * data (consumer sale). Returns the total too, so the caller can compare it
 * with what the customer was actually charged.
 */
export function buildBoletaPayload(
  order: BoletaOrder,
  emisor: Pick<SimpleFacturaConfig, "rutEmisor" | "razonSocial" | "giro" | "dirOrigen" | "comunaOrigen">,
  extras: { observaciones?: string; tipoPago?: string } = {},
  fecha: string = fechaChile()
): { payload: Record<string, unknown>; total: number } {
  const detalle: Record<string, unknown>[] = []

  for (const item of order.items ?? []) {
    const quantity = item.quantity ?? 1
    const unitPrice = Math.round(item.unit_price ?? 0)
    const discount = Math.round(item.discount_total ?? 0)
    const line: Record<string, unknown> = {
      NroLinDet: String(detalle.length + 1),
      NmbItem: itemName(item),
      QtyItem: String(quantity),
      UnmdItem: "un",
      PrcItem: String(unitPrice),
      MontoItem: String(unitPrice * quantity - discount),
    }
    if (discount > 0) line.DescuentoMonto = String(discount)
    if (item.variant_sku) line.CdgItem = [{ TpoCodigo: "SKU", VlrCodigo: item.variant_sku.slice(0, 35) }]
    detalle.push(line)
  }

  const shipping = Math.round(order.shipping_total ?? 0)
  if (shipping > 0) {
    detalle.push({
      NroLinDet: String(detalle.length + 1),
      NmbItem: "Despacho",
      QtyItem: "1",
      UnmdItem: "un",
      PrcItem: String(shipping),
      MontoItem: String(shipping),
    })
  }

  const total = detalle.reduce((sum, line) => sum + Number(line.MontoItem), 0)
  const neto = Math.round(total / (1 + IVA_RATE))

  return {
    total,
    payload: {
      Documento: {
        Encabezado: {
          IdDoc: { TipoDTE: 39, FchEmis: fecha, FchVenc: fecha, IndServicioBoleta: 3 },
          Emisor: {
            RUTEmisor: emisor.rutEmisor,
            RznSocEmisor: emisor.razonSocial,
            GiroEmisor: emisor.giro,
            DirOrigen: emisor.dirOrigen,
            CmnaOrigen: emisor.comunaOrigen,
          },
          Receptor: { RUTRecep: RUT_SIN_RECEPTOR },
          Totales: { MntNeto: String(neto), IVA: String(total - neto), MntTotal: String(total) },
        },
        Detalle: detalle,
      },
      ...(extras.observaciones ? { Observaciones: extras.observaciones.slice(0, 500) } : {}),
      TipoPago: extras.tipoPago ?? "CONTADO",
    },
  }
}
