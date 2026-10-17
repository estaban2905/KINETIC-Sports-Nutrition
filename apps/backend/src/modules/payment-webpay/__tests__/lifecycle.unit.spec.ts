jest.mock("transbank-sdk", () => ({
  Environment: { Production: "production" },
  IntegrationApiKeys: { WEBPAY: "597055555532" },
  IntegrationCommerceCodes: { WEBPAY_PLUS: "597055555532" },
  Options: jest.fn(),
  WebpayPlus: {
    Transaction: jest.fn(),
  },
}))

import { Environment, Options, WebpayPlus } from "transbank-sdk"
import WebpayPaymentProviderService from "../service"

const RETURN_URL = "https://kinetic.test/checkout/confirmar"

describe("WebpayPaymentProviderService lifecycle", () => {
  let tx: { create: jest.Mock; commit: jest.Mock; status: jest.Mock; refund: jest.Mock }
  let service: any

  beforeEach(() => {
    tx = { create: jest.fn(), commit: jest.fn(), status: jest.fn(), refund: jest.fn() }
    ;(WebpayPlus.Transaction as unknown as jest.Mock).mockReset()
    ;(WebpayPlus.Transaction as unknown as jest.Mock).mockImplementation(() => tx)
    ;(WebpayPlus.Transaction as any).buildForIntegration = jest.fn().mockReturnValue(tx)
    ;(Options as unknown as jest.Mock).mockClear()
    service = new WebpayPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      { returnUrl: RETURN_URL } as any
    )
  })

  describe("construction and validateOptions", () => {
    it("uses the public integration credentials when none are configured", () => {
      expect((WebpayPlus.Transaction as any).buildForIntegration).toHaveBeenCalledWith(
        "597055555532",
        "597055555532"
      )
    })

    it("uses the configured credentials against the production environment", () => {
      new WebpayPaymentProviderService(
        { logger: { error: jest.fn() } } as any,
        { environment: "production", commerceCode: "cc", apiKey: "key", returnUrl: RETURN_URL } as any
      )

      expect(Options).toHaveBeenCalledWith("cc", "key", Environment.Production)
      expect(WebpayPlus.Transaction).toHaveBeenCalled()
    })

    it("requires credentials in production", () => {
      expect(() => WebpayPaymentProviderService.validateOptions({ environment: "production" })).toThrow(
        /commerceCode y apiKey/
      )
    })

    it("accepts production with credentials and integration without them", () => {
      expect(() =>
        WebpayPaymentProviderService.validateOptions({ environment: "production", commerceCode: "c", apiKey: "k" })
      ).not.toThrow()
      expect(() => WebpayPaymentProviderService.validateOptions({})).not.toThrow()
    })
  })

  describe("initiatePayment", () => {
    it("creates the transaction with a sanitized buy order of at most 26 chars", async () => {
      tx.create.mockResolvedValue({ token: "tok1", url: "https://webpay.test/init" })
      const sessionId = "payses_01-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

      const result = await service.initiatePayment({ amount: 10000.4, data: { session_id: sessionId } })

      const [buyOrder, session, amount, returnUrl] = tx.create.mock.calls[0]
      expect(buyOrder).toMatch(/^[a-zA-Z0-9]{1,26}$/)
      expect(session).toBe(sessionId)
      expect(amount).toBe(10000)
      expect(returnUrl).toBe(RETURN_URL)
      expect(result.id).toBe("tok1")
      expect(result.data).toMatchObject({
        token: "tok1",
        buy_order: buyOrder,
        amount: 10000,
        url: "https://webpay.test/init?token_ws=tok1",
      })
    })

    it("generates a session id when the cart session did not provide one", async () => {
      tx.create.mockResolvedValue({ token: "tok1", url: "https://webpay.test/init" })

      const result = await service.initiatePayment({ amount: 1000, data: {} })

      expect(result.data.session_id).toMatch(/^sess_/)
    })
  })

  describe("authorizePayment edge cases", () => {
    it("errors out immediately when there's no token, without calling Transbank", async () => {
      const result = await service.authorizePayment({ data: {} })

      expect(result.status).toBe("error")
      expect(tx.commit).not.toHaveBeenCalled()
    })

    it("errors out when Transbank rejects the transaction", async () => {
      tx.commit.mockResolvedValue({ status: "FAILED", response_code: -1, amount: 1000, buy_order: "bo1" })

      const result = await service.authorizePayment({ data: { token: "t1", amount: 1000, buy_order: "bo1" } })

      expect(result.status).toBe("error")
      expect(tx.refund).not.toHaveBeenCalled()
    })
  })

  describe("cancelPayment / refundPayment", () => {
    it("refunds the full amount when cancelling a session that was charged", async () => {
      await service.cancelPayment({ data: { token: "t1", amount: 5000 } })

      expect(tx.refund).toHaveBeenCalledWith("t1", 5000)
    })

    it("does not call Transbank when there was nothing charged", async () => {
      await service.cancelPayment({ data: {} })
      await service.cancelPayment({ data: { token: "t1" } })

      expect(tx.refund).not.toHaveBeenCalled()
    })

    it("refunds the rounded amount and returns the refund alongside the data", async () => {
      tx.refund.mockResolvedValue({ type: "REVERSED" })

      const result = await service.refundPayment({ amount: 2500.6, data: { token: "t1" } })

      expect(tx.refund).toHaveBeenCalledWith("t1", 2501)
      expect(result.data).toEqual({ token: "t1", refund: { type: "REVERSED" } })
    })
  })

  describe("getPaymentStatus", () => {
    it("is pending when there is no token yet", async () => {
      expect((await service.getPaymentStatus({ data: {} })).status).toBe("pending")
      expect(tx.status).not.toHaveBeenCalled()
    })

    it.each([
      ["AUTHORIZED", "authorized"],
      ["FAILED", "error"],
      ["NULLIFIED", "error"],
      ["INITIALIZED", "pending"],
    ])("maps Transbank status %s to %s", async (tbkStatus, expected) => {
      tx.status.mockResolvedValue({ status: tbkStatus })

      const result = await service.getPaymentStatus({ data: { token: "t1" } })

      expect(result.status).toBe(expected)
    })
  })

  describe("retrieve / capture / update / delete / webhook", () => {
    it("retrieves the transaction status from Transbank", async () => {
      tx.status.mockResolvedValue({ status: "AUTHORIZED" })

      const result = await service.retrievePayment({ data: { token: "t1" } })

      expect(tx.status).toHaveBeenCalledWith("t1")
      expect(result.data).toEqual({ status: "AUTHORIZED" })
    })

    it("passes data through unchanged on capture, update and delete", async () => {
      const input = { data: { token: "t1" } }

      expect((await service.capturePayment(input)).data).toBe(input.data)
      expect((await service.updatePayment(input)).data).toBe(input.data)
      expect((await service.deletePayment(input)).data).toBe(input.data)
    })

    it("doesn't support webhooks, since Webpay confirms through the return URL", async () => {
      expect(await service.getWebhookActionAndData({ data: {}, rawData: "", headers: {} })).toEqual({
        action: "not_supported",
      })
    })
  })
})
