import crypto from "node:crypto"
import KhipuPaymentProviderService from "../service"

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

const OPTIONS = {
  apiKey: "test-api-key",
  returnUrl: "https://kinetic.test/checkout/confirmar",
  cancelUrl: "https://kinetic.test/checkout/confirmar",
}

describe("KhipuPaymentProviderService lifecycle", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock
  let logger: { error: jest.Mock; info: jest.Mock }
  let service: any

  const build = (options: Record<string, unknown> = OPTIONS) =>
    new KhipuPaymentProviderService({ logger } as any, options as any)

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    logger = { error: jest.fn(), info: jest.fn() }
    service = build()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe("validateOptions", () => {
    it("rejects options without an apiKey", () => {
      expect(() => KhipuPaymentProviderService.validateOptions({})).toThrow(/apiKey/)
    })

    it("accepts options with an apiKey", () => {
      expect(() => KhipuPaymentProviderService.validateOptions({ apiKey: "k" })).not.toThrow()
    })
  })

  describe("request errors", () => {
    it("throws with the HTTP status, path and body when Khipu answers with an error", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "bad" }, false, 400))

      await expect(service.retrievePayment({ data: { payment_id: "p1" } })).rejects.toThrow(
        /Khipu API respondió 400 en \/payments\/p1/
      )
    })

    it("still throws a useful error when the error body can't be read", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error("stream closed")
        },
      } as unknown as Response)

      await expect(service.retrievePayment({ data: { payment_id: "p1" } })).rejects.toThrow(/respondió 500/)
    })

    it("sends the api key header on every request", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await service.retrievePayment({ data: { payment_id: "p1" } })

      expect(fetchMock.mock.calls[0][1].headers["x-api-key"]).toBe("test-api-key")
    })
  })

  describe("initiatePayment", () => {
    it("generates a session id when the cart session did not provide one", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ payment_id: "p1", payment_url: "https://khipu.test/p1" }))

      const result = await service.initiatePayment({ amount: 1000.4, data: {} })
      const sent = JSON.parse(fetchMock.mock.calls[0][1].body)

      expect(sent.transaction_id).toMatch(/^sess_/)
      expect(sent.amount).toBe(1000)
      expect(result.data).toMatchObject({ payment_id: "p1", url: "https://khipu.test/p1", amount: 1000 })
    })
  })

  describe("authorizePayment", () => {
    it("is pending_authorization while the transfer is pending or verifying", async () => {
      for (const status of ["pending", "verifying"]) {
        fetchMock.mockResolvedValue(jsonResponse({ status, amount: 1000 }))

        const result = await service.authorizePayment({ data: { payment_id: "p1", amount: 1000 } })

        expect(result.status).toBe("pending_authorization")
      }
    })

    it("errors for any other status", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "rejected", amount: 1000 }))

      const result = await service.authorizePayment({ data: { payment_id: "p1", amount: 1000 } })

      expect(result.status).toBe("error")
    })

    it("still reports the mismatch when the automatic refund also fails", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ status: "done", amount: 500 }))
        .mockResolvedValueOnce(jsonResponse({}, false, 500))

      const result = await service.authorizePayment({ data: { payment_id: "p1", amount: 1000 } })

      expect(result.status).toBe("error")
      expect((result.data as any).amount_mismatch).toBe(true)
      expect(logger.error).toHaveBeenCalledTimes(2)
    })
  })

  describe("cancelPayment / refundPayment", () => {
    it("requests a refund when cancelling a session that has a payment", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await service.cancelPayment({ data: { payment_id: "p1" } })

      expect(fetchMock.mock.calls[0][0]).toContain("/payments/p1/refunds")
      expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    })

    it("does not call Khipu when cancelling a session without a payment", async () => {
      await service.cancelPayment({ data: {} })

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("refunds the rounded amount and returns the refund with the data", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: "r1" }))

      const result = await service.refundPayment({ amount: 2500.6, data: { payment_id: "p1" } })

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 2501 })
      expect(result.data).toEqual({ payment_id: "p1", refund: { id: "r1" } })
    })
  })

  describe("getPaymentStatus", () => {
    it("is pending when there is no payment yet", async () => {
      expect((await service.getPaymentStatus({ data: {} })).status).toBe("pending")
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it.each([
      ["done", "captured"],
      ["pending", "pending"],
      ["verifying", "pending"],
      ["rejected", "error"],
    ])("maps Khipu status %s to %s", async (khipuStatus, expected) => {
      fetchMock.mockResolvedValue(jsonResponse({ status: khipuStatus }))

      const result = await service.getPaymentStatus({ data: { payment_id: "p1" } })

      expect(result.status).toBe(expected)
    })
  })

  describe("capture / update / delete", () => {
    it("passes data through unchanged", async () => {
      const input = { data: { payment_id: "p1" } }

      expect((await service.capturePayment(input)).data).toBe(input.data)
      expect((await service.updatePayment(input)).data).toBe(input.data)
      expect((await service.deletePayment(input)).data).toBe(input.data)
    })
  })

  describe("getWebhookActionAndData", () => {
    const hook = (svc: any, data: unknown, headers: Record<string, string> = {}, rawData = "{}") =>
      svc.getWebhookActionAndData({ data, rawData, headers })

    it("ignores notifications without a payment_id", async () => {
      expect(await hook(service, {})).toEqual({ action: "not_supported" })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("ignores payments Khipu can't tie back to a session", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "done", amount: 1000 }))

      expect(await hook(service, { payment_id: "p1" })).toEqual({ action: "not_supported" })
    })

    it("reports pending while the transfer is pending or verifying", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "verifying", amount: 1000, transaction_id: "s1" }))

      const result = await hook(service, { payment_id: "p1" })

      expect(result.action).toBe("pending")
      expect((result as any).data.session_id).toBe("s1")
    })

    it("ignores any other status", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "rejected", amount: 1000, transaction_id: "s1" }))

      expect(await hook(service, { payment_id: "p1" })).toEqual({ action: "not_supported" })
    })

    describe("with a webhook secret", () => {
      const secret = "whsec"
      const raw = '{"payment_id":"p1"}'
      const sign = (t: string, body: string) =>
        crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("base64")

      beforeEach(() => {
        service = build({ ...OPTIONS, webhookSecret: secret })
        fetchMock.mockResolvedValue(jsonResponse({ status: "done", amount: 1000, transaction_id: "s1" }))
      })

      it("accepts a valid signature over a string body", async () => {
        const header = `t=123,s=${sign("123", raw)}`

        const result = await hook(service, { payment_id: "p1" }, { "x-khipu-signature": header }, raw)

        expect(result.action).toBe("captured")
      })

      it("accepts a valid signature over a Buffer body", async () => {
        const header = `t=123,s=${sign("123", raw)}`

        const result = await service.getWebhookActionAndData({
          data: { payment_id: "p1" },
          rawData: Buffer.from(raw),
          headers: { "x-khipu-signature": header },
        })

        expect(result.action).toBe("captured")
      })

      it.each([
        ["a header without timestamp or signature", "foo=bar"],
        ["a header with malformed parts", "nonsense"],
        ["a tampered signature of a different length", "t=123,s=short"],
        ["a wrong signature of the right length", `t=123,s=${sign("123", "other")}`],
      ])("rejects %s", async (_label, header) => {
        const result = await hook(service, { payment_id: "p1" }, { "x-khipu-signature": header }, raw)

        expect(result).toEqual({ action: "not_supported" })
        expect(fetchMock).not.toHaveBeenCalled()
      })
    })
  })
})
