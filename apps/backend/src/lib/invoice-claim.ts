import { SimpleFacturaError } from "./simplefactura"

export type InvoiceDocumentRow = {
  id: string
  status: "emitting" | "emitted" | "review"
  tipo: "boleta" | "factura"
  folio: number | null
  codigo_tipo: number | null
  fecha: string | null
  ambiente: number | null
  total: number | null
}

export type ClaimDecision =
  | { action: "claim" }
  | { action: "already_emitted"; row: InvoiceDocumentRow }
  | { action: "review"; row: InvoiceDocumentRow }

/**
 * Qué hacer según lo que ya hay registrado para el pedido. Esto se evalúa
 * DENTRO del candado, así que una fila "emitting" nunca es un intento en curso
 * de otro proceso: es el rastro de uno que murió a mitad de camino, y no se
 * sabe si SimpleFactura llegó a emitir. En ese caso NO se reemite (sería una
 * boleta duplicada): queda en "review" para revisarla a mano.
 */
export function decideClaim(row: InvoiceDocumentRow | null | undefined): ClaimDecision {
  if (!row) return { action: "claim" }
  if (row.status === "emitted" && row.folio) return { action: "already_emitted", row }
  return { action: "review", row }
}

/**
 * ¿El error garantiza que SimpleFactura NO emitió el documento? Solo cuando
 * respondió con un rechazo (HTTP < 500, incluidos los fallos al pedir el token,
 * que ocurren antes de emitir). Un 5xx o un corte de red son ambiguos: pudo
 * haberse emitido, así que la reserva se conserva.
 */
export function isDefinitiveFailure(err: unknown): boolean {
  return err instanceof SimpleFacturaError && typeof err.status === "number" && err.status < 500
}
