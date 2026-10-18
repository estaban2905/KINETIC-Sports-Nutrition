const mockFetchTracking = jest.fn()
const mockHasPackage = jest.fn()
const mockShipment = jest.fn()
const mockDelivered = jest.fn()
const mockCaptureException = jest.fn()

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { QUERY: "query", LOGGER: "logger" },
  Modules: { FULFILLMENT: "fulfillment" },
}))
jest.mock("@medusajs/medusa/core-flows", () => ({
  createOrderShipmentWorkflow: () => ({ run: mockShipment }),
  markOrderFulfillmentAsDeliveredWorkflow: () => ({ run: mockDelivered }),
}))
jest.mock("../../lib/order-status", () => ({ chilexpressHasPackage: (...a: unknown[]) => mockHasPackage(...a) }))
jest.mock("../../modules/fulfillment-chilexpress/tracking", () => ({
  fetchTracking: (...a: unknown[]) => mockFetchTracking(...a),
}))
jest.mock("../../lib/sentry", () => ({ Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a) } }))

import syncChilexpressTracking, { config } from "../sync-chilexpress-tracking"

const ENV_KEYS = ["CHILEXPRESS_ENVIOS_API_KEY", "CHILEXPRESS_RUT", "CHILEXPRESS_TCC", "CHILEXPRESS_ENVIOS_BASE_URL"]

const fulfillment = (over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  id: "ful1",
  shipped_at: null,
  items: [{ line_item_id: "li1", quantity: 2 }],
  data: { transport_order_number: 123, reference: "ref", ...data },
  ...over,
})

function makeContainer(fulfillments: unknown[], orderId: string | null = "order1") {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const updateFulfillment = jest.fn().mockResolvedValue(undefined)
  const graph = jest.fn(async ({ entity }: { entity: string }) => {
    if (entity === "fulfillment") return { data: fulfillments }
    return { data: orderId ? [{ order_id: orderId }] : [] }
  })
  const services: Record<string, unknown> = {
    logger,
    query: { graph },
    fulfillment: { updateFulfillment },
  }
  return { container: { resolve: (k: string) => services[k] } as any, logger, graph, updateFulfillment }
}

