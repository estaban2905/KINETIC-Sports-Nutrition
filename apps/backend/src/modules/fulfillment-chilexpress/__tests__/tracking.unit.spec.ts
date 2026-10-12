import { fetchTracking, parseTracking } from "../tracking"

const options = { apiKey: "k", customerCardNumber: "18578680", rut: "96756430" }

describe("parseTracking", () => {
  it("is delivered when a delivery event exists", () => {
    const result = parseTracking({
      data: {
        trackingEvents: [
          { description: "PIEZA EN RUTA", code: { clientEventDescription: "EN RUTA" } },
          {
            description: "PIEZA ENTREGADA A DESTINATARIO",
            eventDateTime: "2018-10-29T16:06:00Z",
            code: { clientEventDescription: "ENTREGADO" },
          },
        ],
        transportOrderData: { status: "DESCARGADA" },
      },
    })

    expect(result).toMatchObject({
      delivered: true,
      status: "DESCARGADA",
      deliveredAt: "2018-10-29T16:06:00Z",
    })
  })

  it("returns every event newest first with readable text", () => {
    const result = parseTracking({
      data: {
        trackingEvents: [
          { description: "RECEPCIONADO", eventDateTime: "2018-10-26T18:42:00Z" },
          { description: "PIEZA EN RUTA", eventDateTime: "2018-10-29T09:05:00Z" },
          { description: "PIEZA EN TRANSITO AL DESTINO", eventDateTime: "2018-10-26T19:12:00Z" },
        ],
      },
    })

    expect(result.events).toEqual([
      { at: "2018-10-29T09:05:00Z", description: "Pieza en ruta" },
      { at: "2018-10-26T19:12:00Z", description: "Pieza en transito al destino" },
      { at: "2018-10-26T18:42:00Z", description: "Recepcionado" },
    ])
  })

  it("is not delivered while the package is still moving", () => {
    const result = parseTracking({
      data: {
        trackingEvents: [{ description: "PIEZA EN RUTA", code: { clientEventDescription: "EN RUTA" } }],
        deliveryData: null,
      },
    })

    expect(result.delivered).toBe(false)
  })
})

describe("fetchTracking", () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("returns null for a fresh OT Chilexpress can't answer yet (-41)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ data: null, statusCode: -41, statusDescription: "La OT no se encuentra disponible" }),
    })

    await expect(
      fetchTracking(options, { transportOrderNumber: "712100833404", reference: "5" })
    ).resolves.toBeNull()
  })

  it("sends the OT number, reference and company RUT", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { trackingEvents: [] }, statusCode: 0 }),
    })

    await fetchTracking(options, { transportOrderNumber: "712100833404", reference: "5" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://services.wschilexpress.com/transport-orders/api/v1.0/tracking")
    expect(JSON.parse(init.body)).toEqual({
      transportOrderNumber: 712100833404,
      reference: "5",
      rut: 96756430,
      showTrackingEvents: 1,
    })
  })

  it("throws on a server error so the job logs it instead of silently skipping", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => null })

    await expect(
      fetchTracking(options, { transportOrderNumber: "1", reference: "5" })
    ).rejects.toThrow(/500/)
  })
})
