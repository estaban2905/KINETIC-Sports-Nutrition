import { buildFacturaPayload } from "../factura"
import {
  buildObservaciones,
  existingDocument,
  isDocumentPending,
  paymentLabel,
  resolveDocumentType,
} from "../invoice-order"
import { formatRutForSii, isValidRut } from "../rut"

const emisor = {
  rutEmisor: "78181331-1",
  razonSocial: "CHILESYSTEMS SPA",
  giro: "Desarrollo de software",
  dirOrigen: "Calle 7 numero 3",
  comunaOrigen: "Santiago",
  acteco: [620200],
  telefono: "912345678",
  correoEmisor: "ventas@kinetic.cl",
}

const billing = {
  tipo: "factura" as const,
  rut: "17.096.073-4",
  razon_social: "Gimnasio Ñuñoa SpA",
  giro: "Gimnasios",
  direccion: "Calle 12 345",
  comuna: "Ñuñoa",
}

describe("rut", () => {
  it("validates the check digit", () => {
    expect(isValidRut("17.096.073-4")).toBe(true)
    expect(isValidRut("17096073-4")).toBe(true)
    expect(isValidRut("17096073-5")).toBe(false)
    expect(isValidRut("78181331-1")).toBe(true)
    expect(isValidRut("10422710-4")).toBe(true)
  })

  it("accepts K and rejects junk", () => {
    expect(isValidRut("")).toBe(false)
    expect(isValidRut(null)).toBe(false)
    expect(isValidRut("abc")).toBe(false)
    expect(isValidRut("1-9")).toBe(false)
  })

  it("formats for the SII without dots and with an uppercase K", () => {
    expect(formatRutForSii("17.096.073-4")).toBe("17096073-4")
    expect(formatRutForSii("12.345.678-k")).toBe("12345678-K")
  })
})

describe("buildFacturaPayload", () => {
  it("sends gross lines (MntBruto 1) with full receptor and emisor data", () => {
    const { payload, total } = buildFacturaPayload(
      { email: "cli@ente.cl", items: [{ product_title: "ISO", quantity: 1, unit_price: 42990 }], shipping_total: 3990 },
      billing,
      emisor,
      { observaciones: "obs", tipoPago: "Khipu" },
      "2026-10-12"
    )
    const doc = (payload as any).Documento
    expect(total).toBe(46980)
    expect(doc.Encabezado.IdDoc).toEqual({ TipoDTE: 33, FchEmis: "2026-10-12", FchVenc: "2026-10-12", FmaPago: 1, MntBruto: 1 })
    expect(doc.Encabezado.Emisor).toMatchObject({ RznSoc: "CHILESYSTEMS SPA", GiroEmis: "Desarrollo de software", Acteco: [620200] })
    expect(doc.Encabezado.Receptor).toMatchObject({
      RUTRecep: "17096073-4",
      RznSocRecep: "Gimnasio Ñuñoa SpA",
      GiroRecep: "Gimnasios",
      CmnaRecep: "Ñuñoa",
      CorreoRecep: "cli@ente.cl",
    })
    expect(doc.Encabezado.Totales).toEqual({ MntNeto: "39479", TasaIVA: "19", IVA: "7501", MntTotal: "46980" })
    expect((payload as any).Observaciones).toBe("obs")
    expect((payload as any).TipoPago).toBe("Khipu")
  })

  it("truncates receptor fields to the SII limits", () => {
    const { payload } = buildFacturaPayload(
      { items: [{ product_title: "X", quantity: 1, unit_price: 1000 }] },
      { ...billing, giro: "G".repeat(80), razon_social: "R".repeat(150) },
      emisor
    )
    const receptor = (payload as any).Documento.Encabezado.Receptor
    expect(receptor.GiroRecep).toHaveLength(40)
    expect(receptor.RznSocRecep).toHaveLength(100)
  })
})

describe("resolveDocumentType", () => {
  it("is a boleta by default", () => {
    expect(resolveDocumentType(undefined).tipo).toBe("boleta")
    expect(resolveDocumentType({ billing: { tipo: "boleta" } }).tipo).toBe("boleta")
  })

  it("is a factura only with a valid RUT, razón social and giro", () => {
    expect(resolveDocumentType({ billing }).tipo).toBe("factura")
    expect(resolveDocumentType({ billing: { ...billing, rut: "17096073-5" } }).tipo).toBe("boleta")
    expect(resolveDocumentType({ billing: { ...billing, giro: " " } }).tipo).toBe("boleta")
    expect(resolveDocumentType({ billing: { ...billing, razon_social: "" } }).tipo).toBe("boleta")
  })
})

describe("document state", () => {
  it("finds the issued document and whether it still needs work", () => {
    expect(existingDocument({})).toBeNull()
    expect(isDocumentPending({})).toBe(true)
    expect(isDocumentPending({ boleta: { folio: 1, emailed: false } })).toBe(true)
    expect(isDocumentPending({ boleta: { folio: 1, emailed: true } })).toBe(false)
    expect(existingDocument({ factura: { folio: 9 } })?.tipo).toBe("factura")
  })
})

describe("printed text", () => {
  it("labels the payment method", () => {
    expect(paymentLabel("pp_khipu_khipu")).toBe("Transferencia (Khipu)")
    expect(paymentLabel("pp_webpay_webpay")).toBe("Tarjeta (Webpay)")
    expect(paymentLabel("pp_system_default")).toBe("Contado")
    expect(paymentLabel(undefined)).toBe("Contado")
  })

  it("builds the footer with the order number and tracking link", () => {
    process.env.STOREFRONT_URL = "https://tienda.cl"
    const text = buildObservaciones(11)
    expect(text).toContain("Pedido #11")
    expect(text).toContain("https://tienda.cl/seguimiento")
    expect(text.length).toBeLessThanOrEqual(500)
    delete process.env.STOREFRONT_URL
  })
})