describe("syncChilexpressTracking job", () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    jest.clearAllMocks()
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
    process.env.CHILEXPRESS_ENVIOS_API_KEY = "key"
    process.env.CHILEXPRESS_RUT = "11111111-1"
    mockHasPackage.mockReturnValue(false)
    mockShipment.mockResolvedValue({})
    mockDelivered.mockResolvedValue({})
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it("is scheduled every 30 minutes", () => {
    expect(config.schedule).toBe("*/30 * * * *")
  })

  it.each([["CHILEXPRESS_ENVIOS_API_KEY"], ["CHILEXPRESS_RUT"]])("does nothing when %s is missing", async (key) => {
    delete process.env[key]
    const { container, graph } = makeContainer([fulfillment()])

    await syncChilexpressTracking(container)

    expect(graph).not.toHaveBeenCalled()
  })

  it("ignores fulfillments that have no transport order yet", async () => {
    const { container } = makeContainer([fulfillment({}, { transport_order_number: undefined })])

    await syncChilexpressTracking(container)

    expect(mockFetchTracking).not.toHaveBeenCalled()
  })

  it("passes the configured credentials to Chilexpress", async () => {
    process.env.CHILEXPRESS_TCC = "tcc1"
    process.env.CHILEXPRESS_ENVIOS_BASE_URL = "https://envios.test"
    mockFetchTracking.mockResolvedValue(null)
    const { container } = makeContainer([fulfillment()])

    await syncChilexpressTracking(container)

    expect(mockFetchTracking).toHaveBeenCalledWith(
      { apiKey: "key", rut: "11111111-1", customerCardNumber: "tcc1", baseUrl: "https://envios.test" },
      { transportOrderNumber: 123, reference: "ref" }
    )
  })

  it("skips fulfillments Chilexpress knows nothing about", async () => {
    mockFetchTracking.mockResolvedValue(null)
    const { container, updateFulfillment } = makeContainer([fulfillment()])

    await syncChilexpressTracking(container)

    expect(updateFulfillment).not.toHaveBeenCalled()
    expect(mockShipment).not.toHaveBeenCalled()
  })

  describe("timeline", () => {
    const events = [{ code: "A", description: "Admitido" }]

    it("stores new events, status and certificate when Chilexpress reports something new", async () => {
      mockFetchTracking.mockResolvedValue({ events, status: "En ruta", certificateUrl: "https://cert", delivered: false })
      const { container, updateFulfillment } = makeContainer([fulfillment()])

      await syncChilexpressTracking(container)

      expect(updateFulfillment).toHaveBeenCalledWith("ful1", {
        data: expect.objectContaining({
          transport_order_number: 123,
          tracking_events: events,
          tracking_status: "En ruta",
          tracking_certificate_url: "https://cert",
        }),
      })
    })

    it("writes nothing when the timeline hasn't changed", async () => {
      mockFetchTracking.mockResolvedValue({ events, status: "En ruta", certificateUrl: "https://cert", delivered: false })
      const { container, updateFulfillment } = makeContainer([
        fulfillment({}, {
          tracking_events: events,
          tracking_status: "En ruta",
          tracking_certificate_url: "https://cert",
        }),
      ])

      await syncChilexpressTracking(container)

      expect(updateFulfillment).not.toHaveBeenCalled()
    })

    it("rewrites events stored before `code` existed", async () => {
      mockFetchTracking.mockResolvedValue({ events, status: "En ruta", certificateUrl: "https://cert", delivered: false })
      const { container, updateFulfillment } = makeContainer([
        fulfillment({}, {
          tracking_events: [{ description: "Admitido" }],
          tracking_status: "En ruta",
          tracking_certificate_url: "https://cert",
        }),
      ])

      await syncChilexpressTracking(container)

      expect(updateFulfillment).toHaveBeenCalledTimes(1)
    })

    it("updates when only the status changes", async () => {
      mockFetchTracking.mockResolvedValue({ events, status: "Entregado", certificateUrl: null, delivered: false })
      const { container, updateFulfillment } = makeContainer([
        fulfillment({}, { tracking_events: events, tracking_status: "En ruta" }),
      ])

      await syncChilexpressTracking(container)

      expect(updateFulfillment).toHaveBeenCalledTimes(1)
    })
  })

  describe("shipping and delivery", () => {
    const tracking = (over: Record<string, unknown> = {}) => ({
      events: [],
      status: null,
      certificateUrl: null,
      delivered: false,
      ...over,
    })

    it("marks the fulfillment as shipped once Chilexpress has the package", async () => {
      mockHasPackage.mockReturnValue(true)
      mockFetchTracking.mockResolvedValue(tracking())
      const { container, logger } = makeContainer([fulfillment()])

      await syncChilexpressTracking(container)

      expect(mockShipment).toHaveBeenCalledWith({
        input: { order_id: "order1", fulfillment_id: "ful1", items: [{ id: "li1", quantity: 2 }] },
      })
      expect(mockDelivered).not.toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("marcado como enviado"))
    })

    it("doesn't ship again when the fulfillment was already shipped", async () => {
      mockHasPackage.mockReturnValue(true)
      mockFetchTracking.mockResolvedValue(tracking())
      const { container } = makeContainer([fulfillment({ shipped_at: "2026-01-01" })])

      await syncChilexpressTracking(container)

      expect(mockShipment).not.toHaveBeenCalled()
    })

    it("does nothing more while Chilexpress doesn't have the package and it isn't delivered", async () => {
      mockFetchTracking.mockResolvedValue(tracking())
      const { container, graph } = makeContainer([fulfillment()])

      await syncChilexpressTracking(container)

      expect(graph).toHaveBeenCalledTimes(1) // solo la consulta de despachos
    })

    it("ships first and then delivers a package first seen as already delivered", async () => {
      mockHasPackage.mockReturnValue(true)
      mockFetchTracking.mockResolvedValue(tracking({ delivered: true }))
      const { container, logger } = makeContainer([fulfillment()])

      await syncChilexpressTracking(container)

      expect(mockShipment).toHaveBeenCalledTimes(1)
      expect(mockDelivered).toHaveBeenCalledWith({ input: { orderId: "order1", fulfillmentId: "ful1" } })
      expect(mockShipment.mock.invocationCallOrder[0]).toBeLessThan(mockDelivered.mock.invocationCallOrder[0])
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("marcado como entregado"))
    })

    it("delivers an already shipped fulfillment without shipping it again", async () => {
      mockFetchTracking.mockResolvedValue(tracking({ delivered: true }))
      const { container } = makeContainer([fulfillment({ shipped_at: "2026-01-01" })])

      await syncChilexpressTracking(container)

      expect(mockShipment).not.toHaveBeenCalled()
      expect(mockDelivered).toHaveBeenCalledTimes(1)
    })

    it("skips fulfillments that aren't linked to an order", async () => {
      mockHasPackage.mockReturnValue(true)
      mockFetchTracking.mockResolvedValue(tracking({ delivered: true }))
      const { container } = makeContainer([fulfillment()], null)

      await syncChilexpressTracking(container)

      expect(mockShipment).not.toHaveBeenCalled()
      expect(mockDelivered).not.toHaveBeenCalled()
    })

    it("tolerates a fulfillment without items", async () => {
      mockHasPackage.mockReturnValue(true)
      mockFetchTracking.mockResolvedValue(tracking())
      const { container } = makeContainer([fulfillment({ items: undefined })])

      await syncChilexpressTracking(container)

      expect(mockShipment.mock.calls[0][0].input.items).toEqual([])
    })
  })

  describe("failures", () => {
    it("logs, reports to Sentry and continues with the next fulfillment", async () => {
      mockFetchTracking.mockRejectedValueOnce(new Error("api caída")).mockResolvedValueOnce(null)
      const { container, logger } = makeContainer([fulfillment({ id: "ful1" }), fulfillment({ id: "ful2" })])

      await syncChilexpressTracking(container)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("ful1: api caída"))
      expect(mockCaptureException).toHaveBeenCalledTimes(1)
      expect(mockFetchTracking).toHaveBeenCalledTimes(2)
    })

    it("logs non-Error failures too", async () => {
      mockFetchTracking.mockRejectedValueOnce("boom")
      const { container, logger } = makeContainer([fulfillment()])

      await syncChilexpressTracking(container)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("boom"))
    })
  })
})
