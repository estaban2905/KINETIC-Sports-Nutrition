import type { SimpleFacturaConfig } from "./simplefactura"
import { fechaChile } from "./boleta"
import { formatRutForSii } from "./rut"

const IVA_RATE = 0.19
const MAX_NAME_LENGTH = 80

/** Billing data the customer enters at checkout when they ask for a factura. */
export type BillingData = {
  tipo?: "boleta" | "factura"
  rut?: string
  razon_social?: string
  giro?: string
  direccion?: string
  comuna?: string
  ciudad?: string
  email?: string
}

export type FacturaOrderItem = {
  product_title?: string | null
  variant_title?: string | null
  variant_sku?: string | null
  quantity?: number | null
  unit_price?: number | null
  discount_total?: number | null
}

export type FacturaOrder = {
  email?: string | null
  items?: FacturaOrderItem[] | null
  shipping_total?: number | null
}

const trunc = (value: string | undefined, max: number): string => (value ?? "").trim().slice(0, max)

function itemName(item: FacturaOrderItem): string {
  const variant = item.variant_title && item.variant_title !== "Único" ? ` - ${item.variant_title}` : ""
  const name = `${item.product_title ?? "Producto"}${variant}`
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…` : name
}

/**
 * Builds the invoiceV2 body for a factura electrónica (tipo 33). Lines are sent
 * gross (IVA included, MntBruto = 1), like the store prices; the totals are
 * split into neto + IVA here. SimpleFactura does not support validaMontos
 * together with MntBruto, so the caller must not use that URL.
 */
export function buildFacturaPayload(
  order: FacturaOrder,
  billing: BillingData,
  emisor: Pick<
    SimpleFacturaConfig,
    "rutEmisor" | "razonSocial" | "giro" | "dirOrigen" | "comunaOrigen" | "acteco" | "telefono" | "correoEmisor"
  >,
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

  const emisorBody: Record<string, unknown> = {
    RUTEmisor: emisor.rutEmisor,
    RznSoc: emisor.razonSocial,
    GiroEmis: emisor.giro,
    DirOrigen: emisor.dirOrigen,
    CmnaOrigen: emisor.comunaOrigen,
  }
  if (emisor.acteco.length) emisorBody.Acteco = emisor.acteco
  if (emisor.telefono) emisorBody.Telefono = [emisor.telefono]
  if (emisor.correoEmisor) emisorBody.CorreoEmisor = emisor.correoEmisor

  const comuna = trunc(billing.comuna, 20)
  const receptor: Record<string, unknown> = {
    RUTRecep: formatRutForSii(billing.rut ?? ""),
    RznSocRecep: trunc(billing.razon_social, 100),
    GiroRecep: trunc(billing.giro, 40),
    DirRecep: trunc(billing.direccion, 70),
    CmnaRecep: comuna,
    CiudadRecep: trunc(billing.ciudad || billing.comuna, 20),
  }
  const correo = billing.email || order.email
  // CorreoRecep is the mailbox SimpleFactura uses to send the DTE automatically.
  if (correo) receptor.CorreoRecep = trunc(correo, 80)

  return {
    total,
    payload: {
      Documento: {
        Encabezado: {
          IdDoc: { TipoDTE: 33, FchEmis: fecha, FchVenc: fecha, FmaPago: 1, MntBruto: 1 },
          Emisor: emisorBody,
          Receptor: receptor,
          Totales: { MntNeto: String(neto), TasaIVA: "19", IVA: String(total - neto), MntTotal: String(total) },
        },
        Detalle: detalle,
      },
      ...(extras.observaciones ? { Observaciones: extras.observaciones.slice(0, 500) } : {}),
      TipoPago: extras.tipoPago ?? "CONTADO",
    },
  }
}
