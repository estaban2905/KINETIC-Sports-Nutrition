import { buildBoletaPayload, fechaChile, RUT_SIN_RECEPTOR } from "../boleta"
import { getSimpleFacturaConfig, SimpleFacturaClient, SimpleFacturaError } from "../simplefactura"

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

describe("buildBoletaPayload", () => {
  it("builds gross lines, a shipping line and IVA-split totals", () => {
    const { payload, total } = buildBoletaPayload(
      {
        items: [{ product_title: "ISO-WHEY", variant_title: "Chocolate", quantity: 2, unit_price: 21495, variant_sku: "ISO-CHO" }],
        shipping_total: 3990,
      },
      emisor,
      {},
      "2026-10-12"
    )
    const doc = (payload as any).Documento
    expect(total).toBe(46980)
    expect(doc.Encabezado.IdDoc).toMatchObject({ TipoDTE: 39, FchEmis: "2026-10-12" })
    expect(doc.Encabezado.Receptor).toEqual({ RUTRecep: RUT_SIN_RECEPTOR })
    expect(doc.Encabezado.Totales).toEqual({ MntNeto: "39479", IVA: "7501", MntTotal: "46980" })
    expect(doc.Detalle).toHaveLength(2)
    expect(doc.Detalle[0]).toMatchObject({
      NroLinDet: "1",
      NmbItem: "ISO-WHEY - Chocolate",
      QtyItem: "2",
      PrcItem: "21495",
      MontoItem: "42990",
      CdgItem: [{ TpoCodigo: "SKU", VlrCodigo: "ISO-CHO" }],
    })
    expect(doc.Detalle[1]).toMatchObject({ NroLinDet: "2", NmbItem: "Despacho", MontoItem: "3990" })
  })

  it("applies the item discount and keeps neto + IVA = total", () => {
    const { payload, total } = buildBoletaPayload(
      { items: [{ product_title: "Shaker", variant_title: "Único", quantity: 1, unit_price: 10000, discount_total: 1000 }] },
      emisor
    )
    const doc = (payload as any).Documento
    expect(total).toBe(9000)
    expect(doc.Detalle[0]).toMatchObject({ NmbItem: "Shaker", DescuentoMonto: "1000", MontoItem: "9000" })
    const { MntNeto, IVA, MntTotal } = doc.Encabezado.Totales
    expect(Number(MntNeto) + Number(IVA)).toBe(Number(MntTotal))
  })

  it("omits the shipping line when shipping is free and truncates long names", () => {
    const { payload } = buildBoletaPayload(
      { items: [{ product_title: "X".repeat(120), quantity: 1, unit_price: 1000 }], shipping_total: 0 },
      emisor
    )
    const detalle = (payload as any).Documento.Detalle
    expect(detalle).toHaveLength(1)
    expect(detalle[0].NmbItem.length).toBeLessThanOrEqual(80)
  })
})

describe("fechaChile", () => {
  it("uses Chile's date, not UTC's", () => {
    // 02:00 UTC on the 13th is still the 12th evening in Santiago (UTC-3/-4).
    expect(fechaChile(new Date("2026-10-13T02:00:00Z"))).toBe("2026-10-12")
  })
})

describe("getSimpleFacturaConfig", () => {
  it("is null until email, password and RUT are set", () => {
    expect(getSimpleFacturaConfig({} as any)).toBeNull()
    expect(
      getSimpleFacturaConfig({ SIMPLEFACTURA_EMAIL: "a@b.cl", SIMPLEFACTURA_PASSWORD: "x" } as any)
    ).toBeNull()
  })

  it("defaults to certificación and Casa Matriz", () => {
    const config = getSimpleFacturaConfig({
      SIMPLEFACTURA_EMAIL: "a@b.cl",
      SIMPLEFACTURA_PASSWORD: "x",
      SIMPLEFACTURA_RUT_EMISOR: "78181331-1",
    } as any)
    expect(config).toMatchObject({ ambiente: 0, sucursal: "Casa Matriz", baseUrl: "https://api.simplefactura.cl" })
  })
})

describe("SimpleFacturaClient", () => {
  const config = {
    ...emisor,
    baseUrl: "https://sf.test",
    email: "a@b.cl",
    password: "x",
    sucursal: "Casa Matriz",
    ambiente: 0 as const,
  }
  const json = (status: number, body: unknown) =>
    ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response

  it("caches the token and posts to the branch URL with validaMontos", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json(200, { accessToken: "jwt", expiresIn: 86400 }))
      .mockResolvedValue(json(200, { status: 200, data: { folio: 55, total: 1000, fechaEmision: "12-10-2026" } }))
    const client = new SimpleFacturaClient(config, fetchMock as any)

    expect((await client.emitirBoleta({})).folio).toBe(55)
    await client.emitirBoleta({})

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/token"))
    expect(tokenCalls).toHaveLength(1)
    expect(fetchMock.mock.calls[1][0]).toBe("https://sf.test/invoiceV2/Casa_Matriz/validaMontos")
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer jwt")
  })

  it("renews the token once on 401", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json(200, { accessToken: "old", expiresIn: 86400 }))
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { accessToken: "new", expiresIn: 86400 }))
      .mockResolvedValueOnce(json(200, { status: 200, data: { folio: 7, total: 1, fechaEmision: "x" } }))
    const client = new SimpleFacturaClient(config, fetchMock as any)
    expect((await client.emitirBoleta({})).folio).toBe(7)
  })

  it("throws a SimpleFacturaError with the API's message when emission is rejected", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json(200, { accessToken: "jwt", expiresIn: 86400 }))
      .mockResolvedValueOnce(json(400, { status: 400, message: "Sin folios disponibles", data: null, errors: ["CAF agotado"] }))
    const client = new SimpleFacturaClient(config, fetchMock as any)
    await expect(client.emitirBoleta({})).rejects.toThrow(/Sin folios disponibles \| CAF agotado/)
    await expect(Promise.reject(new SimpleFacturaError("x", 400))).rejects.toBeInstanceOf(SimpleFacturaError)
  })
})
