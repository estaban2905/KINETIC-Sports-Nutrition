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

describe("KhipuPaymentProviderService.authorizePayment", () => {
  let fetchMock: jest.Mock
  let service: any

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
  })

  it("authorizes when Khipu reports 'done' and the amount matches the session", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await service.authorizePayment({
      data: { payment_id: "pay1", amount: 10000 },
    } as any)

    expect(result.status).toBe("authorized")
  })

  it("refunds and errors out when the reconciled amount doesn't match the session", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ payment_id: "pay1", status: "done", amount: 5000, transaction_id: "s1" })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const result = await service.authorizePayment({
      data: { payment_id: "pay1", amount: 10000 },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).amount_mismatch).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/payments/pay1/refunds"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it.each(["pending", "verifying"])(
    "returns pending_authorization while status is %s",
    async (status) => {
      fetchMock.mockResolvedValue(
        jsonResponse({ payment_id: "pay1", status, amount: 10000, transaction_id: "s1" })
      )

      const result = await service.authorizePayment({
        data: { payment_id: "pay1", amount: 10000 },
      } as any)

      expect(result.status).toBe("pending_authorization")
    }
  )

  it("errors out immediately when there's no payment_id, without calling the API", async () => {
    const result = await service.authorizePayment({ data: {} } as any)

    expect(result.status).toBe("error")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("KhipuPaymentProviderService.getWebhookActionAndData", () => {
  let fetchMock: jest.Mock
  let service: any
  const webhookSecret = "shh-secret"

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        webhookSecret,
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
  })

  function signedHeader(rawBody: string, secret = webhookSecret) {
    const t = "1711965600393"
    const s = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("base64")
    return `t=${t},s=${s}`
  }

  it("ignores the webhook when the signature is missing or invalid", async () => {
    const rawData = JSON.stringify({ payment_id: "pay1" })

    const result = await service.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData,
      headers: { "x-khipu-signature": "t=1,s=bm90LXZhbGlk" },
    } as any)

    expect(result.action).toBe("not_supported")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("re-fetches from Khipu and authorizes once the signature verifies and status is done", async () => {
    const rawData = JSON.stringify({ payment_id: "pay1" })
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await service.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData,
      headers: { "x-khipu-signature": signedHeader(rawData) },
    } as any)

    expect(result.action).toBe("authorized")
    expect((result.data as any).session_id).toBe("s1")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/payments/pay1"),
      expect.anything()
    )
  })

  it("skips signature verification (and still confirms via the API) when no webhookSecret is configured", async () => {
    const noSecretService = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await noSecretService.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData: JSON.stringify({ payment_id: "pay1" }),
      headers: {},
    } as any)

    expect(result.action).toBe("authorized")
  })
})
