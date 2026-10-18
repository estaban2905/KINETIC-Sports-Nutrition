const mockRun = jest.fn()
const mockWebpayStatus = jest.fn()
const mockMpSearch = jest.fn()
const mockCaptureMessage = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: jest.fn(() => ({ run: mockRun })),
}))
jest.mock("transbank-sdk", () => ({
  Environment: { Production: "production" },
  IntegrationApiKeys: { WEBPAY: "key" },
  IntegrationCommerceCodes: { WEBPAY_PLUS: "code" },
  Options: jest.fn(),
  WebpayPlus: {
    Transaction: Object.assign(
      jest.fn(() => ({ status: mockWebpayStatus })),
      { buildForIntegration: jest.fn(() => ({ status: mockWebpayStatus })) }
    ),
  },
}))
jest.mock("mercadopago", () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn(() => ({ search: mockMpSearch })),
}))
jest.mock("../../lib/sentry", () => ({ Sentry: { captureMessage: (...a: unknown[]) => mockCaptureMessage(...a) } }))

import reconcilePayments, { config } from "../reconcile-payments"

type Session = {
  id: string
  provider_id: string
  data: Record<string, unknown>
  payment_collection_id: string
}

const session = (provider_id: string, data: Record<string, unknown>, id = "ps1"): Session => ({
  id,
  provider_id,
  data,
  payment_collection_id: "pc1",
})

function makeContainer(opts: { sessions: Session[]; cartId?: string | null; orderId?: string | null }) {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const graph = jest.fn(async ({ entity }: { entity: string }) => {
    if (entity === "payment_session") return { data: opts.sessions }
    if (entity === "cart_payment_collection") {
      return { data: opts.cartId === null ? [] : [{ cart_id: opts.cartId ?? "cart1" }] }
    }
    if (entity === "order_cart") return { data: opts.orderId ? [{ order_id: opts.orderId }] : [] }
    return { data: [] }
  })
  const container = {
    resolve: (key: string) => (key === "logger" ? logger : { graph }),
  }
  return { container: container as any, logger, graph }
}

