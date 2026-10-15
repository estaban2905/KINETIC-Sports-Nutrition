import { decideClaim, isDefinitiveFailure, type InvoiceDocumentRow } from "../invoice-claim"
import { SimpleFacturaError } from "../simplefactura"

const row = (over: Partial<InvoiceDocumentRow> = {}): InvoiceDocumentRow => ({
  id: "invdoc_1",
  status: "emitting",
  tipo: "boleta",
  folio: null,
  codigo_tipo: null,
  fecha: null,
  ambiente: null,
  total: null,
  ...over,
})

describe("decideClaim", () => {
  it("sin registro previo: reserva y emite", () => {
    expect(decideClaim(null)).toEqual({ action: "claim" })
    expect(decideClaim(undefined)).toEqual({ action: "claim" })
  })

  it("ya emitida con folio: no emite otra", () => {
    const emitted = row({ status: "emitted", folio: 8726 })
    expect(decideClaim(emitted)).toEqual({ action: "already_emitted", row: emitted })
  })

  it("reserva 'emitting' o 'review' (fallo ambiguo previo): NO reemite, pide revisión", () => {
    expect(decideClaim(row({ status: "emitting" })).action).toBe("review")
    expect(decideClaim(row({ status: "review" })).action).toBe("review")
  })

  it("'emitted' sin folio se trata como dudosa, no como emitida", () => {
    expect(decideClaim(row({ status: "emitted", folio: null })).action).toBe("review")
  })
})

describe("isDefinitiveFailure", () => {
  it("rechazos de SimpleFactura (HTTP < 500) garantizan que no se emitió", () => {
    expect(isDefinitiveFailure(new SimpleFacturaError("rechazado", 400))).toBe(true)
    expect(isDefinitiveFailure(new SimpleFacturaError("sin token", 429))).toBe(true)
    expect(isDefinitiveFailure(new SimpleFacturaError("sin folio", 200))).toBe(true)
  })

  it("5xx, cortes de red y errores desconocidos son ambiguos", () => {
    expect(isDefinitiveFailure(new SimpleFacturaError("caído", 503))).toBe(false)
    expect(isDefinitiveFailure(new SimpleFacturaError("sin status"))).toBe(false)
    expect(isDefinitiveFailure(new TypeError("fetch failed"))).toBe(false)
    expect(isDefinitiveFailure("texto")).toBe(false)
  })
})
