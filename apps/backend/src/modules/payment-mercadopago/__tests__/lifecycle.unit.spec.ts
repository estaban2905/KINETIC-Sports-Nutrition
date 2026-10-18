jest.mock("mercadopago", () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn(),
  PaymentRefund: jest.fn(),
  Preference: jest.fn(),
}))

import { Payment, PaymentRefund, Preference } from "mercadopago"
import MercadoPagoPaymentProviderService from "../service"

const OPTIONS = {
  accessToken: "TEST-access-token",
  successUrl: "https://kinetic.test/checkout/confirmar",
  failureUrl: "https://kinetic.test/checkout/error",
  notificationUrl: "https://kinetic.test/hooks/mp",
}

describe("MercadoPagoPaymentProviderService lifecycle", () => {
  let getMock: jest.Mock
  let cancelMock: jest.Mock
  let refundCreateMock: jest.Mock
  let preferenceCreateMock: jest.Mock
  let service: any
  const originalEnv = process.env.NODE_ENV

  const build = (options: Record<string, unknown> = OPTIONS) =>
    new MercadoPagoPaymentProviderService({ logger: { error: jest.fn(), info: jest.fn() } } as any, options as any)

  beforeEach(() => {
    getMock = jest.fn()
    cancelMock = jest.fn()
    refundCreateMock = jest.fn()
    preferenceCreateMock = jest.fn()
    ;(Payment as unknown as jest.Mock).mockImplementation(() => ({ get: getMock, cancel: cancelMock }))
    ;(PaymentRefund as unknown as jest.Mock).mockImplementation(() => ({ create: refundCreateMock }))
    ;(Preference as unknown as jest.Mock).mockImplementation(() => ({ create: preferenceCreateMock }))
    service = build()
  })

  afterEach(() => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
  })

  describe("validateOptions", () => {
    it("rejects options without an accessToken", () => {
      expect(() => MercadoPagoPaymentProviderService.validateOptions({})).toThrow(/accessToken/)
    })

    it("accepts options with an accessToken", () => {
      expect(() => MercadoPagoPaymentProviderService.validateOptions({ accessToken: "x" })).not.toThrow()
    })
  })

  describe("initiatePayment", () => {
    it("creates a preference keyed by the session and sets auto_return for https return URLs", async () => {
      preferenceCreateMock.mockResolvedValue({
        id: "pref1",
        init_point: "https://mp.test/init",
        sandbox_init_point: "https://mp.test/sandbox",
      })

      const result = await service.initiatePayment({ amount: 10000, data: { session_id: "s1" } })

      const body = preferenceCreateMock.mock.calls[0][0].body
      expect(body.external_reference).toBe("s1")
      expect(body.items[0]).toMatchObject({ id: "s1", quantity: 1, currency_id: "CLP", unit_price: 10000 })
      expect(body.auto_return).toBe("approved")
      expect(body.notification_url).toBe(OPTIONS.notificationUrl)
      expect(result.id).toBe("pref1")
      expect(result.data).toMatchObject({ preference_id: "pref1", session_id: "s1", amount: 10000 })
    })

    it("omits auto_return when the success URL is not https", async () => {
      service = build({ ...OPTIONS, successUrl: "http://localhost:3000/checkout/confirmar" })
      preferenceCreateMock.mockResolvedValue({ id: "pref1", init_point: "i" })

      await service.initiatePayment({ amount: 5000, data: { session_id: "s1" } })

      expect(preferenceCreateMock.mock.calls[0][0].body).not.toHaveProperty("auto_return")
    })

    it("prefers the sandbox URL outside production", async () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"
      preferenceCreateMock.mockResolvedValue({ id: "p", init_point: "prod-url", sandbox_init_point: "sandbox-url" })

      const result = await service.initiatePayment({ amount: 1, data: { session_id: "s1" } })

      expect(result.data.url).toBe("sandbox-url")
    })

    it("falls back to init_point outside production when there is no sandbox URL", async () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"
      preferenceCreateMock.mockResolvedValue({ id: "p", init_point: "prod-url" })

      const result = await service.initiatePayment({ amount: 1, data: { session_id: "s1" } })

      expect(result.data.url).toBe("prod-url")
    })

    it("uses the real init_point in production", async () => {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
      preferenceCreateMock.mockResolvedValue({ id: "p", init_point: "prod-url", sandbox_init_point: "sandbox-url" })

      const result = await service.initiatePayment({ amount: 1, data: { session_id: "s1" } })

      expect(result.data.url).toBe("prod-url")
    })

    it("generates a session id and falls back to it when MP returns no preference id", async () => {
      preferenceCreateMock.mockResolvedValue({ init_point: "i" })

      const result = await service.initiatePayment({ amount: 1, data: {} })

      expect(result.id).toMatch(/^sess_/)
      expect(result.data.session_id).toBe(result.id)
    })
  })

  describe("cancelPayment", () => {
    it("cancels the MP payment when there is one", async () => {
      const result = await service.cancelPayment({ data: { payment_id: "pay1" } })

      expect(cancelMock).toHaveBeenCalledWith({ id: "pay1" })
      expect(result.data).toEqual({ payment_id: "pay1" })
    })

    it("does nothing when the session never produced a payment", async () => {
      await service.cancelPayment({ data: {} })

      expect(cancelMock).not.toHaveBeenCalled()
    })
  })

  describe("refundPayment", () => {
    it("refunds the requested amount and returns the refund alongside the data", async () => {
      refundCreateMock.mockResolvedValue({ id: "ref1" })

      const result = await service.refundPayment({ amount: 2500, data: { payment_id: "pay1" } })

      expect(refundCreateMock).toHaveBeenCalledWith({ payment_id: "pay1", body: { amount: 2500 } })
      expect(result.data).toEqual({ payment_id: "pay1", refund: { id: "ref1" } })
    })
  })

  describe("getPaymentStatus", () => {
    it("is pending when there is no payment yet", async () => {
      const result = await service.getPaymentStatus({ data: {} })

      expect(result.status).toBe("pending")
      expect(getMock).not.toHaveBeenCalled()
    })

    it.each([
      ["approved", "captured"],
      ["pending", "pending"],
      ["in_process", "pending"],
      ["cancelled", "canceled"],
      ["rejected", "error"],
    ])("maps MP status %s to %s", async (mpStatus, expected) => {
      getMock.mockResolvedValue({ id: "pay1", status: mpStatus })

      const result = await service.getPaymentStatus({ data: { payment_id: "pay1" } })

      expect(result.status).toBe(expected)
    })
  })

  describe("retrievePayment / capture / update / delete", () => {
    it("retrieves the payment from MP", async () => {
      getMock.mockResolvedValue({ id: "pay1", status: "approved" })

      const result = await service.retrievePayment({ data: { payment_id: "pay1" } })

      expect(getMock).toHaveBeenCalledWith({ id: "pay1" })
      expect(result.data).toEqual({ id: "pay1", status: "approved" })
    })

    it("passes data through unchanged on capture, update and delete", async () => {
      const input = { data: { payment_id: "pay1" } }

      expect((await service.capturePayment(input)).data).toBe(input.data)
      expect((await service.updatePayment(input)).data).toBe(input.data)
      expect((await service.deletePayment(input)).data).toBe(input.data)
    })
  })

  describe("getWebhookActionAndData", () => {
    const hook = (data: unknown) => service.getWebhookActionAndData({ data, rawData: "", headers: {} })

    it.each([
      ["a non-payment notification", { type: "merchant_order", data: { id: "1" } }],
      ["a notification without a payment id", { type: "payment", data: {} }],
      ["an empty body", undefined],
    ])("ignores %s", async (_label, body) => {
      const result = await hook(body)

      expect(result).toEqual({ action: "not_supported" })
      expect(getMock).not.toHaveBeenCalled()
    })

    it("ignores payments that carry no external_reference", async () => {
      getMock.mockResolvedValue({ status: "approved", transaction_amount: 100 })

      expect(await hook({ type: "payment", data: { id: "pay1" } })).toEqual({ action: "not_supported" })
    })

    it.each([
      ["approved", "authorized"],
      ["rejected", "failed"],
      ["cancelled", "failed"],
      ["in_process", "pending"],
    ])("maps an MP %s payment to the %s action", async (mpStatus, action) => {
      getMock.mockResolvedValue({ status: mpStatus, external_reference: "s1", transaction_amount: 10000 })

      const result = await hook({ type: "payment", data: { id: "pay1" } })

      expect(result.action).toBe(action)
      expect((result as any).data.session_id).toBe("s1")
    })
  })
})
