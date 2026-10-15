import { model } from "@medusajs/framework/utils"

/**
 * Registro atómico de la boleta/factura de un pedido. Es la fuente de verdad
 * para no emitir dos veces: antes de llamar a SimpleFactura se INSERTA una fila
 * "emitting", y el índice único sobre order_id hace que solo un proceso pueda
 * lograrlo, sin importar cuántas instancias haya ni en qué orden lleguen los
 * eventos.
 *
 * Estados:
 * - emitting: reservado; se está llamando a SimpleFactura.
 * - emitted: emitido y con folio.
 * - review: quedó "emitting" tras un fallo ambiguo (corte de red, 5xx, caída del
 *   servidor): el documento pudo emitirse sin que lo supiéramos. NO se reemite
 *   solo; alguien debe revisar en SimpleFactura (ver lib/invoice-claim.ts).
 */
const InvoiceDocument = model
  .define("invoice_document", {
    id: model.id().primaryKey(),
    order_id: model.text(),
    tipo: model.enum(["boleta", "factura"]),
    status: model.enum(["emitting", "emitted", "review"]).default("emitting"),
    folio: model.number().nullable(),
    codigo_tipo: model.number().nullable(),
    fecha: model.text().nullable(),
    ambiente: model.number().nullable(),
    total: model.number().nullable(),
    last_error: model.text().nullable(),
  })
  .indexes([{ on: ["order_id"], unique: true }])

export default InvoiceDocument