describe("reconcilePayments job", () => {
  const originalFetch = global.fetch
  const envKeys = ["TRANSBANK_ENVIRONMENT", "TRANSBANK_COMMERCE_CODE", "TRANSBANK_API_KEY", "MERCADOPAGO_ACCESS_TOKEN", "KHIPU_API_KEY"]
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    jest.clearAllMocks()
    mockRun.mockResolvedValue({ errors: [] })
    for (const k of envKeys) {
      savedEnv[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    global.fetch = originalFetch
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it("is scheduled every 10 minutes", () => {
    expect(config.schedule).toBe("*/10 * * * *")
  })

  it("does nothing when there are no unresolved sessions", async () => {
    const { container, logger } = makeContainer({ sessions: [] })

    await reconcilePayments(container)

    expect(logger.info).not.toHaveBeenCalled()
    expect(mockRun).not.toHaveBeenCalled()
  })

  describe("Webpay", () => {
    it("completes the cart when Transbank says the payment was authorized", async () => {
      mockWebpayStatus.mockResolvedValue({ status: "AUTHORIZED", response_code: 0 })
      const { container, logger } = makeContainer({ sessions: [session("pp_webpay_webpay", { token: "t1" })] })

      await reconcilePayments(container)

      expect(mockWebpayStatus).toHaveBeenCalledWith("t1")
      expect(mockRun).toHaveBeenCalledWith({ input: { id: "cart1" }, throwOnError: false })
      expect(logger.warn).toHaveBeenCalled()
      expect(mockCaptureMessage).not.toHaveBeenCalled()
    })

    it("does not touch the cart when Transbank says it was not paid", async () => {
      mockWebpayStatus.mockResolvedValue({ status: "FAILED", response_code: -1 })
      const { container } = makeContainer({ sessions: [session("pp_webpay_webpay", { token: "t1" })] })

      await reconcilePayments(container)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it("skips sessions that never got a token", async () => {
      const { container } = makeContainer({ sessions: [session("pp_webpay_webpay", {})] })

      await reconcilePayments(container)

      expect(mockWebpayStatus).not.toHaveBeenCalled()
      expect(mockRun).not.toHaveBeenCalled()
    })

    it("builds a production transaction when configured for production", async () => {
      process.env.TRANSBANK_ENVIRONMENT = "production"
      process.env.TRANSBANK_COMMERCE_CODE = "cc"
      process.env.TRANSBANK_API_KEY = "key"
      mockWebpayStatus.mockResolvedValue({ status: "AUTHORIZED", response_code: 0 })
      const { container } = makeContainer({ sessions: [session("pp_webpay_webpay", { token: "t1" })] })

      await reconcilePayments(container)

      const { Options, WebpayPlus } = jest.requireMock("transbank-sdk")
      expect(Options).toHaveBeenCalledWith("cc", "key", "production")
      expect(WebpayPlus.Transaction).toHaveBeenCalled()
      expect(mockRun).toHaveBeenCalled()
    })

    it("reuses a single Webpay client across sessions", async () => {
      mockWebpayStatus.mockResolvedValue({ status: "FAILED" })
      const { container } = makeContainer({
        sessions: [session("pp_webpay_webpay", { token: "a" }, "ps1"), session("pp_webpay_webpay", { token: "b" }, "ps2")],
      })

      await reconcilePayments(container)

      const { WebpayPlus } = jest.requireMock("transbank-sdk")
      expect(WebpayPlus.Transaction.buildForIntegration).toHaveBeenCalledTimes(1)
      expect(mockWebpayStatus).toHaveBeenCalledTimes(2)
    })
  })

  describe("Mercado Pago", () => {
    const mpSession = () => session("pp_mercadopago_mercadopago", { session_id: "s1" })

    it("completes the cart when the latest MP payment is approved", async () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "tok"
      mockMpSearch.mockResolvedValue({ results: [{ status: "approved" }] })
      const { container } = makeContainer({ sessions: [mpSession()] })

      await reconcilePayments(container)

      expect(mockMpSearch).toHaveBeenCalledWith({
        options: { external_reference: "s1", sort: "date_created", criteria: "desc" },
      })
      expect(mockRun).toHaveBeenCalled()
    })

    it("does not complete the cart for a pending payment or an empty result", async () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "tok"
      const { container } = makeContainer({ sessions: [mpSession()] })

      mockMpSearch.mockResolvedValueOnce({ results: [{ status: "pending" }] })
      await reconcilePayments(container)
      mockMpSearch.mockResolvedValueOnce({})
      await reconcilePayments(container)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it("skips the session when Mercado Pago isn't configured", async () => {
      const { container } = makeContainer({ sessions: [mpSession()] })

      await reconcilePayments(container)

      expect(mockMpSearch).not.toHaveBeenCalled()
    })

    it("skips sessions without a session_id", async () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "tok"
      const { container } = makeContainer({ sessions: [session("pp_mercadopago_mercadopago", {})] })

      await reconcilePayments(container)

      expect(mockMpSearch).not.toHaveBeenCalled()
    })
  })

  describe("Khipu", () => {
    const khipuSession = () => session("pp_khipu_khipu", { payment_id: "k1" })

    it("completes the cart when Khipu reports the payment as done", async () => {
      process.env.KHIPU_API_KEY = "key"
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "done" }) })
      global.fetch = fetchMock as unknown as typeof fetch
      const { container } = makeContainer({ sessions: [khipuSession()] })

      await reconcilePayments(container)

      expect(fetchMock).toHaveBeenCalledWith("https://payment-api.khipu.com/v3/payments/k1", {
        headers: { "x-api-key": "key" },
      })
      expect(mockRun).toHaveBeenCalled()
    })

    it("does nothing when Khipu answers with an error", async () => {
      process.env.KHIPU_API_KEY = "key"
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
      const { container } = makeContainer({ sessions: [khipuSession()] })

      await reconcilePayments(container)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it("skips the session when Khipu isn't configured or the payment id is missing", async () => {
      const fetchMock = jest.fn()
      global.fetch = fetchMock as unknown as typeof fetch

      await reconcilePayments(makeContainer({ sessions: [khipuSession()] }).container)
      process.env.KHIPU_API_KEY = "key"
      await reconcilePayments(makeContainer({ sessions: [session("pp_khipu_khipu", {})] }).container)

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe("guards", () => {
    it("ignores sessions of an unknown provider", async () => {
      const { container } = makeContainer({ sessions: [session("pp_other_other", { token: "t" })] })

      await reconcilePayments(container)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it("skips sessions with no linked cart", async () => {
      const { container } = makeContainer({
        sessions: [session("pp_webpay_webpay", { token: "t1" })],
        cartId: null,
      })

      await reconcilePayments(container)

      expect(mockWebpayStatus).not.toHaveBeenCalled()
      expect(mockRun).not.toHaveBeenCalled()
    })

    it("never re-completes a cart that already has an order", async () => {
      mockWebpayStatus.mockResolvedValue({ status: "AUTHORIZED", response_code: 0 })
      const { container } = makeContainer({
        sessions: [session("pp_webpay_webpay", { token: "t1" })],
        orderId: "order1",
      })

      await reconcilePayments(container)

      expect(mockWebpayStatus).not.toHaveBeenCalled()
      expect(mockRun).not.toHaveBeenCalled()
    })
  })

  describe("failures", () => {
    it("alerts via logs and Sentry when the payment is confirmed but the cart can't be completed", async () => {
      mockWebpayStatus.mockResolvedValue({ status: "AUTHORIZED", response_code: 0 })
      mockRun.mockResolvedValue({ errors: [{ error: { message: "sin stock" } }, { error: "otro" }] })
      const { container, logger } = makeContainer({ sessions: [session("pp_webpay_webpay", { token: "t1" })] })

      await reconcilePayments(container)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("PAGO CONFIRMADO SIN ORDEN"))
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("sin stock; otro"))
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining("PAGO CONFIRMADO SIN ORDEN"),
        expect.objectContaining({ level: "error" })
      )
    })

    it("keeps reconciling the remaining sessions when one throws", async () => {
      mockWebpayStatus
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce({ status: "AUTHORIZED", response_code: 0 })
      const { container, logger } = makeContainer({
        sessions: [session("pp_webpay_webpay", { token: "a" }, "ps1"), session("pp_webpay_webpay", { token: "b" }, "ps2")],
      })

      await reconcilePayments(container)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("ps1: timeout"))
      expect(mockRun).toHaveBeenCalledTimes(1)
    })

    it("reports non-Error failures too", async () => {
      mockWebpayStatus.mockRejectedValueOnce("boom")
      const { container, logger } = makeContainer({ sessions: [session("pp_webpay_webpay", { token: "a" })] })

      await reconcilePayments(container)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("boom"))
    })
  })
})
